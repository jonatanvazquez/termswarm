import { ElectronAPI } from '@electron-toolkit/preload'
import type { ConversationStatus } from '../shared/types'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../shared/gitTypes'
import type {
  SSHConnection,
  SSHConnectionSaved,
  SSHConnectionStatus,
  SFTPEntry,
  GitHubRepo
} from '../shared/sshTypes'
import type { AndroidEmulator, IOSSimulator, EmulatorListResult } from '../shared/emulatorTypes'
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
        mode?: 'claude' | 'terminal',
        connectionId?: string
      ) => Promise<string>
      ptyWrite: (sessionId: string, data: string) => void
      ptyResize: (sessionId: string, cols: number, rows: number) => void
      ptyKill: (sessionId: string) => Promise<void>
      ptyKillRemote: (sessionId: string) => Promise<void>
      ptyPause: (sessionId: string) => Promise<void>
      ptyResume: (sessionId: string) => Promise<void>
      onPtyData: (callback: (sessionId: string, data: string) => void) => CleanupFn
      onPtyExit: (callback: (sessionId: string, exitCode: number) => void) => CleanupFn
      onPtyStatus: (callback: (sessionId: string, status: ConversationStatus) => void) => CleanupFn
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

      // SSH
      sshConnect: (config: SSHConnection) => Promise<void>
      sshDisconnect: (connectionId: string) => Promise<void>
      sshTestConnection: (config: SSHConnection) => Promise<{ success: boolean; error?: string }>
      sshListDir: (connectionId: string, path: string) => Promise<SFTPEntry[]>
      sshReconnect: (connectionId: string) => Promise<void>
      githubListRepos: (
        token: string
      ) => Promise<{ success: boolean; repos?: GitHubRepo[]; error?: string }>
      sshGitClone: (
        connectionId: string,
        repoUrl: string,
        targetDir: string
      ) => Promise<{ success: boolean; error?: string; path?: string; name?: string }>
      onSshStatus: (
        callback: (connectionId: string, status: SSHConnectionStatus, error?: string) => void
      ) => CleanupFn
      onSshReconnected: (callback: (connectionId: string) => void) => CleanupFn

      // Connection registry
      loadConnections: () => Promise<SSHConnectionSaved[] | null>
      saveConnections: (data: SSHConnectionSaved[]) => void

      // Git (with optional connectionId for remote projects)
      gitIsRepo: (cwd: string, connectionId?: string) => Promise<boolean>
      gitGetStatus: (cwd: string, connectionId?: string) => Promise<GitStatusResult>
      gitGetLog: (cwd: string, count?: number, connectionId?: string) => Promise<GitLogResult>
      gitStage: (cwd: string, paths: string[], connectionId?: string) => Promise<void>
      gitUnstage: (cwd: string, paths: string[], connectionId?: string) => Promise<void>
      gitStageAll: (cwd: string, connectionId?: string) => Promise<void>
      gitUnstageAll: (cwd: string, connectionId?: string) => Promise<void>
      gitCommit: (cwd: string, message: string, connectionId?: string) => Promise<void>
      gitPull: (cwd: string, connectionId?: string) => Promise<GitPullResult>

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
