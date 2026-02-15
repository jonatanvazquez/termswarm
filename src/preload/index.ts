import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ConversationStatus } from '../shared/types'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../shared/gitTypes'

type CleanupFn = () => void

const api = {
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:openDirectory'),

  // URL probe (runs in main process via Node.js net, not Chromium)
  probeUrl: (url: string): Promise<boolean> => ipcRenderer.invoke('probe:url', url),

  // PTY
  ptyKillAll: (): Promise<void> => ipcRenderer.invoke('pty:killAll'),
  ptySpawn: (
    sessionId: string,
    cwd: string,
    args?: string[],
    mode?: 'claude' | 'terminal'
  ): Promise<string> => ipcRenderer.invoke('pty:spawn', sessionId, cwd, args, mode),
  ptyWrite: (sessionId: string, data: string): void => {
    ipcRenderer.send('pty:write', sessionId, data)
  },
  ptyResize: (sessionId: string, cols: number, rows: number): void => {
    ipcRenderer.send('pty:resize', sessionId, cols, rows)
  },
  ptyKill: (sessionId: string): Promise<void> => ipcRenderer.invoke('pty:kill', sessionId),
  ptyPause: (sessionId: string): Promise<void> => ipcRenderer.invoke('pty:pause', sessionId),
  ptyResume: (sessionId: string): Promise<void> => ipcRenderer.invoke('pty:resume', sessionId),

  onPtyData: (callback: (sessionId: string, data: string) => void): CleanupFn => {
    const handler = (_e: Electron.IpcRendererEvent, sessionId: string, data: string): void => {
      callback(sessionId, data)
    }
    ipcRenderer.on('pty:data', handler)
    return () => ipcRenderer.removeListener('pty:data', handler)
  },
  onPtyExit: (callback: (sessionId: string, exitCode: number) => void): CleanupFn => {
    const handler = (_e: Electron.IpcRendererEvent, sessionId: string, exitCode: number): void => {
      callback(sessionId, exitCode)
    }
    ipcRenderer.on('pty:exit', handler)
    return () => ipcRenderer.removeListener('pty:exit', handler)
  },
  onPtyStatus: (
    callback: (sessionId: string, status: ConversationStatus) => void
  ): CleanupFn => {
    const handler = (
      _e: Electron.IpcRendererEvent,
      sessionId: string,
      status: ConversationStatus
    ): void => {
      callback(sessionId, status)
    }
    ipcRenderer.on('pty:status', handler)
    return () => ipcRenderer.removeListener('pty:status', handler)
  },
  onPtyMemory: (callback: (stats: Record<string, number>) => void): CleanupFn => {
    const handler = (_e: Electron.IpcRendererEvent, stats: Record<string, number>): void => {
      callback(stats)
    }
    ipcRenderer.on('pty:memory', handler)
    return () => ipcRenderer.removeListener('pty:memory', handler)
  },

  // Claude session fork
  claudeForkSession: (
    projectPath: string,
    sourceSessionId: string,
    newSessionId: string
  ): Promise<boolean> => ipcRenderer.invoke('claude:forkSession', projectPath, sourceSessionId, newSessionId),

  // Persistence
  loadProjects: (): Promise<unknown> => ipcRenderer.invoke('store:load'),
  saveProjects: (data: unknown): void => {
    ipcRenderer.send('store:save', data)
  },
  loadBuffers: (): Promise<Record<string, string> | null> =>
    ipcRenderer.invoke('store:loadBuffers'),
  saveBuffers: (data: Record<string, string>): void => {
    ipcRenderer.send('store:saveBuffers', data)
  },
  loadSettings: (): Promise<unknown> => ipcRenderer.invoke('store:loadSettings'),
  saveSettings: (data: unknown): void => {
    ipcRenderer.send('store:saveSettings', data)
  },
  loadUILayout: (): Promise<unknown> => ipcRenderer.invoke('store:loadUILayout'),
  saveUILayout: (data: unknown): void => {
    ipcRenderer.send('store:saveUILayout', data)
  },

  // Git
  gitIsRepo: (cwd: string): Promise<boolean> => ipcRenderer.invoke('git:isRepo', cwd),
  gitGetStatus: (cwd: string): Promise<GitStatusResult> => ipcRenderer.invoke('git:status', cwd),
  gitGetLog: (cwd: string, count?: number): Promise<GitLogResult> =>
    ipcRenderer.invoke('git:log', cwd, count),
  gitStage: (cwd: string, paths: string[]): Promise<void> =>
    ipcRenderer.invoke('git:stage', cwd, paths),
  gitUnstage: (cwd: string, paths: string[]): Promise<void> =>
    ipcRenderer.invoke('git:unstage', cwd, paths),
  gitStageAll: (cwd: string): Promise<void> => ipcRenderer.invoke('git:stageAll', cwd),
  gitUnstageAll: (cwd: string): Promise<void> => ipcRenderer.invoke('git:unstageAll', cwd),
  gitCommit: (cwd: string, message: string): Promise<void> =>
    ipcRenderer.invoke('git:commit', cwd, message),
  gitPull: (cwd: string): Promise<GitPullResult> => ipcRenderer.invoke('git:pull', cwd),

  // Zoom (Electron-native, works with canvas/WebGL)
  setZoomFactor: (factor: number): void => {
    webFrame.setZoomFactor(factor)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
