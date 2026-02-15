import { useEffect } from 'react'
import { useTerminalStore } from '../store/terminalStore'
import { useProjectStore } from '../store/projectStore'
import { useNotificationStore } from '../store/notificationStore'
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
      useProjectStore.getState().setConversationStatus(sessionId, status)

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
