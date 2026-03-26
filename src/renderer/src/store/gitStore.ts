import { create } from 'zustand'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../../../shared/gitTypes'

interface GitProjectState {
  status: GitStatusResult | null
  log: GitLogResult | null
  commitMessage: string
  committing: boolean
  pulling: boolean
  connectionId?: string
}

interface GitState {
  projects: Record<string, GitProjectState>
  refreshStatus: (path: string, connectionId?: string) => Promise<void>
  refreshLog: (path: string, connectionId?: string) => Promise<void>
  stageFiles: (path: string, files: string[], connectionId?: string) => Promise<void>
  unstageFiles: (path: string, files: string[], connectionId?: string) => Promise<void>
  stageAll: (path: string, connectionId?: string) => Promise<void>
  unstageAll: (path: string, connectionId?: string) => Promise<void>
  setCommitMessage: (path: string, msg: string) => void
  commit: (path: string, connectionId?: string) => Promise<void>
  pull: (path: string, connectionId?: string) => Promise<GitPullResult>
  startPolling: (path: string, connectionId?: string) => void
  stopPolling: (path: string) => void
}

const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>()

function getProjectState(projects: Record<string, GitProjectState>, path: string): GitProjectState {
  return (
    projects[path] || {
      status: null,
      log: null,
      commitMessage: '',
      committing: false,
      pulling: false
    }
  )
}

export const useGitStore = create<GitState>((set, get) => ({
  projects: {},

  refreshStatus: async (path, connectionId?) => {
    try {
      const status = await window.api.gitGetStatus(path, connectionId)
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), status, connectionId }
        }
      }))
    } catch {
      // Silently ignore errors (path gone, git not installed, etc.)
    }
  },

  refreshLog: async (path, connectionId?) => {
    try {
      const log = await window.api.gitGetLog(path, undefined, connectionId)
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), log }
        }
      }))
    } catch {
      // Silently ignore
    }
  },

  stageFiles: async (path, files, connectionId?) => {
    await window.api.gitStage(path, files, connectionId)
    await get().refreshStatus(path, connectionId)
  },

  unstageFiles: async (path, files, connectionId?) => {
    await window.api.gitUnstage(path, files, connectionId)
    await get().refreshStatus(path, connectionId)
  },

  stageAll: async (path, connectionId?) => {
    await window.api.gitStageAll(path, connectionId)
    await get().refreshStatus(path, connectionId)
  },

  unstageAll: async (path, connectionId?) => {
    await window.api.gitUnstageAll(path, connectionId)
    await get().refreshStatus(path, connectionId)
  },

  setCommitMessage: (path, msg) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), commitMessage: msg }
      }
    }))
  },

  commit: async (path, connectionId?) => {
    const ps = getProjectState(get().projects, path)
    if (!ps.commitMessage.trim() || ps.committing) return

    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), committing: true }
      }
    }))

    try {
      await window.api.gitCommit(path, ps.commitMessage.trim(), connectionId)
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), commitMessage: '', committing: false }
        }
      }))
      await get().refreshStatus(path, connectionId)
      await get().refreshLog(path, connectionId)
    } catch {
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), committing: false }
        }
      }))
    }
  },

  pull: async (path, connectionId?) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), pulling: true }
      }
    }))

    try {
      const result = await window.api.gitPull(path, connectionId)
      await get().refreshStatus(path, connectionId)
      await get().refreshLog(path, connectionId)
      return result
    } finally {
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), pulling: false }
        }
      }))
    }
  },

  startPolling: (path, connectionId?) => {
    // Stop existing interval if any
    get().stopPolling(path)

    // Initial fetch
    get().refreshStatus(path, connectionId)
    get().refreshLog(path, connectionId)

    // Poll status every 5s
    const interval = setInterval(() => {
      get().refreshStatus(path, connectionId)
    }, 5000)
    pollingIntervals.set(path, interval)
  },

  stopPolling: (path) => {
    const existing = pollingIntervals.get(path)
    if (existing) {
      clearInterval(existing)
      pollingIntervals.delete(path)
    }
  }
}))
