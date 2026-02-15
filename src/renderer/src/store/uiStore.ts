import { create } from 'zustand'
import { useProjectStore } from './projectStore'

function syncPreviewToProject(previewOpen: boolean, previewUrl: string): void {
  const { activeProjectId, setProjectPreview } = useProjectStore.getState()
  if (activeProjectId) {
    setProjectPreview(activeProjectId, previewOpen, previewUrl)
  }
}

interface UIState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  addingProject: boolean
  addingConversationInProject: string | null
  terminalHidden: boolean
  previewOpen: boolean
  previewUrl: string
  previewWidth: number
  gitPanelCollapsed: boolean
  gitPanelHeight: number
  conversationFilter: 'all' | 'unanswered' | 'working' | 'unread'
  toggleSidebar: () => void
  setSidebarWidth: (w: number) => void
  startAddingProject: () => void
  stopAddingProject: () => void
  startAddingConversation: (projectId: string) => void
  stopAddingConversation: () => void
  toggleTerminal: () => void
  togglePreview: () => void
  setPreviewUrl: (url: string) => void
  setPreviewWidth: (w: number) => void
  setPreviewState: (open: boolean, url: string) => void
  toggleGitPanel: () => void
  setGitPanelHeight: (h: number) => void
  setConversationFilter: (filter: 'all' | 'unanswered' | 'working' | 'unread') => void
  loadFromDisk: () => Promise<void>
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: 260,
  addingProject: false,
  addingConversationInProject: null,
  terminalHidden: false,
  previewOpen: false,
  previewUrl: 'http://localhost:3000',
  previewWidth: 500,
  gitPanelCollapsed: false,
  gitPanelHeight: 200,
  conversationFilter: 'all',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  startAddingProject: () => set({ addingProject: true }),
  stopAddingProject: () => set({ addingProject: false }),
  startAddingConversation: (projectId) => set({ addingConversationInProject: projectId }),
  stopAddingConversation: () => set({ addingConversationInProject: null }),
  toggleTerminal: () => set((state) => ({ terminalHidden: !state.terminalHidden })),
  togglePreview: () =>
    set((state) => {
      const next = !state.previewOpen
      syncPreviewToProject(next, state.previewUrl)
      return { previewOpen: next }
    }),
  setPreviewUrl: (url) =>
    set((state) => {
      syncPreviewToProject(state.previewOpen, url)
      return { previewUrl: url }
    }),
  setPreviewWidth: (w) => set({ previewWidth: w }),
  setPreviewState: (open, url) => set({ previewOpen: open, previewUrl: url }),
  toggleGitPanel: () => set((state) => ({ gitPanelCollapsed: !state.gitPanelCollapsed })),
  setGitPanelHeight: (h) => set({ gitPanelHeight: h }),
  setConversationFilter: (filter) => set({ conversationFilter: filter }),

  loadFromDisk: async () => {
    const raw = await window.api.loadUILayout()
    if (!raw || typeof raw !== 'object') return
    const data = raw as Record<string, unknown>
    const patch: Partial<UIState> = {}
    if (typeof data.sidebarWidth === 'number') patch.sidebarWidth = data.sidebarWidth
    if (typeof data.sidebarCollapsed === 'boolean') patch.sidebarCollapsed = data.sidebarCollapsed
    if (typeof data.previewWidth === 'number') patch.previewWidth = data.previewWidth
    if (typeof data.gitPanelHeight === 'number') patch.gitPanelHeight = data.gitPanelHeight
    if (typeof data.gitPanelCollapsed === 'boolean') patch.gitPanelCollapsed = data.gitPanelCollapsed
    set(patch)
  }
}))

// Auto-save layout: debounced 500ms
let uiSaveTimeout: ReturnType<typeof setTimeout> | null = null
useUIStore.subscribe((state) => {
  if (uiSaveTimeout) clearTimeout(uiSaveTimeout)
  uiSaveTimeout = setTimeout(() => {
    window.api.saveUILayout({
      sidebarWidth: state.sidebarWidth,
      sidebarCollapsed: state.sidebarCollapsed,
      previewWidth: state.previewWidth,
      gitPanelHeight: state.gitPanelHeight,
      gitPanelCollapsed: state.gitPanelCollapsed
    })
  }, 500)
})
