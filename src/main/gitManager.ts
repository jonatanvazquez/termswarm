import { execFile } from 'child_process'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../shared/gitTypes'
import { sshManager } from './sshManager'

const EXEC_OPTIONS = {
  timeout: 10_000,
  maxBuffer: 1024 * 1024,
  env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
}

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { ...EXEC_OPTIONS, cwd }, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

async function gitRemote(connectionId: string, cwd: string, args: string[]): Promise<string> {
  const escapedArgs = args.map((a) => shellEscape(a)).join(' ')
  const cmd = `cd ${shellEscape(cwd)} && git ${escapedArgs}`
  const result = await sshManager.exec(connectionId, cmd)
  if (result.code !== 0) throw new Error(result.stderr || `git exited with code ${result.code}`)
  return result.stdout
}

function gitExec(cwd: string, args: string[], connectionId?: string): Promise<string> {
  if (connectionId) return gitRemote(connectionId, cwd, args)
  return git(cwd, args)
}

function parseStatusLine(line: string): { code: string; path: string; origPath?: string } | null {
  if (line.length < 4) return null
  const x = line[0] // index (staged) status
  const y = line[1] // worktree (unstaged) status
  let rest = line.slice(3)

  let origPath: string | undefined
  // Handle renames: "R  old -> new"
  const arrowIdx = rest.indexOf(' -> ')
  if (arrowIdx !== -1) {
    origPath = rest.slice(0, arrowIdx)
    rest = rest.slice(arrowIdx + 4)
  }

  return { code: `${x}${y}`, path: rest, origPath }
}

class GitManager {
  async isGitRepo(cwd: string, connectionId?: string): Promise<boolean> {
    try {
      const out = await gitExec(cwd, ['rev-parse', '--is-inside-work-tree'], connectionId)
      return out.trim() === 'true'
    } catch {
      return false
    }
  }

  async getStatus(cwd: string, connectionId?: string): Promise<GitStatusResult> {
    const result: GitStatusResult = {
      isGitRepo: false,
      branch: '',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: []
    }

    try {
      const isRepo = await this.isGitRepo(cwd, connectionId)
      if (!isRepo) return result
      result.isGitRepo = true

      // Get branch name
      try {
        const branchOut = await gitExec(cwd, ['branch', '--show-current'], connectionId)
        result.branch = branchOut.trim()
        if (!result.branch) {
          // Detached HEAD
          const headOut = await gitExec(cwd, ['rev-parse', '--short', 'HEAD'], connectionId)
          result.branch = `HEAD detached at ${headOut.trim()}`
        }
      } catch {
        result.branch = 'unknown'
      }

      // Get ahead/behind
      try {
        const countOut = await gitExec(
          cwd,
          ['rev-list', '--left-right', '--count', '@{upstream}...HEAD'],
          connectionId
        )
        const parts = countOut.trim().split(/\s+/)
        if (parts.length === 2) {
          result.behind = parseInt(parts[0], 10) || 0
          result.ahead = parseInt(parts[1], 10) || 0
        }
      } catch {
        // No upstream configured
      }

      // Get file statuses
      const statusOut = await gitExec(cwd, ['status', '--porcelain=v1'], connectionId)
      for (const line of statusOut.split('\n')) {
        if (!line) continue
        const parsed = parseStatusLine(line)
        if (!parsed) continue

        const x = parsed.code[0]
        const y = parsed.code[1]

        // Untracked
        if (x === '?' && y === '?') {
          result.untracked.push({
            path: parsed.path,
            status: '?',
            staged: false,
            origPath: parsed.origPath
          })
          continue
        }

        // Staged changes (index has a meaningful status)
        if (x !== ' ' && x !== '?') {
          result.staged.push({
            path: parsed.path,
            status: x,
            staged: true,
            origPath: parsed.origPath
          })
        }

        // Unstaged changes (worktree has a meaningful status)
        if (y !== ' ' && y !== '?') {
          result.unstaged.push({
            path: parsed.path,
            status: y,
            staged: false,
            origPath: parsed.origPath
          })
        }
      }

      // Collect line-level stats (insertions/deletions) per file
      try {
        const [unstagedNumstat, stagedNumstat] = await Promise.all([
          gitExec(cwd, ['diff', '--numstat'], connectionId).catch(() => ''),
          gitExec(cwd, ['diff', '--numstat', '--cached'], connectionId).catch(() => '')
        ])

        const parseNumstat = (raw: string): Map<string, { ins: number; del: number }> => {
          const map = new Map<string, { ins: number; del: number }>()
          for (const line of raw.split('\n')) {
            if (!line) continue
            const parts = line.split('\t')
            if (parts.length < 3) continue
            // Binary files emit "-\t-\tpath" — skip those
            if (parts[0] === '-' || parts[1] === '-') continue
            const ins = parseInt(parts[0], 10) || 0
            const del = parseInt(parts[1], 10) || 0
            const path = parts.slice(2).join('\t')
            map.set(path, { ins, del })
          }
          return map
        }

        const unstagedStats = parseNumstat(unstagedNumstat)
        const stagedStats = parseNumstat(stagedNumstat)

        for (const file of result.unstaged) {
          const stats = unstagedStats.get(file.path)
          if (stats) {
            file.insertions = stats.ins
            file.deletions = stats.del
          }
        }
        for (const file of result.staged) {
          const stats = stagedStats.get(file.path)
          if (stats) {
            file.insertions = stats.ins
            file.deletions = stats.del
          }
        }
      } catch {
        // Non-critical — don't break status if numstat fails
      }

      return result
    } catch {
      return result
    }
  }

  async getLog(cwd: string, count = 20, connectionId?: string): Promise<GitLogResult> {
    try {
      const out = await gitExec(
        cwd,
        ['log', `--pretty=format:%h%x00%s%x00%an%x00%ar`, `-n`, String(count)],
        connectionId
      )
      const commits = out
        .trim()
        .split('\n')
        .filter((l) => l)
        .map((line) => {
          const [hash, message, author, relativeDate] = line.split('\x00')
          return { hash, message, author, relativeDate }
        })
      return { commits }
    } catch {
      return { commits: [] }
    }
  }

  async stageFiles(cwd: string, paths: string[], connectionId?: string): Promise<void> {
    if (paths.length === 0) return
    await gitExec(cwd, ['add', '--', ...paths], connectionId)
  }

  async unstageFiles(cwd: string, paths: string[], connectionId?: string): Promise<void> {
    if (paths.length === 0) return
    await gitExec(cwd, ['restore', '--staged', '--', ...paths], connectionId)
  }

  async stageAll(cwd: string, connectionId?: string): Promise<void> {
    await gitExec(cwd, ['add', '-A'], connectionId)
  }

  async unstageAll(cwd: string, connectionId?: string): Promise<void> {
    await gitExec(cwd, ['reset', 'HEAD'], connectionId)
  }

  async commit(cwd: string, message: string, connectionId?: string): Promise<void> {
    await gitExec(cwd, ['commit', '-m', message], connectionId)
  }

  async pull(cwd: string, connectionId?: string): Promise<GitPullResult> {
    try {
      const out = await gitExec(cwd, ['pull'], connectionId)
      return { success: true, message: out.trim() || 'Already up to date.' }
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Pull failed' }
    }
  }
}

export const gitManager = new GitManager()
