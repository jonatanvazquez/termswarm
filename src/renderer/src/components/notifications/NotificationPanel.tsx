import { X, CheckCheck } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { NotificationItem } from './NotificationItem'
import { IconButton } from '../common/IconButton'

export function NotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications)
  const togglePanel = useNotificationStore((s) => s.togglePanel)
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  return (
    <div className="absolute bottom-0 right-0 top-0 z-10 flex w-80 flex-col border-l border-border-default bg-surface-1 shadow-xl">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <span className="text-xs font-semibold text-text-primary">Notifications</span>
        <div className="flex gap-1">
          <IconButton tooltip="Mark all read" onClick={markAllRead}>
            <CheckCheck size={14} />
          </IconButton>
          <IconButton tooltip="Close" onClick={togglePanel}>
            <X size={14} />
          </IconButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-text-secondary">
            No notifications
          </div>
        ) : (
          <div className="flex flex-col gap-px p-1">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
