import { Client, type ClientChannel, type ConnectConfig } from 'ssh2'
import { readFileSync } from 'fs'
import { homedir } from 'os'
import type { BrowserWindow } from 'electron'
import type { SSHConnection, SSHConnectionStatus, SFTPEntry } from '../shared/sshTypes'

function expandTilde(p: string): string {
  if (p.startsWith('~')) return p.replace(/^~/, homedir())
  return p
}

interface ManagedConnection {
  client: Client
  config: SSHConnection
  status: SSHConnectionStatus
  error?: string
  reconnectAttempts: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
  activeSessions: Set<string>
  tmuxAvailable: boolean | null // null = not checked yet
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_BASE_MS = 1000
const RECONNECT_MAX_MS = 30000
const KEEPALIVE_INTERVAL_MS = 10000
const KEEPALIVE_COUNT_MAX = 3

class SSHManager {
  private connections = new Map<string, ManagedConnection>()
  private mainWindow: BrowserWindow | null = null
  private reconnectCallback: ((connectionId: string) => void) | null = null
  private tmuxCheckPromises = new Map<string, Promise<boolean>>()
  /** Per-connection queue to serialize shell/channel opening and avoid SSH channel saturation */
  private shellQueues = new Map<string, Promise<unknown>>()

  setMainWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  /** Register callback to be called when an SSH connection is re-established */
  onReconnect(callback: (connectionId: string) => void): void {
    this.reconnectCallback = callback
  }

  async connect(config: SSHConnection): Promise<void> {
    // Disconnect existing connection with same ID
    if (this.connections.has(config.id)) {
      this.disconnect(config.id)
    }

    const client = new Client()

    const managed: ManagedConnection = {
      client,
      config,
      status: 'connecting',
      reconnectAttempts: 0,
      reconnectTimer: null,
      activeSessions: new Set(),
      tmuxAvailable: null
    }

    this.connections.set(config.id, managed)
    this.emitStatus(config.id, 'connecting')

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        managed.status = 'connected'
        managed.reconnectAttempts = 0
        managed.error = undefined
        this.emitStatus(config.id, 'connected')

        // Check tmux availability + configure git credentials in parallel
        this.checkTmux(config.id).catch(() => {})
        if (config.gitToken) {
          this.setupGitCredentials(config.id, config.gitToken).catch(() => {})
        }

        resolve()
      })

      client.on('error', (err) => {
        managed.error = err.message
        if (managed.status === 'connecting') {
          managed.status = 'error'
          this.emitStatus(config.id, 'error', err.message)
          reject(err)
        } else {
          managed.status = 'error'
          this.emitStatus(config.id, 'error', err.message)
          this.scheduleReconnect(config.id)
        }
      })

      client.on('close', () => {
        if (managed.status === 'connected') {
          managed.status = 'disconnected'
          this.emitStatus(config.id, 'disconnected')
          this.scheduleReconnect(config.id)
        }
      })

      client.on('end', () => {
        if (managed.status === 'connected') {
          managed.status = 'disconnected'
          this.emitStatus(config.id, 'disconnected')
          this.scheduleReconnect(config.id)
        }
      })

      const connectConfig = this.buildConnectConfig(config)
      client.connect(connectConfig)
    })
  }

  disconnect(connectionId: string): void {
    const managed = this.connections.get(connectionId)
    if (!managed) return

    if (managed.reconnectTimer) {
      clearTimeout(managed.reconnectTimer)
      managed.reconnectTimer = null
    }

    managed.status = 'disconnected'
    managed.activeSessions.clear()

    try {
      managed.client.end()
    } catch {
      // Already closed
    }

    this.connections.delete(connectionId)
    this.emitStatus(connectionId, 'disconnected')
  }

  async testConnection(config: SSHConnection): Promise<{ success: boolean; error?: string }> {
    let connectConfig: ConnectConfig
    try {
      connectConfig = this.buildConnectConfig(config)
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }

    const client = new Client()
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        client.end()
        resolve({ success: false, error: 'Connection timed out (10s)' })
      }, 10000)

      client.on('ready', () => {
        clearTimeout(timeout)
        client.end()
        resolve({ success: true })
      })

      client.on('error', (err) => {
        clearTimeout(timeout)
        resolve({ success: false, error: err.message })
      })

      client.connect(connectConfig)
    })
  }

  getConnection(connectionId: string): ManagedConnection | undefined {
    return this.connections.get(connectionId)
  }

  getStatus(connectionId: string): SSHConnectionStatus {
    const managed = this.connections.get(connectionId)
    return managed?.status ?? 'disconnected'
  }

  /** Generate a stable tmux session name for a given TermSwarm session */
  tmuxSessionName(sessionId: string): string {
    // Sanitize: tmux names can't contain dots or colons
    return `ts-${sessionId.replace(/[.:]/g, '-')}`
  }

  /** Check whether tmux is installed on the remote host (deduplicated per connection) */
  async checkTmux(connectionId: string): Promise<boolean> {
    const managed = this.connections.get(connectionId)
    if (!managed) return false
    if (managed.tmuxAvailable !== null) return managed.tmuxAvailable

    // Deduplicate: if a check is already in-flight, reuse its promise
    const existing = this.tmuxCheckPromises.get(connectionId)
    if (existing) return existing

    const promise = this.exec(connectionId, 'command -v tmux')
      .then(({ code }) => {
        managed.tmuxAvailable = code === 0
        return managed.tmuxAvailable
      })
      .catch(() => {
        managed.tmuxAvailable = false
        return false
      })
      .finally(() => {
        this.tmuxCheckPromises.delete(connectionId)
      })

    this.tmuxCheckPromises.set(connectionId, promise)
    return promise
  }

  isTmuxAvailable(connectionId: string): boolean {
    return this.connections.get(connectionId)?.tmuxAvailable === true
  }

  /** Serialize shell/channel opening per connection to avoid SSH channel saturation */
  private enqueueShell<T>(connectionId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.shellQueues.get(connectionId) ?? Promise.resolve()
    const next = prev
      .catch(() => {}) // Don't let previous failures block the queue
      .then(() => new Promise<void>((r) => setTimeout(r, 100))) // Small gap between opens
      .then(() => fn())
    this.shellQueues.set(connectionId, next)
    next.finally(() => {
      // Clean up if this is the last in the queue
      if (this.shellQueues.get(connectionId) === next) {
        this.shellQueues.delete(connectionId)
      }
    })
    return next
  }

  async openShell(
    connectionId: string,
    cwd: string,
    cols: number,
    rows: number,
    sessionId: string,
    command?: string
  ): Promise<ClientChannel> {
    return this.enqueueShell(connectionId, () =>
      this.openShellDirect(connectionId, cwd, cols, rows, sessionId, command)
    )
  }

  private async openShellDirect(
    connectionId: string,
    cwd: string,
    cols: number,
    rows: number,
    sessionId: string,
    command?: string
  ): Promise<ClientChannel> {
    const managed = this.connections.get(connectionId)
    if (!managed || managed.status !== 'connected') {
      throw new Error(`SSH connection ${connectionId} is not connected`)
    }

    managed.activeSessions.add(sessionId)

    // Wait for tmux check if it hasn't completed yet
    if (managed.tmuxAvailable === null) {
      await this.checkTmux(connectionId)
    }

    return new Promise((resolve, reject) => {
      const shellOpts = {
        term: 'xterm-256color',
        cols,
        rows,
        env: { LANG: 'en_US.UTF-8' }
      }

      managed.client.shell(shellOpts, (err, stream) => {
        if (err) {
          managed.activeSessions.delete(sessionId)
          reject(err)
          return
        }

        stream.on('close', () => {
          managed.activeSessions.delete(sessionId)
        })

        const fixPath =
          'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.local/bin:$PATH'

        if (managed.tmuxAvailable) {
          const tmuxName = this.tmuxSessionName(sessionId)
          const setResize = `tmux set-option -t ${shellEscape(tmuxName)} -g aggressive-resize on 2>/dev/null;`
          const newCmd = command
            ? `tmux new-session -s ${shellEscape(tmuxName)} -c ${shellEscape(cwd)} ${shellEscape(command)}`
            : `tmux new-session -s ${shellEscape(tmuxName)} -c ${shellEscape(cwd)}`
          stream.write(
            `${fixPath} && (tmux has-session -t ${shellEscape(tmuxName)} 2>/dev/null && { ${setResize} tmux attach -t ${shellEscape(tmuxName)}; } || ${newCmd})\n`
          )
        } else {
          if (command) {
            stream.write(`${fixPath} && cd ${shellEscape(cwd)} && ${command}\n`)
          } else {
            stream.write(`${fixPath} && cd ${shellEscape(cwd)} && clear\n`)
          }
        }

        resolve(stream)
      })
    })
  }

  /** Reattach to an existing tmux session after SSH reconnection */
  async reattachTmux(
    connectionId: string,
    cols: number,
    rows: number,
    sessionId: string
  ): Promise<ClientChannel> {
    return this.enqueueShell(connectionId, () =>
      this.reattachTmuxDirect(connectionId, cols, rows, sessionId)
    )
  }

  private async reattachTmuxDirect(
    connectionId: string,
    cols: number,
    rows: number,
    sessionId: string
  ): Promise<ClientChannel> {
    const managed = this.connections.get(connectionId)
    if (!managed || managed.status !== 'connected') {
      throw new Error(`SSH connection ${connectionId} is not connected`)
    }

    managed.activeSessions.add(sessionId)

    return new Promise((resolve, reject) => {
      const shellOpts = {
        term: 'xterm-256color',
        cols,
        rows,
        env: { LANG: 'en_US.UTF-8' }
      }

      managed.client.shell(shellOpts, (err, stream) => {
        if (err) {
          managed.activeSessions.delete(sessionId)
          reject(err)
          return
        }

        stream.on('close', () => {
          managed.activeSessions.delete(sessionId)
        })

        const fixPath =
          'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.local/bin:$PATH'
        const tmuxName = this.tmuxSessionName(sessionId)
        stream.write(`${fixPath} && tmux set-option -t ${shellEscape(tmuxName)} -g aggressive-resize on 2>/dev/null; tmux attach -t ${shellEscape(tmuxName)}\n`)

        resolve(stream)
      })
    })
  }

  /** Kill a remote tmux session */
  async killTmuxSession(connectionId: string, sessionId: string): Promise<void> {
    try {
      const tmuxName = this.tmuxSessionName(sessionId)
      await this.exec(connectionId, `tmux kill-session -t ${shellEscape(tmuxName)}`)
    } catch {
      // Session may already be gone
    }
  }

  async setupGitCredentials(connectionId: string, token: string): Promise<void> {
    try {
      // Configure git to use credential store
      await this.exec(connectionId, 'git config --global credential.helper store')

      // Write credentials for github.com, gitlab.com, bitbucket.org
      const hosts = ['github.com', 'gitlab.com', 'bitbucket.org']
      const lines = hosts.map((h) => `https://oauth2:${token}@${h}`)
      const credentialCmd = `printf '%s\\n' ${lines.map((l) => shellEscape(l)).join(' ')} > ~/.git-credentials && chmod 600 ~/.git-credentials`
      await this.exec(connectionId, credentialCmd)
    } catch {
      // Non-critical — git operations may still work without credentials
    }
  }

  removeSession(connectionId: string, sessionId: string): void {
    const managed = this.connections.get(connectionId)
    if (managed) {
      managed.activeSessions.delete(sessionId)
    }
  }

  async exec(
    connectionId: string,
    command: string,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    const managed = this.connections.get(connectionId)
    if (!managed || managed.status !== 'connected') {
      throw new Error(`SSH connection ${connectionId} is not connected`)
    }

    const pathPrefix =
      'export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.local/bin:$PATH && '
    const fullCommand = cwd
      ? `${pathPrefix}cd ${shellEscape(cwd)} && ${command}`
      : `${pathPrefix}${command}`

    return new Promise((resolve, reject) => {
      managed.client.exec(fullCommand, { env: { GIT_TERMINAL_PROMPT: '0' } }, (err, stream) => {
        if (err) {
          reject(err)
          return
        }

        let stdout = ''
        let stderr = ''

        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })

        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code: code ?? 0 })
        })
      })
    })
  }

  async listDirectory(connectionId: string, path: string): Promise<SFTPEntry[]> {
    const managed = this.connections.get(connectionId)
    if (!managed || managed.status !== 'connected') {
      throw new Error(`SSH connection ${connectionId} is not connected`)
    }

    return new Promise((resolve, reject) => {
      managed.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
          return
        }

        sftp.readdir(path, (err2, list) => {
          sftp.end()
          if (err2) {
            reject(err2)
            return
          }

          const entries: SFTPEntry[] = list
            .filter((item) => !item.filename.startsWith('.'))
            .map((item) => ({
              name: item.filename,
              isDirectory: (item.attrs.mode! & 0o040000) !== 0,
              size: item.attrs.size ?? 0,
              modifiedAt: new Date((item.attrs.mtime ?? 0) * 1000).toISOString()
            }))
            .sort((a, b) => {
              if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
              return a.name.localeCompare(b.name)
            })

          resolve(entries)
        })
      })
    })
  }

  async reconnectManual(connectionId: string): Promise<void> {
    const managed = this.connections.get(connectionId)
    if (!managed) return

    if (managed.reconnectTimer) {
      clearTimeout(managed.reconnectTimer)
      managed.reconnectTimer = null
    }

    managed.reconnectAttempts = 0
    await this.doReconnect(connectionId)
  }

  disconnectAll(): void {
    for (const [id] of this.connections) {
      this.disconnect(id)
    }
  }

  private scheduleReconnect(connectionId: string): void {
    const managed = this.connections.get(connectionId)
    if (!managed) return

    if (managed.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      managed.status = 'error'
      managed.error = `Reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`
      this.emitStatus(connectionId, 'error', managed.error)
      return
    }

    const delay = Math.min(
      RECONNECT_BASE_MS * Math.pow(2, managed.reconnectAttempts),
      RECONNECT_MAX_MS
    )

    managed.reconnectTimer = setTimeout(() => {
      this.doReconnect(connectionId)
    }, delay)
  }

  private async doReconnect(connectionId: string): Promise<void> {
    const managed = this.connections.get(connectionId)
    if (!managed) return

    managed.reconnectAttempts++
    managed.status = 'connecting'
    this.emitStatus(connectionId, 'connecting')

    const client = new Client()
    const oldClient = managed.client
    managed.client = client

    try {
      oldClient.end()
    } catch {
      // Ignore
    }

    return new Promise((resolve) => {
      client.on('ready', () => {
        managed.status = 'connected'
        managed.reconnectAttempts = 0
        managed.error = undefined
        this.emitStatus(connectionId, 'connected')
        // Re-check tmux availability on reconnect
        this.checkTmux(connectionId)
          .catch(() => {})
          .finally(() => {
            this.emitReconnected(connectionId)
          })
        resolve()
      })

      client.on('error', (err) => {
        managed.error = err.message
        managed.status = 'error'
        this.emitStatus(connectionId, 'error', err.message)
        this.scheduleReconnect(connectionId)
        resolve()
      })

      client.on('close', () => {
        if (managed.status === 'connected') {
          managed.status = 'disconnected'
          this.emitStatus(connectionId, 'disconnected')
          this.scheduleReconnect(connectionId)
        }
      })

      client.on('end', () => {
        if (managed.status === 'connected') {
          managed.status = 'disconnected'
          this.emitStatus(connectionId, 'disconnected')
          this.scheduleReconnect(connectionId)
        }
      })

      const connectConfig = this.buildConnectConfig(managed.config)
      client.connect(connectConfig)
    })
  }

  private buildConnectConfig(config: SSHConnection): ConnectConfig {
    const connectConfig: ConnectConfig = {
      host: config.host,
      port: config.port,
      username: config.username,
      keepaliveInterval: KEEPALIVE_INTERVAL_MS,
      keepaliveCountMax: KEEPALIVE_COUNT_MAX,
      readyTimeout: 10000
    }

    if (config.authMethod === 'key' && config.privateKeyPath) {
      try {
        connectConfig.privateKey = readFileSync(expandTilde(config.privateKeyPath))
        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase
        }
      } catch {
        throw new Error(`Failed to read private key: ${config.privateKeyPath}`)
      }
    } else if (config.authMethod === 'password' && config.password) {
      connectConfig.password = config.password
    }

    return connectConfig
  }

  private emitStatus(connectionId: string, status: SSHConnectionStatus, error?: string): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('ssh:status', connectionId, status, error)
      }
    } catch {
      // Window may have been destroyed
    }
  }

  private emitReconnected(connectionId: string): void {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('ssh:reconnected', connectionId)
      }
    } catch {
      // Window may have been destroyed
    }
    // Trigger PTY reattach for all sessions on this connection
    if (this.reconnectCallback) {
      this.reconnectCallback(connectionId)
    }
  }
}

function shellEscape(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

export const sshManager = new SSHManager()
