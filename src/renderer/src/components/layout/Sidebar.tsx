import { useUIStore } from '../../store/uiStore'
import { SidebarActions } from '../sidebar/SidebarActions'
import { ProjectList } from '../sidebar/ProjectList'

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const width = useUIStore((s) => s.sidebarWidth)

  if (collapsed) return null

  return (
    <div
      className="flex flex-col border-r border-border-default bg-surface-1"
      style={{ width }}
    >
      <SidebarActions />
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <ProjectList />
      </div>
    </div>
  )
}
