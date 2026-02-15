import { Plus, Settings, Archive } from 'lucide-react'
import { IconButton } from '../common/IconButton'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useSettingsStore } from '../../store/settingsStore'

export function SidebarActions() {
  const startAddingProject = useUIStore((s) => s.startAddingProject)
  const showArchived = useProjectStore((s) => s.showArchived)
  const toggleShowArchived = useProjectStore((s) => s.toggleShowArchived)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div className="flex items-center justify-between px-3 py-2">
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
  )
}
