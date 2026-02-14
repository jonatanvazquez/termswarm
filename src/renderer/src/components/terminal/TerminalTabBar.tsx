import { Plus, Eye, EyeOff } from 'lucide-react'
import { useConversationStore } from '../../store/conversationStore'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { TerminalTab } from './TerminalTab'
import { IconButton } from '../common/IconButton'

export function TerminalTabBar() {
  const tabs = useConversationStore((s) => s.tabs)
  const activeTabId = useConversationStore((s) => s.activeTabId)
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const startAdding = useUIStore((s) => s.startAddingConversation)
  const previewOpen = useUIStore((s) => s.previewOpen)
  const togglePreview = useUIStore((s) => s.togglePreview)

  const getConversation = (convId: string) => {
    for (const p of projects) {
      const c = p.conversations.find((c) => c.id === convId)
      if (c) return { conversation: c, project: p }
    }
    return null
  }

  const handleNewConversation = () => {
    if (!activeProjectId) return
    startAdding(activeProjectId)
  }

  return (
    <div className="flex h-[var(--spacing-tabbar)] items-stretch border-b border-border-default bg-surface-1">
      <div className="flex flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const data = getConversation(tab.conversationId)
          if (!data) return null
          return (
            <div key={tab.conversationId} className="relative flex">
              <TerminalTab
                conversationId={tab.conversationId}
                name={data.conversation.name}
                status={data.conversation.status}
                isActive={activeTabId === tab.conversationId}
                projectColor={data.project.color}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-0.5 border-l border-border-default px-2">
        <IconButton
          tooltip={previewOpen ? 'Hide preview' : 'Show preview'}
          onClick={togglePreview}
          className={previewOpen ? 'text-accent' : ''}
        >
          {previewOpen ? <EyeOff size={14} /> : <Eye size={14} />}
        </IconButton>
        <IconButton tooltip="New conversation" onClick={handleNewConversation}>
          <Plus size={14} />
        </IconButton>
      </div>
    </div>
  )
}
