import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  addingProject: boolean
  addingConversationInProject: string | null
  previewOpen: boolean
  previewUrl: string
  previewWidth: number
  toggleSidebar: () => void
  setSidebarWidth: (w: number) => void
  startAddingProject: () => void
  stopAddingProject: () => void
  startAddingConversation: (projectId: string) => void
  stopAddingConversation: () => void
  togglePreview: () => void
  setPreviewUrl: (url: string) => void
  setPreviewWidth: (w: number) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  sidebarWidth: 260,
  addingProject: false,
  addingConversationInProject: null,
  previewOpen: false,
  previewUrl: 'http://localhost:3000',
  previewWidth: 500,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  startAddingProject: () => set({ addingProject: true }),
  stopAddingProject: () => set({ addingProject: false }),
  startAddingConversation: (projectId) => set({ addingConversationInProject: projectId }),
  stopAddingConversation: () => set({ addingConversationInProject: null }),
  togglePreview: () => set((state) => ({ previewOpen: !state.previewOpen })),
  setPreviewUrl: (url) => set({ previewUrl: url }),
  setPreviewWidth: (w) => set({ previewWidth: w })
}))
