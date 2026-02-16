import { autoUpdater } from 'electron-updater'
import type { BrowserWindow } from 'electron'
import type { UpdateStatus } from '../shared/updateTypes'

class UpdateManager {
  private mainWindow: BrowserWindow | null = null
  private currentVersion = 'dev'
  private status: UpdateStatus = { state: 'idle', currentVersion: 'dev' }
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private initialCheckTimeout: ReturnType<typeof setTimeout> | null = null

  init(mainWindow: BrowserWindow, appVersion: string): void {
    this.mainWindow = mainWindow
    this.currentVersion = appVersion
    this.status = { state: 'idle', currentVersion: appVersion }

    autoUpdater.autoDownload = false
    autoUpdater.allowPrerelease = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('checking-for-update', () => {
      this.setStatus({ state: 'checking', currentVersion: this.currentVersion })
    })

    autoUpdater.on('update-available', (info) => {
      this.setStatus({
        state: 'available',
        currentVersion: this.currentVersion,
        version: info.version,
        releaseNotes:
          typeof info.releaseNotes === 'string'
            ? info.releaseNotes
            : Array.isArray(info.releaseNotes)
              ? info.releaseNotes.map((n) => n.note).join('\n')
              : undefined
      })
    })

    autoUpdater.on('update-not-available', () => {
      this.setStatus({ state: 'not-available', currentVersion: this.currentVersion })
    })

    autoUpdater.on('download-progress', (progress) => {
      this.setStatus({
        ...this.status,
        state: 'downloading',
        progress: Math.round(progress.percent)
      })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.setStatus({
        state: 'downloaded',
        currentVersion: this.currentVersion,
        version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      this.setStatus({
        state: 'error',
        currentVersion: this.currentVersion,
        error: err.message
      })
    })

    // Auto-check: 5s after launch, then every 4 hours
    this.initialCheckTimeout = setTimeout(() => {
      this.check()
    }, 5_000)

    this.checkInterval = setInterval(
      () => {
        this.check()
      },
      4 * 60 * 60 * 1_000
    )
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    if (this.initialCheckTimeout) {
      clearTimeout(this.initialCheckTimeout)
      this.initialCheckTimeout = null
    }
    this.mainWindow = null
  }

  getStatus(): UpdateStatus {
    return this.status
  }

  async check(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch {
      // error event already emitted by autoUpdater
    }
  }

  async download(): Promise<void> {
    await autoUpdater.downloadUpdate()
  }

  install(): void {
    autoUpdater.quitAndInstall()
  }

  private setStatus(status: UpdateStatus): void {
    this.status = status
    this.mainWindow?.webContents?.send('updater:status', status)
  }
}

export const updateManager = new UpdateManager()
