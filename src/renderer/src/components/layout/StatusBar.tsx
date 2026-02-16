import { Activity } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import type { ConversationStatus } from '../../types'

export function StatusBar() {
  const projects = useProjectStore((s) => s.projects)

  const allConversations = projects.flatMap((p) => p.conversations)

  const counts = allConversations.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    },
    {} as Record<ConversationStatus, number>
  )

  return (
    <div className="flex h-[var(--spacing-statusbar)] items-center border-t border-border-default bg-surface-1 px-3 text-[11px]">
      <div className="flex items-center gap-3">
        <Activity size={12} className="text-accent" />
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-text-secondary">{counts.running || 0} running</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          <span className="text-text-secondary">{counts.waiting || 0} waiting</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-text-secondary" />
          <span className="text-text-secondary">{counts.idle || 0} idle</span>
        </span>
        {(counts.error || 0) > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-error" />
            <span className="text-error">{counts.error} error</span>
          </span>
        )}
      </div>
    </div>
  )
}
