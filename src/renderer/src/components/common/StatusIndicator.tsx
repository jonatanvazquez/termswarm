import type { ConversationStatus } from '../../types'

const statusColors: Record<ConversationStatus, string> = {
  running: 'bg-success',
  waiting: 'bg-warning',
  idle: 'bg-text-secondary',
  error: 'bg-error'
}

const statusPulse: Record<ConversationStatus, boolean> = {
  running: true,
  waiting: true,
  idle: false,
  error: false
}

export function StatusIndicator({ status }: { status: ConversationStatus }) {
  const color = statusColors[status]
  const pulse = statusPulse[status]

  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${color}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  )
}
