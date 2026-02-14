import { Terminal } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'

export function TitleBar() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  return (
    <div
      className="drag-region flex h-[var(--spacing-titlebar)] items-center border-b border-border-default bg-surface-1 px-20"
    >
      <div className="flex items-center gap-2">
        <Terminal size={14} className="text-accent" />
        <span className="text-xs font-medium text-text-primary">TermSwarm</span>
        {activeProject && (
          <>
            <span className="text-text-secondary">—</span>
            <span className="text-xs text-text-secondary">{activeProject.name}</span>
          </>
        )}
      </div>
    </div>
  )
}
