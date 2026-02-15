import * as pty from 'node-pty'
import { homedir } from 'os'
import { existsSync, readdirSync } from 'fs'
import { exec } from 'child_process'
import { join } from 'path'
import type { BrowserWindow } from 'electron'
import type { ConversationStatus } from '../shared/types'

type SpawnMode = 'claude' | 'terminal'

interface PtySession {
  process: pty.IPty
  lastDataTime: number
  lastOutput: string
  promptDetected: boolean
  promptDetectedAt: number | null
  belReceived: boolean
  status: ConversationStatus
  awaitingResponse: boolean
  mode: SpawnMode
}

// Strip ANSI escape codes and terminal control sequences before matching.
// Handles CSI sequences, OSC sequences (title bar), charset designations, and BEL.
const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[()][0-9A-Za-z]|\x1b[>=]|\x07/g

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, '')
}

function detectPrompt(raw: string): boolean {
  const text = stripAnsi(raw)

  // Claude Code input prompt: ❯ (U+276F) is used exclusively as the prompt character.
  // We use includes() instead of line-start regex because Claude Code's status bar
  // is rendered via cursor positioning sequences — once stripped, the line structure
  // is lost and ❯ is no longer at the "start of a line" in the flat text.
  // Also, autocomplete hint text (e.g. 'Try "fix the bug"') follows ❯ on the same
  // line, so ^❯\s*$ won't match either.
  if (text.includes('❯')) return true

  // Fallback: > prompt (older Claude Code versions), only when alone on a line
  if (/^>\s*$/m.test(text)) return true

  // Yes/No permission prompts
  if (/\(y\/n\)/i.test(text)) return true
  if (/\(Y\/n\)/i.test(text)) return true
  if (/\(yes\/no\)/i.test(text)) return true

  // "Do you want to proceed" style
  if (/do you want to/i.test(text)) return true

  // Tool approval prompts
  if (/allow|deny|approve|reject/i.test(text) && /\?/.test(text)) return true

  return false
}

function resolveClaudeBinary(): string {
  // Check well-known locations first (Electron doesn't inherit full shell PATH)
  const wellKnown = join(homedir(), '.local', 'bin', 'claude')
  if (existsSync(wellKnown)) return wellKnown

  // Check PATH
  const pathDirs = (process.env.PATH || '').split(':')
  for (const dir of pathDirs) {
    const candidate = join(dir, 'claude')
    if (existsSync(candidate)) return candidate
  }

  // Check ~/.local/share/claude/versions/ — entries are the binaries themselves
  const versionsDir = join(homedir(), '.local', 'share', 'claude', 'versions')
  if (existsSync(versionsDir)) {
    const versions = readdirSync(versionsDir).sort().reverse()
    for (const ver of versions) {
      const candidate = join(versionsDir, ver)
      if (existsSync(candidate)) return candidate
    }
  }

  return 'claude'
}

function resolveShell(): string {
  return process.env.SHELL || '/bin/zsh'
}

function expandTilde(p: string): string {
  if (p.startsWith('~')) return p.replace(/^~/, homedir())
  return p
}

class PtyManager {
  private sessions = new Map<string, PtySession>()
  private mainWindow: BrowserWindow | null = null
  private statusInterval: ReturnType<typeof setInterval> | null = null
  private memoryInterval: ReturnType<typeof setInterval> | null = null

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
    this.startStatusChecker()
    this.startMemoryChecker()
  }

  spawn(
    sessionId: string,
    cwd: string,
    args: string[] = [],
    mode: SpawnMode = 'claude'
  ): string {
    if (this.sessions.has(sessionId)) {
      this.kill(sessionId)
    }

    const resolvedCwd = expandTilde(cwd)

    let binary: string
    let spawnArgs: string[]

    if (mode === 'terminal') {
      binary = resolveShell()
      spawnArgs = [...args]
    } else {
      binary = resolveClaudeBinary()
      spawnArgs = ['--dangerously-skip-permissions', ...args]
    }

    const ptyProcess = pty.spawn(binary, spawnArgs, {
      name: 'xterm-256color',
      cwd: resolvedCwd,
      cols: 80,
      rows: 24,
      env: process.env as Record<string, string>
    })

    const session: PtySession = {
      process: ptyProcess,
      lastDataTime: Date.now(),
      lastOutput: '',
      promptDetected: false,
      promptDetectedAt: null,
      belReceived: false,
      status: 'running',
      awaitingResponse: false,
      mode
    }

    this.sessions.set(sessionId, session)

    // Ensure status & memory checkers are running — they may have been
    // cleared by killAll() (e.g. renderer orphan cleanup on mount).
    this.startStatusChecker()
    this.startMemoryChecker()

    ptyProcess.onData((data) => {
      session.lastDataTime = Date.now()

      if (mode === 'claude') {
        // Keep last ~2KB of output for prompt detection
        session.lastOutput = (session.lastOutput + data).slice(-2048)
        const wasDetected = session.promptDetected
        session.promptDetected = detectPrompt(session.lastOutput)

        // Detect standalone BEL (not inside OSC sequences) — Claude Code
        // sends BEL when it finishes a task (this is what makes the terminal
        // "bounce" on macOS). Treat it as a strong prompt signal.
        const withoutOsc = data.replace(/\x1b\][^\x07]*\x07/g, '')
        if (withoutOsc.includes('\x07')) {
          session.promptDetected = true
          session.belReceived = true
          if (session.promptDetectedAt === null) {
            session.promptDetectedAt = Date.now()
          }
        }

        // Track when prompt was first detected continuously
        if (session.promptDetected && !wasDetected && session.promptDetectedAt === null) {
          session.promptDetectedAt = Date.now()
        } else if (!session.promptDetected) {
          session.promptDetectedAt = null
        }

        // Recovery: if we were 'waiting' but prompt disappeared, Claude resumed work.
        // Gate behind awaitingResponse so typing on the prompt doesn't flicker to 'running'.
        if (session.status === 'waiting' && !session.promptDetected && session.awaitingResponse) {
          session.status = 'running'
          session.belReceived = false
          this.sendStatus(sessionId, 'running')
        }
      }

      // Only switch to 'running' when awaiting a response
      if (session.awaitingResponse && session.status !== 'running') {
        session.status = 'running'
        this.sendStatus(sessionId, 'running')
      }

      this.send('pty:data', sessionId, data)
    })

    ptyProcess.onExit(({ exitCode }) => {
      const status: ConversationStatus = exitCode === 0 ? 'idle' : 'error'
      session.status = status
      session.awaitingResponse = false
      this.send('pty:exit', sessionId, exitCode)
      this.sessions.delete(sessionId)
    })

    return sessionId
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      if (session.mode === 'claude') {
        // Only treat Enter as a submission for Claude mode
        if (data.includes('\r') || data.includes('\n')) {
          session.lastOutput = ''
          session.promptDetected = false
          session.promptDetectedAt = null
          session.belReceived = false
          session.awaitingResponse = true
        }
      }
      // For terminal mode, no special handling needed
      session.process.write(data)
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.process.resize(cols, rows)
      } catch {
        // Process may have already exited
      }
    }
  }

  kill(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        session.process.kill()
      } catch {
        // Already dead
      }
      this.sessions.delete(sessionId)
    }
  }

  pause(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        process.kill(session.process.pid, 'SIGTSTP')
        session.status = 'paused'
        this.sendStatus(sessionId, 'paused')
      } catch {
        // Process may have already exited
      }
    }
  }

  resume(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      try {
        process.kill(session.process.pid, 'SIGCONT')
        session.status = 'running'
        session.lastDataTime = Date.now()
        this.sendStatus(sessionId, 'running')
      } catch {
        // Process may have already exited
      }
    }
  }

  killAll(): void {
    for (const [id] of this.sessions) {
      this.kill(id)
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval)
      this.statusInterval = null
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval)
      this.memoryInterval = null
    }
  }

  private startStatusChecker(): void {
    if (this.statusInterval) return
    this.statusInterval = setInterval(() => {
      const now = Date.now()
      for (const [sessionId, session] of this.sessions) {
        if (session.status !== 'running') continue

        const elapsed = now - session.lastDataTime

        if (session.mode === 'terminal') {
          // Regular terminals: switch to idle after brief silence
          if (elapsed > 500) {
            session.status = 'idle'
            session.awaitingResponse = false
            this.sendStatus(sessionId, 'idle')
          }
        } else {
          // Claude mode: detect when Claude is waiting for input
          const sincePrompt = session.promptDetectedAt !== null ? now - session.promptDetectedAt : null
          if (session.belReceived && session.promptDetected) {
            // BEL + prompt: Claude rang the bell — task finished
            session.status = 'waiting'
            session.awaitingResponse = false
            this.sendStatus(sessionId, 'waiting')
          } else if (session.awaitingResponse) {
            // After submission: only trust prompt + generous silence (5s).
            // During active processing Claude produces output regularly,
            // so 5s of silence with prompt visible = task finished.
            if (session.promptDetected && elapsed > 5000) {
              session.status = 'waiting'
              session.awaitingResponse = false
              this.sendStatus(sessionId, 'waiting')
            }
          } else {
            // Initial startup (before first Enter): use normal heuristics
            if (session.promptDetected && elapsed > 500) {
              session.status = 'waiting'
              this.sendStatus(sessionId, 'waiting')
            } else if (sincePrompt !== null && sincePrompt > 3000) {
              session.status = 'waiting'
              this.sendStatus(sessionId, 'waiting')
            } else if (!session.promptDetected && elapsed > 10000) {
              session.status = 'waiting'
              this.sendStatus(sessionId, 'waiting')
            }
          }
        }
      }
    }, 500)
  }

  private getMemoryStats(): Promise<Record<string, number>> {
    return new Promise((resolve) => {
      const stats: Record<string, number> = {}
      if (this.sessions.size === 0) {
        resolve(stats)
        return
      }

      exec('ps axo pid=,ppid=,rss=', { timeout: 5000 }, (err, stdout) => {
        if (err || !stdout) {
          resolve(stats)
          return
        }

        const childrenMap = new Map<number, number[]>()
        const rssMap = new Map<number, number>()

        for (const line of stdout.trim().split('\n')) {
          const parts = line.trim().split(/\s+/)
          if (parts.length < 3) continue
          const pid = parseInt(parts[0], 10)
          const ppid = parseInt(parts[1], 10)
          const rss = parseInt(parts[2], 10)
          if (isNaN(pid) || isNaN(ppid) || isNaN(rss)) continue

          rssMap.set(pid, rss)
          if (!childrenMap.has(ppid)) childrenMap.set(ppid, [])
          childrenMap.get(ppid)!.push(pid)
        }

        // DFS to sum RSS of entire process tree
        for (const [sessionId, session] of this.sessions) {
          const rootPid = session.process.pid
          let totalKB = 0
          const stack = [rootPid]
          while (stack.length > 0) {
            const pid = stack.pop()!
            totalKB += rssMap.get(pid) || 0
            const children = childrenMap.get(pid)
            if (children) stack.push(...children)
          }
          stats[sessionId] = totalKB * 1024 // KB to bytes
        }

        resolve(stats)
      })
    })
  }

  private startMemoryChecker(): void {
    if (this.memoryInterval) return
    this.memoryInterval = setInterval(() => {
      this.getMemoryStats().then((stats) => {
        if (Object.keys(stats).length > 0) {
          this.send('pty:memory', stats)
        }
      })
    }, 5000)
  }

  private send(channel: string, ...args: unknown[]): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(channel, ...args)
      }
    } catch {
      // Window may have been destroyed during shutdown
    }
  }

  private sendStatus(sessionId: string, status: ConversationStatus): void {
    this.send('pty:status', sessionId, status)
  }
}

export const ptyManager = new PtyManager()
