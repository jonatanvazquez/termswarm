import { create } from 'zustand'
import type { GitStatusResult, GitLogResult, GitPullResult } from '../../../shared/gitTypes'

interface GitProjectState {
  status: GitStatusResult | null
  log: GitLogResult | null
  commitMessage: string
  committing: boolean
  pulling: boolean
}

interface GitState {
  projects: Record<string, GitProjectState>
  refreshStatus: (path: string) => Promise<void>
  refreshLog: (path: string) => Promise<void>
  stageFiles: (path: string, files: string[]) => Promise<void>
  unstageFiles: (path: string, files: string[]) => Promise<void>
  stageAll: (path: string) => Promise<void>
  unstageAll: (path: string) => Promise<void>
  setCommitMessage: (path: string, msg: string) => void
  commit: (path: string) => Promise<void>
  pull: (path: string) => Promise<GitPullResult>
  startPolling: (path: string) => void
  stopPolling: (path: string) => void
}

const pollingIntervals = new Map<string, ReturnType<typeof setInterval>>()

function getProjectState(projects: Record<string, GitProjectState>, path: string): GitProjectState {
  return projects[path] || { status: null, log: null, commitMessage: '', committing: false, pulling: false }
}

export const useGitStore = create<GitState>((set, get) => ({
  projects: {},

  refreshStatus: async (path) => {
    try {
      const status = await window.api.gitGetStatus(path)
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), status }
        }
      }))
    } catch {
      // Silently ignore errors (path gone, git not installed, etc.)
    }
  },

  refreshLog: async (path) => {
    try {
      const log = await window.api.gitGetLog(path)
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

  stageFiles: async (path, files) => {
    await window.api.gitStage(path, files)
    await get().refreshStatus(path)
  },

  unstageFiles: async (path, files) => {
    await window.api.gitUnstage(path, files)
    await get().refreshStatus(path)
  },

  stageAll: async (path) => {
    await window.api.gitStageAll(path)
    await get().refreshStatus(path)
  },

  unstageAll: async (path) => {
    await window.api.gitUnstageAll(path)
    await get().refreshStatus(path)
  },

  setCommitMessage: (path, msg) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), commitMessage: msg }
      }
    }))
  },

  commit: async (path) => {
    const ps = getProjectState(get().projects, path)
    if (!ps.commitMessage.trim() || ps.committing) return

    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), committing: true }
      }
    }))

    try {
      await window.api.gitCommit(path, ps.commitMessage.trim())
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), commitMessage: '', committing: false }
        }
      }))
      await get().refreshStatus(path)
      await get().refreshLog(path)
    } catch {
      set((state) => ({
        projects: {
          ...state.projects,
          [path]: { ...getProjectState(state.projects, path), committing: false }
        }
      }))
    }
  },

  pull: async (path) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [path]: { ...getProjectState(state.projects, path), pulling: true }
      }
    }))

    try {
      const result = await window.api.gitPull(path)
      await get().refreshStatus(path)
      await get().refreshLog(path)
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

  startPolling: (path) => {
    // Stop existing interval if any
    get().stopPolling(path)

    // Initial fetch
    get().refreshStatus(path)
    get().refreshLog(path)

    // Poll status every 5s
    const interval = setInterval(() => {
      get().refreshStatus(path)
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
