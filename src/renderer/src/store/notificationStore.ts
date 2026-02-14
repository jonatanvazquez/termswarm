import { create } from 'zustand'
import type { Notification } from '../types'
import { mockNotifications } from '../data/mockData'

interface NotificationState {
  notifications: Notification[]
  panelOpen: boolean
  togglePanel: () => void
  markAsRead: (id: string) => void
  markAllRead: () => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: mockNotifications,
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
  unreadCount: () => get().notifications.filter((n) => !n.read).length
}))
