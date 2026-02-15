import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { createConnection } from 'net'
import { copyFile, cp, access } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ptyManager } from './ptyManager'
import { gitManager } from './gitManager'
import { loadProjects, saveProjects, loadBuffers, saveBuffers, loadSettings, saveSettings, loadUILayout, saveUILayout } from './persistence'

/** Check TCP reachability using Node.js net (bypasses Chromium network stack). */
function probePort(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(false)
    })
  })
}

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 10 },
    backgroundColor: '#0e0e10',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.termswarm')

  // Set dock icon and app name for development mode
  app.setName('TermSwarm')
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(icon))
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select project folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // URL probe (Node.js net — bypasses Chromium network stack)
  ipcMain.handle('probe:url', async (_e, rawUrl: string) => {
    try {
      const url = new URL(rawUrl)
      const host = url.hostname || 'localhost'
      const port = parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80)
      return await probePort(host, port)
    } catch {
      return false
    }
  })

  // PTY handlers
  ipcMain.handle('pty:killAll', () => {
    console.log('[Main] pty:killAll — cleaning orphaned sessions')
    ptyManager.killAll()
  })

  ipcMain.handle(
    'pty:spawn',
    (_e, sessionId: string, cwd: string, args?: string[], mode?: 'claude' | 'terminal') => {
      return ptyManager.spawn(sessionId, cwd, args, mode)
    }
  )

  ipcMain.on('pty:write', (_e, sessionId: string, data: string) => {
    ptyManager.write(sessionId, data)
  })

  ipcMain.on('pty:resize', (_e, sessionId: string, cols: number, rows: number) => {
    ptyManager.resize(sessionId, cols, rows)
  })

  ipcMain.handle('pty:kill', (_e, sessionId: string) => {
    ptyManager.kill(sessionId)
  })

  ipcMain.handle('pty:pause', (_e, sessionId: string) => {
    ptyManager.pause(sessionId)
  })

  ipcMain.handle('pty:resume', (_e, sessionId: string) => {
    ptyManager.resume(sessionId)
  })

  // Clone a Claude Code session: copy .jsonl (and optional dir) with a new UUID
  ipcMain.handle(
    'claude:forkSession',
    async (_e, projectPath: string, sourceSessionId: string, newSessionId: string) => {
      // Claude Code stores sessions in ~/.claude/projects/<path-with-dashes>/
      const slug = projectPath.replace(/\//g, '-')
      const sessionsDir = join(homedir(), '.claude', 'projects', slug)
      const srcFile = join(sessionsDir, `${sourceSessionId}.jsonl`)
      const dstFile = join(sessionsDir, `${newSessionId}.jsonl`)

      try {
        await copyFile(srcFile, dstFile)
      } catch {
        console.warn('[Main] claude:forkSession — .jsonl not found:', srcFile)
        return false
      }

      // Some sessions also have a companion directory
      const srcDir = join(sessionsDir, sourceSessionId)
      try {
        await access(srcDir)
        await cp(srcDir, join(sessionsDir, newSessionId), { recursive: true })
      } catch {
        // No companion directory — that's fine
      }

      return true
    }
  )

  // Persistence handlers
  ipcMain.handle('store:load', () => {
    return loadProjects()
  })

  ipcMain.on('store:save', (_e, projects: unknown) => {
    saveProjects(projects)
  })

  ipcMain.handle('store:loadBuffers', () => {
    return loadBuffers()
  })

  ipcMain.on('store:saveBuffers', (_e, buffers: Record<string, string>) => {
    saveBuffers(buffers)
  })

  ipcMain.handle('store:loadSettings', () => {
    return loadSettings()
  })

  ipcMain.on('store:saveSettings', (_e, data: unknown) => {
    saveSettings(data)
  })

  ipcMain.handle('store:loadUILayout', () => {
    return loadUILayout()
  })

  ipcMain.on('store:saveUILayout', (_e, data: unknown) => {
    saveUILayout(data)
  })

  // Git handlers
  ipcMain.handle('git:isRepo', (_e, cwd: string) => gitManager.isGitRepo(cwd))
  ipcMain.handle('git:status', (_e, cwd: string) => gitManager.getStatus(cwd))
  ipcMain.handle('git:log', (_e, cwd: string, count?: number) => gitManager.getLog(cwd, count))
  ipcMain.handle('git:stage', (_e, cwd: string, paths: string[]) =>
    gitManager.stageFiles(cwd, paths)
  )
  ipcMain.handle('git:unstage', (_e, cwd: string, paths: string[]) =>
    gitManager.unstageFiles(cwd, paths)
  )
  ipcMain.handle('git:stageAll', (_e, cwd: string) => gitManager.stageAll(cwd))
  ipcMain.handle('git:unstageAll', (_e, cwd: string) => gitManager.unstageAll(cwd))
  ipcMain.handle('git:commit', (_e, cwd: string, message: string) =>
    gitManager.commit(cwd, message)
  )
  ipcMain.handle('git:pull', (_e, cwd: string) => gitManager.pull(cwd))

  const mainWindow = createWindow()
  ptyManager.setMainWindow(mainWindow)

  // Suppress webview errors — renderer handles recovery
  mainWindow.webContents.on('did-attach-webview', (_e, webContents) => {
    webContents.on('did-fail-load', () => {})
    webContents.on('render-process-gone', () => {})
  })

  mainWindow.on('closed', () => {
    ptyManager.killAll()
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow()
      ptyManager.setMainWindow(win)
    }
  })
})

app.on('before-quit', () => {
  ptyManager.killAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
