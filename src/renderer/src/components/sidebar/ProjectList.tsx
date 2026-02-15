import { FolderPlus } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { useConversationStore } from '../../store/conversationStore'
import { ProjectItem } from './ProjectItem'
import { NewProjectForm } from './NewProjectForm'

export function ProjectList() {
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)
  const addConversation = useProjectStore((s) => s.addConversation)
  const openTab = useConversationStore((s) => s.openTab)
  const adding = useUIStore((s) => s.addingProject)
  const startAdding = useUIStore((s) => s.startAddingProject)
  const stopAdding = useUIStore((s) => s.stopAddingProject)
  const conversationFilter = useUIStore((s) => s.conversationFilter)

  const handleSubmit = (name: string, path: string, color: string) => {
    addProject(name, path, color)
    stopAdding()

    // Auto-create first conversation and open it
    setTimeout(() => {
      const state = useProjectStore.getState()
      const newProject = state.projects[state.projects.length - 1]
      if (newProject) {
        addConversation(newProject.id, 'Session 1')
        setTimeout(() => {
          const updated = useProjectStore.getState().projects.find((p) => p.id === newProject.id)
          const conv = updated?.conversations[0]
          if (conv) openTab(conv.id, newProject.id)
        }, 0)
      }
    }, 0)
  }

  if (projects.length === 0 && !adding) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3">
          <FolderPlus size={20} className="text-text-secondary" />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-primary">No projects yet</span>
          <span className="text-[11px] leading-relaxed text-text-secondary">
            Add your first project to start managing terminals and Claude sessions.
          </span>
        </div>
        <button
          onClick={startAdding}
          className="mt-1 rounded-md bg-accent/15 px-3 py-1.5 text-[11px] font-medium text-accent transition-colors hover:bg-accent/25"
        >
          Add project
        </button>
      </div>
    )
  }

  const visibleProjects =
    conversationFilter === 'unanswered'
      ? projects.filter((p) =>
          p.conversations.some((c) => !c.archived && c.status === 'waiting')
        )
      : conversationFilter === 'working'
        ? projects.filter((p) =>
            p.conversations.some((c) => !c.archived && c.status === 'running')
          )
        : conversationFilter === 'unread'
          ? projects.filter((p) =>
              p.conversations.some((c) => !c.archived && c.unread && c.status !== 'running')
            )
          : projects

  const emptyMessages: Record<string, string> = {
    unanswered: 'No pending conversations',
    working: 'No working conversations',
    unread: 'No unread conversations'
  }
  const emptyMessage = emptyMessages[conversationFilter] ?? null

  return (
    <div className="flex flex-col gap-0.5">
      {visibleProjects.map((project) => (
        <ProjectItem key={project.id} project={project} />
      ))}
      {emptyMessage && visibleProjects.length === 0 && projects.length > 0 && (
        <div className="px-4 py-6 text-center text-[11px] text-text-secondary">
          {emptyMessage}
        </div>
      )}
      {adding && (
        <NewProjectForm onSubmit={handleSubmit} onCancel={stopAdding} />
      )}
    </div>
  )
}
