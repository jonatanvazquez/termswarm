import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage, Menu } from 'electron'
import { join } from 'path'
import { homedir } from 'os'
import { createConnection } from 'net'
import { copyFile, cp, access } from 'fs/promises'
import { electronApp, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ptyManager } from './ptyManager'
import { gitManager } from './gitManager'
import { sshManager } from './sshManager'
import { emulatorManager } from './emulatorManager'
import { updateManager } from './updateManager'
import {
  loadProjects,
  saveProjects,
  loadBuffers,
  saveBuffers,
  loadSettings,
  saveSettings,
  loadUILayout,
  saveUILayout,
  loadConnections,
  saveConnections
} from './persistence'
import type { SSHConnection, GitHubRepo } from '../shared/sshTypes'

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

// In dev mode, isolate userData so a dev instance doesn't share data with the installed app
if (is.dev) {
  app.setPath('userData', join(app.getPath('userData'), 'Dev'))
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.termswarm')

  // Set dock icon and app name for development mode
  app.setName('TermSwarm')
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(icon))
  }

  // Register dev shortcuts via Menu accelerators instead of before-input-event.
  // optimizer.watchWindowShortcuts uses before-input-event on the parent window which
  // prevents keyboard events (Enter, etc.) from reaching <webview> guest pages.
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        ...(is.dev
          ? [
              {
                label: 'Toggle DevTools',
                accelerator: 'F12',
                click: (_mi: Electron.MenuItem, win?: BrowserWindow): void => {
                  win?.webContents.toggleDevTools()
                }
              } as Electron.MenuItemConstructorOptions
            ]
          : []),
        { type: 'separator' as const }
      ]
    },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

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
    (
      _e,
      sessionId: string,
      cwd: string,
      args?: string[],
      mode?: 'claude' | 'terminal',
      connectionId?: string
    ) => {
      return ptyManager.spawn(sessionId, cwd, args, mode, connectionId)
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

  // SSH handlers
  ipcMain.handle('ssh:connect', async (_e, config: SSHConnection) => {
    await sshManager.connect(config)
  })

  ipcMain.handle('ssh:disconnect', (_e, connectionId: string) => {
    sshManager.disconnect(connectionId)
  })

  ipcMain.handle('ssh:testConnection', async (_e, config: SSHConnection) => {
    return sshManager.testConnection(config)
  })

  ipcMain.handle('ssh:listDir', async (_e, connectionId: string, path: string) => {
    return sshManager.listDirectory(connectionId, path)
  })

  ipcMain.handle('ssh:reconnect', async (_e, connectionId: string) => {
    await sshManager.reconnectManual(connectionId)
  })

  ipcMain.handle('github:listRepos', async (_e, token: string) => {
    try {
      const repos: GitHubRepo[] = []
      let page = 1
      const perPage = 100

      // Fetch up to 300 repos (3 pages)
      while (page <= 3) {
        const res = await fetch(
          `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json'
            }
          }
        )

        if (!res.ok) {
          const body = await res.text()
          return { success: false, error: `GitHub API error: ${res.status} ${body}` }
        }

        const data = (await res.json()) as Array<{
          name: string
          full_name: string
          clone_url: string
          description: string | null
          private: boolean
          updated_at: string
        }>

        for (const r of data) {
          repos.push({
            name: r.name,
            fullName: r.full_name,
            cloneUrl: r.clone_url,
            description: r.description,
            private: r.private,
            updatedAt: r.updated_at
          })
        }

        if (data.length < perPage) break
        page++
      }

      return { success: true, repos }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'ssh:gitClone',
    async (_e, connectionId: string, repoUrl: string, targetDir: string) => {
      try {
        // Extract repo name from URL for the clone target
        const repoName = repoUrl
          .replace(/\.git$/, '')
          .split('/')
          .pop()
        if (!repoName) throw new Error('Invalid repository URL')

        // Resolve ~ to actual home directory on the remote
        let resolvedDir = targetDir
        if (resolvedDir.startsWith('~')) {
          const homeResult = await sshManager.exec(connectionId, 'echo $HOME')
          const home = homeResult.stdout.trim()
          if (home) resolvedDir = resolvedDir.replace(/^~/, home)
        }

        const clonePath = `${resolvedDir}/${repoName}`

        // Check if directory already exists
        const checkResult = await sshManager.exec(
          connectionId,
          `test -d ${clonePath} && echo EXISTS`
        )
        if (checkResult.stdout.trim() === 'EXISTS') {
          // Directory exists — just use it instead of failing
          return { success: true, path: clonePath, name: repoName }
        }

        // Ensure target directory exists
        await sshManager.exec(connectionId, `mkdir -p ${resolvedDir}`)

        // Inject token into HTTPS URL if available
        let authUrl = repoUrl
        const managed = sshManager.getConnection(connectionId)
        const token = managed?.config.gitToken
        if (token && repoUrl.startsWith('https://')) {
          authUrl = repoUrl.replace('https://', `https://oauth2:${token}@`)
        }

        // Clone the repo
        const result = await sshManager.exec(connectionId, `git clone ${authUrl} ${clonePath} 2>&1`)

        if (result.code !== 0) {
          return { success: false, error: result.stderr || result.stdout }
        }

        return { success: true, path: clonePath, name: repoName }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // Connection registry persistence
  ipcMain.handle('connections:load', () => {
    return loadConnections()
  })

  ipcMain.on('connections:save', (_e, data: unknown) => {
    saveConnections(data)
  })

  // Git handlers (with optional connectionId)
  ipcMain.handle('git:isRepo', (_e, cwd: string, connectionId?: string) =>
    gitManager.isGitRepo(cwd, connectionId)
  )
  ipcMain.handle('git:status', (_e, cwd: string, connectionId?: string) =>
    gitManager.getStatus(cwd, connectionId)
  )
  ipcMain.handle('git:log', (_e, cwd: string, count?: number, connectionId?: string) =>
    gitManager.getLog(cwd, count, connectionId)
  )
  ipcMain.handle('git:stage', (_e, cwd: string, paths: string[], connectionId?: string) =>
    gitManager.stageFiles(cwd, paths, connectionId)
  )
  ipcMain.handle('git:unstage', (_e, cwd: string, paths: string[], connectionId?: string) =>
    gitManager.unstageFiles(cwd, paths, connectionId)
  )
  ipcMain.handle('git:stageAll', (_e, cwd: string, connectionId?: string) =>
    gitManager.stageAll(cwd, connectionId)
  )
  ipcMain.handle('git:unstageAll', (_e, cwd: string, connectionId?: string) =>
    gitManager.unstageAll(cwd, connectionId)
  )
  ipcMain.handle('git:commit', (_e, cwd: string, message: string, connectionId?: string) =>
    gitManager.commit(cwd, message, connectionId)
  )
  ipcMain.handle('git:pull', (_e, cwd: string, connectionId?: string) =>
    gitManager.pull(cwd, connectionId)
  )

  // Emulator handlers
  ipcMain.handle('emulator:listAndroid', () => emulatorManager.listAndroid())
  ipcMain.handle('emulator:launchAndroid', (_e, avdName: string) =>
    emulatorManager.launchAndroid(avdName)
  )
  ipcMain.handle('emulator:listIOS', () => emulatorManager.listIOS())
  ipcMain.handle('emulator:launchIOS', (_e, udid: string) => emulatorManager.launchIOS(udid))
  ipcMain.handle('emulator:openAndroidManager', () => emulatorManager.openAndroidManager())
  ipcMain.handle('emulator:openIOSManager', () => emulatorManager.openIOSManager())

  // Updater handlers
  ipcMain.handle('updater:getStatus', () => {
    if (!app.isPackaged) {
      return { state: 'idle', currentVersion: 'dev' }
    }
    return updateManager.getStatus()
  })

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) return
    await updateManager.check()
  })

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) return
    await updateManager.download()
  })

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return
    updateManager.install()
  })

  const mainWindow = createWindow()
  ptyManager.setMainWindow(mainWindow)
  sshManager.setMainWindow(mainWindow)

  if (app.isPackaged) {
    updateManager.init(mainWindow, app.getVersion())
  }

  // Suppress webview errors — renderer handles recovery
  mainWindow.webContents.on('did-attach-webview', (_e, webContents) => {
    webContents.on('did-fail-load', () => {})
    webContents.on('render-process-gone', () => {})

    // Workaround for Electron <webview> keyboard bug: Enter key reaches the
    // webview process (before-input-event fires) but Chromium doesn't dispatch
    // it to the guest page's DOM. We pre-register a handler in the guest page,
    // then invoke it from before-input-event.
    webContents.setBackgroundThrottling(false)

    const registerEnterHandler = (): void => {
      webContents
        .executeJavaScript(
          `
        window.__tsEnter = function() {
          var el = document.activeElement;
          if (!el) return;
          var o = {key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true};
          el.dispatchEvent(new KeyboardEvent('keydown',o));
          el.dispatchEvent(new KeyboardEvent('keypress',o));
          el.dispatchEvent(new KeyboardEvent('keyup',o));
          var f = el.closest ? el.closest('form') : null;
          if (f) { f.requestSubmit(); return; }
          if (el.tagName==='BUTTON'||el.tagName==='A'||(el.getAttribute&&el.getAttribute('role')==='button')) el.click();
        };
      `
        )
        .catch(() => {})
    }
    webContents.on('dom-ready', registerEnterHandler)
    webContents.on('did-navigate', registerEnterHandler)

    webContents.on('before-input-event', (_event, input) => {
      if (input.key !== 'Enter' || input.type !== 'keyDown' || input.isAutoRepeat) return
      webContents.executeJavaScript('window.__tsEnter&&window.__tsEnter()').catch(() => {})
    })
  })

  mainWindow.on('closed', () => {
    ptyManager.killAll()
    sshManager.disconnectAll()
    updateManager.destroy()
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
  sshManager.disconnectAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
