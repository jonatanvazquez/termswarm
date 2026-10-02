import { homedir } from 'os'
import { join } from 'path'
import { execFile } from 'child_process'
import { access, appendFile, open, readdir, readFile } from 'fs/promises'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Whether a command line is Claude Code itself, judged by its executable only. A wrapper
 * whose arguments merely mention claude (a shell, tmux, script, ...) must never match.
 */
function isClaudeCommand(command: string): boolean {
  const executable = command.split(/\s+/)[0]
  return /(^|\/)claude$/.test(executable) || executable.includes('/claude/versions/')
}

export function isClaudeSessionId(id: unknown): id is string {
  return typeof id === 'string' && UUID_RE.test(id)
}

function claudeConfigDir(): string {
  return process.env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), '.claude')
}

/** Claude Code stores sessions in <config>/projects/<cwd with non-alphanumerics as dashes>/ */
function claudeProjectDir(projectPath: string): string {
  const resolved = projectPath.startsWith('~') ? projectPath.replace(/^~/, homedir()) : projectPath
  return join(claudeConfigDir(), 'projects', resolved.replace(/[^a-zA-Z0-9]/g, '-'))
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Locate the directory holding a session's .jsonl transcript. Tries the directory derived
 * from the project path first, then every project directory (covers symlinked or very long
 * paths, where Claude Code's directory name differs from the simple derivation).
 */
export async function findClaudeSessionDir(
  projectPath: string,
  sessionId: string
): Promise<string | null> {
  if (!isClaudeSessionId(sessionId)) return null

  const expected = claudeProjectDir(projectPath)
  if (await exists(join(expected, `${sessionId}.jsonl`))) return expected

  const projectsDir = join(claudeConfigDir(), 'projects')
  let dirs: string[]
  try {
    dirs = await readdir(projectsDir)
  } catch {
    return null
  }
  for (const dir of dirs) {
    const candidate = join(projectsDir, dir)
    if (candidate !== expected && (await exists(join(candidate, `${sessionId}.jsonl`)))) {
      return candidate
    }
  }
  return null
}

function listProcesses(): Promise<Map<number, string>> {
  return new Promise((resolve) => {
    execFile(
      'ps',
      ['axo', 'pid=,command='],
      { timeout: 5000, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout) => {
        const processes = new Map<number, string>()
        if (err || !stdout) {
          resolve(processes)
          return
        }
        for (const line of stdout.split('\n')) {
          const match = line.match(/^\s*(\d+)\s+(.*)$/)
          if (match) processes.set(parseInt(match[1], 10), match[2])
        }
        resolve(processes)
      }
    )
  })
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Terminate every Claude Code process that currently holds the given session (another
 * terminal, an orphan from a previous run, ...) so it can be resumed here without two
 * processes writing to the same transcript. Resolves once they are gone.
 * Returns how many processes were terminated, not counting `ownPids` (processes the caller
 * already asked to exit and only wants to wait for).
 */
export async function releaseClaudeSession(
  sessionId: string,
  ownPids: number[] = []
): Promise<number> {
  if (!isClaudeSessionId(sessionId) || process.platform === 'win32') return 0

  const processes = await listProcesses()
  const holders = new Set<number>()
  // Only ever target processes that are recognizably Claude Code: registry entries can be
  // stale with their PID reused, and other processes can mention a session ID.
  const isClaude = (pid: number): boolean =>
    pid !== process.pid && isClaudeCommand(processes.get(pid) ?? '')

  // Claude Code registers each live process in <config>/sessions/<pid>.json
  const registryDir = join(claudeConfigDir(), 'sessions')
  try {
    for (const file of await readdir(registryDir)) {
      if (!file.endsWith('.json')) continue
      try {
        const entry = JSON.parse(await readFile(join(registryDir, file), 'utf8'))
        if (
          entry?.sessionId === sessionId &&
          typeof entry.pid === 'number' &&
          isClaude(entry.pid)
        ) {
          holders.add(entry.pid)
        }
      } catch {
        // Unreadable or half-written entry — skip
      }
    }
  } catch {
    // No registry (older Claude Code) — fall back to the command-line scan below
  }

  // Processes launched with the session ID on their command line (--resume / --session-id)
  for (const [pid, command] of processes) {
    if (command.includes(sessionId) && isClaude(pid)) holders.add(pid)
  }

  const targets = [...holders]
  if (targets.length === 0) return 0

  for (const pid of targets) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // Already gone
    }
  }

  // Give them a moment to flush the transcript and exit, then force
  const deadline = Date.now() + 3000
  while (Date.now() < deadline && targets.some(isAlive)) {
    await new Promise((r) => setTimeout(r, 100))
  }
  for (const pid of targets) {
    if (!isAlive(pid)) continue
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Already gone
    }
  }

  console.log('[Main] released Claude session', sessionId, 'from', targets.length, 'process(es)')
  return targets.filter((pid) => !ownPids.includes(pid)).length
}

/** Strip control characters and collapse whitespace so a name is safe as a session title */
export function sanitizeSessionName(name: string): string {
  // eslint-disable-next-line no-control-regex
  return name
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Rename a Claude Code session that is NOT running by appending the same entries `/rename`
 * writes to its transcript. A live process keeps its title in memory and re-appends it, so
 * running sessions must be renamed through the process itself instead.
 * Returns false when the session has no transcript yet.
 */
export async function setClaudeSessionTitle(
  projectPath: string,
  sessionId: string,
  name: string
): Promise<boolean> {
  const title = sanitizeSessionName(name)
  if (!title) return false

  const dir = await findClaudeSessionDir(projectPath, sessionId)
  if (!dir) return false

  const entries = [
    { type: 'custom-title', customTitle: title, sessionId },
    { type: 'agent-name', agentName: title, sessionId }
  ]
  const file = join(dir, `${sessionId}.jsonl`)
  try {
    // Never glue our entries onto an unterminated last line
    const handle = await open(file, 'r')
    let separator = ''
    try {
      const { size } = await handle.stat()
      if (size > 0) {
        const last = Buffer.alloc(1)
        await handle.read(last, 0, 1, size - 1)
        if (last[0] !== 0x0a) separator = '\n'
      }
    } finally {
      await handle.close()
    }
    await appendFile(file, separator + entries.map((e) => JSON.stringify(e)).join('\n') + '\n')
    return true
  } catch (err) {
    console.warn('[Main] setClaudeSessionTitle failed:', err)
    return false
  }
}
