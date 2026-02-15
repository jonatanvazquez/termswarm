import { Plus, Settings, Archive } from 'lucide-react'
import { IconButton } from '../common/IconButton'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSettingsStore } from '../../store/settingsStore'

export function SidebarActions() {
  const startAddingProject = useUIStore((s) => s.startAddingProject)
  const conversationFilter = useUIStore((s) => s.conversationFilter)
  const setConversationFilter = useUIStore((s) => s.setConversationFilter)
  const showArchived = useProjectStore((s) => s.showArchived)
  const toggleShowArchived = useProjectStore((s) => s.toggleShowArchived)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  const filters = ['all', 'unanswered', 'working', 'unread'] as const

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
          Projects
        </span>
        <div className="flex gap-0.5">
          <IconButton
            tooltip={showArchived ? 'Hide archived' : 'Show archived'}
            onClick={toggleShowArchived}
            className={showArchived ? 'text-accent' : ''}
          >
            <Archive size={14} />
          </IconButton>
          <IconButton tooltip="New project" onClick={startAddingProject}>
            <Plus size={14} />
          </IconButton>
          <IconButton tooltip="Settings" onClick={toggleSettings}>
            <Settings size={14} />
          </IconButton>
        </div>
      </div>
      <div className="flex rounded bg-surface-2 p-0.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setConversationFilter(f)}
            className={`flex-1 rounded px-1.5 py-0.5 text-[10px] font-medium capitalize transition-colors ${
              conversationFilter === f
                ? 'bg-surface-3 text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unanswered' ? 'Pending' : f === 'working' ? 'Working' : 'Unread'}
          </button>
        ))}
      </div>
    </div>
  )
}
