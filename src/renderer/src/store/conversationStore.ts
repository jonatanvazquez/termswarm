import { create } from 'zustand'
import type { Tab } from '../types'

interface ConversationState {
  tabs: Tab[]
  activeTabId: string | null
  openTab: (conversationId: string, projectId: string) => void
  closeTab: (conversationId: string) => void
  setActiveTab: (conversationId: string) => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  tabs: [{ conversationId: 'conv-gc-1', projectId: 'proj-goclaw' }],
  activeTabId: 'conv-gc-1',
  openTab: (conversationId, projectId) =>
    set((state) => {
      const exists = state.tabs.find((t) => t.conversationId === conversationId)
      if (exists) {
        return { activeTabId: conversationId }
      }
      return {
        tabs: [...state.tabs, { conversationId, projectId }],
        activeTabId: conversationId
      }
    }),
  closeTab: (conversationId) =>
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.conversationId === conversationId)
      const next = state.tabs.filter((t) => t.conversationId !== conversationId)
      let nextActive = state.activeTabId
      if (state.activeTabId === conversationId) {
        const newIdx = Math.min(idx, next.length - 1)
        nextActive = next[newIdx]?.conversationId ?? null
      }
      return { tabs: next, activeTabId: nextActive }
    }),
  setActiveTab: (conversationId) => set({ activeTabId: conversationId })
}))
