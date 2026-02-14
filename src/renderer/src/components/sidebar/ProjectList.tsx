import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { ProjectItem } from './ProjectItem'
import { NewProjectForm } from './NewProjectForm'

export function ProjectList() {
  const projects = useProjectStore((s) => s.projects)
  const addProject = useProjectStore((s) => s.addProject)
  const adding = useUIStore((s) => s.addingProject)
  const stopAdding = useUIStore((s) => s.stopAddingProject)

  const handleSubmit = (name: string, path: string, color: string) => {
    addProject(name, path, color)
    stopAdding()
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
