import { create } from 'zustand'
import type { Notification } from '../types'

let notifCounter = 0

interface NotificationState {
  notifications: Notification[]
  panelOpen: boolean
  togglePanel: () => void
  markAsRead: (id: string) => void
  markAllRead: () => void
  unreadCount: () => number
  addNotification: (opts: {
    conversationId: string
    projectName: string
    conversationName: string
    message: string
    type: Notification['type']
  }) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  panelOpen: false,
  togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  addNotification: (opts) =>
    set((state) => ({
      notifications: [
        {
          id: `notif-${++notifCounter}`,
          ...opts,
          read: false,
          timestamp: new Date().toISOString()
        },
        ...state.notifications
      ]
    }))
}))
