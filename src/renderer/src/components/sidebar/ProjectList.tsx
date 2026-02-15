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
  const stopAdding = useUIStore((s) => s.stopAddingProject)

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

  return (
    <div className="flex flex-col gap-0.5">
      {projects.map((project) => (
        <ProjectItem key={project.id} project={project} />
      ))}
      {adding && (
        <NewProjectForm onSubmit={handleSubmit} onCancel={stopAdding} />
      )}
    </div>
  )
}
