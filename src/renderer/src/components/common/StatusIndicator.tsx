import { Loader2, Check, AlertCircle, Pause } from 'lucide-react'
import type { ConversationStatus } from '../../types'

export function StatusIndicator({ status }: { status: ConversationStatus }) {
  return (
    <span className="flex h-3 w-3 shrink-0 items-center justify-center">
      {status === 'running' && (
        <Loader2 size={12} className="animate-spin text-success" />
      )}
      {status === 'idle' && <Check size={12} className="text-success" />}
      {status === 'error' && <AlertCircle size={12} className="text-error" />}
      {status === 'waiting' && (
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-40" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
        </span>
      )}
      {status === 'paused' && <Pause size={12} className="text-text-secondary" />}
    </span>
  )
}
