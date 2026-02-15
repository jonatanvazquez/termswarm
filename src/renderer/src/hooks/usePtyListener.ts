import { useEffect } from 'react'
import { useTerminalStore } from '../store/terminalStore'
import { useProjectStore } from '../store/projectStore'
import { useNotificationStore } from '../store/notificationStore'
import { useConversationStore } from '../store/conversationStore'
import { useUIStore } from '../store/uiStore'
import type { ConversationStatus } from '../../../shared/types'

export function usePtyListener(): void {
  useEffect(() => {
    const cleanupData = window.api.onPtyData((sessionId, data) => {
      const terminal = useTerminalStore.getState().getTerminal(sessionId)
      if (!terminal) {
        console.warn('[PtyListener] onData: no terminal for', sessionId)
      }
      terminal?.write(data)
    })

    const cleanupExit = window.api.onPtyExit((sessionId, exitCode) => {
      console.log('[PtyListener] onExit:', sessionId, 'code:', exitCode)
      const status: ConversationStatus = exitCode === 0 ? 'idle' : 'error'
      useProjectStore.getState().setConversationStatus(sessionId, status)

      if (status === 'error') {
        generateNotification(sessionId, status, `Process exited with code ${exitCode}`)
      }
    })

    const cleanupStatus = window.api.onPtyStatus((sessionId, status) => {
      console.log('[PtyListener] onStatus:', sessionId, '->', status)

      // Read previous status from the store (before any update)
      const { projects, markConversationUnread } = useProjectStore.getState()
      let previousStatus: ConversationStatus | undefined
      for (const p of projects) {
        const c = p.conversations.find((c) => c.id === sessionId)
        if (c) {
          previousStatus = c.status
          break
        }
      }

      // Commit the status change (main process already gates waiting→running behind Enter)
      useProjectStore.getState().setConversationStatus(sessionId, status)

      // Auto-advance for unanswered filter when a real submission starts processing
      if (previousStatus === 'waiting' && status === 'running') {
        const { conversationFilter } = useUIStore.getState()
        if (conversationFilter === 'unanswered') {
          const freshProjects = useProjectStore.getState().projects
          let nextId: string | null = null
          let nextProjectId: string | null = null
          for (const p of freshProjects) {
            for (const c of p.conversations) {
              if (!c.archived && c.status === 'waiting' && c.id !== sessionId) {
                nextId = c.id
                nextProjectId = p.id
                break
              }
            }
            if (nextId) break
          }
          if (nextId && nextProjectId) {
            useConversationStore.getState().openTab(nextId, nextProjectId)
          }
        }
      }

      // Mark as unread if transitioning from running to waiting and user is not viewing it
      if (previousStatus === 'running' && status === 'waiting') {
        const activeTabId = useConversationStore.getState().activeTabId
        if (activeTabId !== sessionId) {
          markConversationUnread(sessionId)
        }
      }

      if (status === 'waiting') {
        generateNotification(sessionId, status, 'Waiting for input')
      } else if (status === 'error') {
        generateNotification(sessionId, status, 'Process encountered an error')
      }
    })

    const cleanupMemory = window.api.onPtyMemory
      ? window.api.onPtyMemory((stats) => {
          useTerminalStore.getState().setMemoryStats(stats)
        })
      : undefined

    return () => {
      cleanupData()
      cleanupExit()
      cleanupStatus()
      cleanupMemory?.()
    }
  }, [])
}

function generateNotification(
  conversationId: string,
  status: ConversationStatus,
  message: string
): void {
  const { projects } = useProjectStore.getState()
  let projectName = ''
  let conversationName = ''

  for (const p of projects) {
    const c = p.conversations.find((c) => c.id === conversationId)
    if (c) {
      projectName = p.name
      conversationName = c.name
      break
    }
  }

  const type = status === 'error' ? 'error' : status === 'waiting' ? 'warning' : 'info'
  useNotificationStore.getState().addNotification({
    conversationId,
    projectName,
    conversationName,
    message,
    type
  })
}
