import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import type { Notification } from '../../types'
import { useNotificationStore } from '../../store/notificationStore'
import { useConversationStore } from '../../store/conversationStore'

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle
}

const iconColors = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error'
}

export function NotificationItem({ notification }: { notification: Notification }) {
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const openTab = useConversationStore((s) => s.openTab)
  const Icon = icons[notification.type]

  const handleClick = () => {
    markAsRead(notification.id)
    // Find projectId from conversation - for now just open the tab
    openTab(notification.conversationId, '')
  }

  const timeAgo = getTimeAgo(notification.timestamp)

  return (
    <button
      onClick={handleClick}
      className={`flex w-full gap-2.5 rounded px-3 py-2.5 text-left transition-colors hover:bg-surface-3 ${
        notification.read ? 'opacity-60' : ''
      }`}
    >
      <Icon size={14} className={`mt-0.5 shrink-0 ${iconColors[notification.type]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium text-text-primary">
            {notification.projectName}
          </span>
          <span className="shrink-0 text-[10px] text-text-secondary">{timeAgo}</span>
        </div>
        <p className="truncate text-[11px] text-text-secondary">
          {notification.conversationName}
        </p>
        <p className="mt-0.5 text-xs text-text-primary">{notification.message}</p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      )}
    </button>
  )
}

function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
