import { create } from 'zustand'
import { useProjectStore } from './projectStore'
import type { BrowserTab } from '../types'

function uid(): string {
  return crypto.randomUUID().slice(0, 8)
}

function syncPreviewToProject(
  previewOpen: boolean,
  tabs: BrowserTab[],
  activeTabId: string
): void {
  const { activeProjectId, setProjectPreview } = useProjectStore.getState()
  if (activeProjectId) {
    setProjectPreview(activeProjectId, previewOpen, tabs, activeTabId)
  }
}

const defaultTabId = uid()

interface UIState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  addingProject: boolean
  addingConversationInProject: string | null
  terminalHidden: boolean
  previewOpen: boolean
  previewTabs: BrowserTab[]
  activePreviewTabId: string
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
  addPreviewTab: (url?: string) => void
  closePreviewTab: (tabId: string) => void
  setActivePreviewTab: (tabId: string) => void
  setPreviewTabUrl: (tabId: string, url: string) => void
  setPreviewWidth: (w: number) => void
  setPreviewState: (open: boolean, tabs: BrowserTab[], activeTabId: string) => void
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
  previewTabs: [{ id: defaultTabId, url: 'http://localhost:3000' }],
  activePreviewTabId: defaultTabId,
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
      let tabs = state.previewTabs
      let activeId = state.activePreviewTabId
      if (next && tabs.length === 0) {
        const id = uid()
        tabs = [{ id, url: 'http://localhost:3000' }]
        activeId = id
      }
      syncPreviewToProject(next, tabs, activeId)
      return { previewOpen: next, previewTabs: tabs, activePreviewTabId: activeId }
    }),

  addPreviewTab: (url) =>
    set((state) => {
      const id = uid()
      const newTab: BrowserTab = { id, url: url ?? 'http://localhost:3000' }
      const tabs = [...state.previewTabs, newTab]
      syncPreviewToProject(state.previewOpen, tabs, id)
      return { previewTabs: tabs, activePreviewTabId: id }
    }),

  closePreviewTab: (tabId) =>
    set((state) => {
      const idx = state.previewTabs.findIndex((t) => t.id === tabId)
      if (idx === -1) return state
      const tabs = state.previewTabs.filter((t) => t.id !== tabId)
      if (tabs.length === 0) {
        syncPreviewToProject(false, tabs, '')
        return { previewOpen: false, previewTabs: tabs, activePreviewTabId: '' }
      }
      let activeId = state.activePreviewTabId
      if (activeId === tabId) {
        activeId = tabs[Math.min(idx, tabs.length - 1)].id
      }
      syncPreviewToProject(state.previewOpen, tabs, activeId)
      return { previewTabs: tabs, activePreviewTabId: activeId }
    }),

  setActivePreviewTab: (tabId) =>
    set((state) => {
      syncPreviewToProject(state.previewOpen, state.previewTabs, tabId)
      return { activePreviewTabId: tabId }
    }),

  setPreviewTabUrl: (tabId, url) =>
    set((state) => {
      const tabs = state.previewTabs.map((t) => (t.id === tabId ? { ...t, url } : t))
      syncPreviewToProject(state.previewOpen, tabs, state.activePreviewTabId)
      return { previewTabs: tabs }
    }),

  setPreviewWidth: (w) => set({ previewWidth: w }),

  setPreviewState: (open, tabs, activeTabId) =>
    set({ previewOpen: open, previewTabs: tabs, activePreviewTabId: activeTabId }),

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
    const validFilters = ['all', 'unanswered', 'working', 'unread']
    if (typeof data.conversationFilter === 'string' && validFilters.includes(data.conversationFilter)) {
      patch.conversationFilter = data.conversationFilter as UIState['conversationFilter']
    }
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
      gitPanelCollapsed: state.gitPanelCollapsed,
      conversationFilter: state.conversationFilter
    })
  }, 500)
})
