import { PanelLeft, SquareTerminal, Globe } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { IconButton } from '../common/IconButton'
import { TermSwarmLogo } from '../common/TermSwarmLogo'

export function TitleBar() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const terminalHidden = useUIStore((s) => s.terminalHidden)
  const toggleTerminal = useUIStore((s) => s.toggleTerminal)
  const previewOpen = useUIStore((s) => s.previewOpen)
  const togglePreview = useUIStore((s) => s.togglePreview)

  return (
    <div
      className="drag-region relative flex h-[var(--spacing-titlebar)] items-center border-b border-border-default bg-surface-1"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2">
        <TermSwarmLogo size={14} />
        <span className="text-xs font-medium text-text-primary">TermSwarm</span>
        {activeProject && (
          <>
            <span className="text-text-secondary">—</span>
            <span className="text-xs text-text-secondary">{activeProject.name}</span>
          </>
        )}
      </div>
      <div className="no-drag ml-auto mr-3 flex items-center gap-1">
        <IconButton
          tooltip={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onClick={toggleSidebar}
          className={sidebarCollapsed ? '' : 'text-accent'}
        >
          <PanelLeft size={14} />
        </IconButton>
        <IconButton
          tooltip={terminalHidden ? 'Show terminal' : 'Hide terminal'}
          onClick={toggleTerminal}
          className={terminalHidden ? '' : 'text-accent'}
        >
          <SquareTerminal size={14} />
        </IconButton>
        <IconButton
          tooltip={previewOpen ? 'Hide preview' : 'Show preview'}
          onClick={togglePreview}
          className={previewOpen ? 'text-accent' : ''}
        >
          <Globe size={14} />
        </IconButton>
      </div>
    </div>
  )
}
