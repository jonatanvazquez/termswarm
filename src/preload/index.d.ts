import { ElectronAPI } from '@electron-toolkit/preload'
import type { ConversationStatus } from '../shared/types'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../shared/gitTypes'
import type {
  AndroidEmulator,
  IOSSimulator,
  EmulatorListResult
} from '../shared/emulatorTypes'
import type { UpdateStatus } from '../shared/updateTypes'

type CleanupFn = () => void

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      selectDirectory: () => Promise<string | null>

      // URL probe
      probeUrl: (url: string) => Promise<boolean>

      // PTY
      ptyKillAll: () => Promise<void>
      ptySpawn: (
        sessionId: string,
        cwd: string,
        args?: string[],
        mode?: 'claude' | 'terminal'
      ) => Promise<string>
      ptyWrite: (sessionId: string, data: string) => void
      ptyResize: (sessionId: string, cols: number, rows: number) => void
      ptyKill: (sessionId: string) => Promise<void>
      ptyPause: (sessionId: string) => Promise<void>
      ptyResume: (sessionId: string) => Promise<void>
      onPtyData: (callback: (sessionId: string, data: string) => void) => CleanupFn
      onPtyExit: (callback: (sessionId: string, exitCode: number) => void) => CleanupFn
      onPtyStatus: (
        callback: (sessionId: string, status: ConversationStatus) => void
      ) => CleanupFn
      onPtyMemory: (callback: (stats: Record<string, number>) => void) => CleanupFn

      // Claude session fork
      claudeForkSession: (
        projectPath: string,
        sourceSessionId: string,
        newSessionId: string
      ) => Promise<boolean>

      // Persistence
      loadProjects: () => Promise<unknown>
      saveProjects: (data: unknown) => void
      loadBuffers: () => Promise<Record<string, string> | null>
      saveBuffers: (data: Record<string, string>) => void
      loadSettings: () => Promise<unknown>
      saveSettings: (data: unknown) => void
      loadUILayout: () => Promise<unknown>
      saveUILayout: (data: unknown) => void

      // Git
      gitIsRepo: (cwd: string) => Promise<boolean>
      gitGetStatus: (cwd: string) => Promise<GitStatusResult>
      gitGetLog: (cwd: string, count?: number) => Promise<GitLogResult>
      gitStage: (cwd: string, paths: string[]) => Promise<void>
      gitUnstage: (cwd: string, paths: string[]) => Promise<void>
      gitStageAll: (cwd: string) => Promise<void>
      gitUnstageAll: (cwd: string) => Promise<void>
      gitCommit: (cwd: string, message: string) => Promise<void>
      gitPull: (cwd: string) => Promise<GitPullResult>

      // Emulators
      platform: string
      emulatorListAndroid: () => Promise<EmulatorListResult<AndroidEmulator>>
      emulatorLaunchAndroid: (avdName: string) => Promise<{ success: boolean; error?: string }>
      emulatorListIOS: () => Promise<EmulatorListResult<IOSSimulator>>
      emulatorLaunchIOS: (udid: string) => Promise<{ success: boolean; error?: string }>
      emulatorOpenAndroidManager: () => Promise<{ success: boolean; error?: string }>
      emulatorOpenIOSManager: () => Promise<{ success: boolean; error?: string }>

      // Updater
      updaterGetStatus: () => Promise<UpdateStatus>
      updaterCheck: () => Promise<void>
      updaterDownload: () => Promise<void>
      updaterInstall: () => Promise<void>
      onUpdaterStatus: (callback: (status: UpdateStatus) => void) => CleanupFn

      // Zoom
      setZoomFactor: (factor: number) => void
    }
  }
}
