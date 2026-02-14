import { X } from 'lucide-react'
import type { ConversationStatus } from '../../types'
import { StatusIndicator } from '../common/StatusIndicator'
import { useConversationStore } from '../../store/conversationStore'

interface TerminalTabProps {
  conversationId: string
  name: string
  status: ConversationStatus
  isActive: boolean
  projectColor: string
}

export function TerminalTab({ conversationId, name, status, isActive, projectColor }: TerminalTabProps) {
  const setActiveTab = useConversationStore((s) => s.setActiveTab)
  const closeTab = useConversationStore((s) => s.closeTab)

  return (
    <button
      onClick={() => setActiveTab(conversationId)}
      className={`group flex h-full items-center gap-2 border-r border-border-default px-3 text-xs transition-colors ${
        isActive
          ? 'bg-surface-2 text-text-primary'
          : 'bg-surface-1 text-text-secondary hover:bg-surface-2 hover:text-text-primary'
      }`}
    >
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ backgroundColor: projectColor }}
        />
      )}
      <StatusIndicator status={status} />
      <span className="max-w-[140px] truncate">{name}</span>
      <span
        onClick={(e) => {
          e.stopPropagation()
          closeTab(conversationId)
        }}
        className="ml-1 flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
      >
        <X size={10} />
      </span>
    </button>
  )
}
