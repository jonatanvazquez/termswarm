import { create } from 'zustand'
import type { Tab } from '../types'
import { useTerminalStore } from './terminalStore'
import { useProjectStore } from './projectStore'

// Module-level flag — not reactive, read synchronously in useState initializers.
// Split into check (non-destructive, safe for StrictMode double-invoke) and clear.
let _pendingRenameTabId: string | null = null

export function setPendingRenameForNewTab(id: string): void {
  _pendingRenameTabId = id
}

export function checkPendingRename(id: string): boolean {
  return _pendingRenameTabId === id
}

export function clearPendingRename(): void {
  _pendingRenameTabId = null
}

interface ConversationState {
  tabs: Tab[]
  activeTabId: string | null
  openTab: (conversationId: string, projectId: string) => void
  closeTab: (conversationId: string) => void
  setActiveTab: (conversationId: string) => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  tabs: [],
  activeTabId: null,
  openTab: (conversationId, projectId) =>
    set((state) => {
      console.log('[ConvStore] openTab:', conversationId, 'project:', projectId)

      // Switch active project if needed (saves/loads preview state)
      const projectStore = useProjectStore.getState()
      if (projectStore.activeProjectId !== projectId) {
        console.log('[ConvStore] switching active project to:', projectId)
        projectStore.setActiveProject(projectId)
      }

      const exists = state.tabs.find((t) => t.conversationId === conversationId)
      if (exists) {
        console.log('[ConvStore] tab already exists, just activating')
        return { activeTabId: conversationId }
      }

      // Find the project and conversation to determine spawn mode
      const project = projectStore.projects.find((p) => p.id === projectId)
      if (project) {
        const conversation = project.conversations.find((c) => c.id === conversationId)
        const mode = conversation?.type || 'claude'
        const args: string[] = []

        if (mode === 'claude' && conversation?.claudeSessionId) {
          if (conversation.status === 'idle' || conversation.status === 'waiting') {
            args.push('--resume', conversation.claudeSessionId)
          } else {
            args.push('--session-id', conversation.claudeSessionId)
          }
        }

        console.log('[ConvStore] spawning PTY:', {
          sessionId: conversationId,
          cwd: project.path,
          mode,
          type: conversation?.type,
          status: conversation?.status,
          claudeSessionId: conversation?.claudeSessionId,
          args
        })

        window.api.ptySpawn(conversationId, project.path, args, mode).catch((err) => {
          console.error('Failed to spawn PTY:', err)
        })
      } else {
        console.error('[ConvStore] project not found:', projectId)
      }

      return {
        tabs: [...state.tabs, { conversationId, projectId }],
        activeTabId: conversationId
      }
    }),
  closeTab: (conversationId) =>
    set((state) => {
      console.log('[ConvStore] closeTab:', conversationId)
      // Save terminal buffer before killing so it can be restored on reopen
      const { serializeBuffer, setPendingContent, disposeInstance } = useTerminalStore.getState()
      const content = serializeBuffer(conversationId)
      console.log('[ConvStore] closeTab serialized buffer:', content.length, 'chars, first 200:', JSON.stringify(content.slice(0, 200)))
      if (content) {
        setPendingContent(conversationId, content)
        console.log('[ConvStore] closeTab setPendingContent OK')
      } else {
        console.warn('[ConvStore] closeTab: NO content to save!')
      }

      // Kill PTY + dispose terminal instance
      window.api.ptyKill(conversationId).catch(() => {})
      disposeInstance(conversationId)

      const idx = state.tabs.findIndex((t) => t.conversationId === conversationId)
      const next = state.tabs.filter((t) => t.conversationId !== conversationId)
      let nextActive = state.activeTabId
      if (state.activeTabId === conversationId) {
        const newIdx = Math.min(idx, next.length - 1)
        nextActive = next[newIdx]?.conversationId ?? null
      }
      return { tabs: next, activeTabId: nextActive }
    }),
  setActiveTab: (conversationId) =>
    set((state) => {
      console.log('[ConvStore] setActiveTab:', conversationId, 'prev:', state.activeTabId)
      // Switch active project if the tab belongs to a different project
      const tab = state.tabs.find((t) => t.conversationId === conversationId)
      if (tab) {
        const projectStore = useProjectStore.getState()
        if (projectStore.activeProjectId !== tab.projectId) {
          console.log('[ConvStore] setActiveTab switching project to:', tab.projectId)
          projectStore.setActiveProject(tab.projectId)
        }
      }
      useProjectStore.getState().markConversationRead(conversationId)
      return { activeTabId: conversationId }
    })
}))
