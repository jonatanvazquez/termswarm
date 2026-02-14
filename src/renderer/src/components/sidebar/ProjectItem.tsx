import { useState } from 'react'
import { ChevronRight, FolderOpen, Folder, Plus, Archive } from 'lucide-react'
import type { Project } from '../../types'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { useConversationStore } from '../../store/conversationStore'
import { ConversationItem } from './ConversationItem'
import { InlineInput } from '../common/InlineInput'

interface ProjectItemProps {
  project: Project
}

export function ProjectItem({ project }: ProjectItemProps) {
  const expandedIds = useProjectStore((s) => s.expandedProjectIds)
  const toggleExpanded = useProjectStore((s) => s.toggleProjectExpanded)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const addConversation = useProjectStore((s) => s.addConversation)
  const renameProject = useProjectStore((s) => s.renameProject)
  const showArchived = useProjectStore((s) => s.showArchived)
  const openTab = useConversationStore((s) => s.openTab)
  const addingInProject = useUIStore((s) => s.addingConversationInProject)
  const startAdding = useUIStore((s) => s.startAddingConversation)
  const stopAdding = useUIStore((s) => s.stopAddingConversation)

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(project.name)

  const isExpanded = expandedIds.has(project.id)
  const isActive = activeProjectId === project.id
  const isAdding = addingInProject === project.id

  const activeConversations = project.conversations.filter((c) => !c.archived)
  const archivedConversations = project.conversations.filter((c) => c.archived)
  const runningCount = activeConversations.filter((c) => c.status === 'running').length
  const unreadCount = activeConversations.filter((c) => c.unread && c.status !== 'running').length

  const handleClick = () => {
    if (isActive) {
      toggleExpanded(project.id)
    } else {
      setActiveProject(project.id)
      if (!isExpanded) toggleExpanded(project.id)
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(project.name)
    setEditing(true)
  }

  const handleRenameSubmit = () => {
    if (editValue.trim() && editValue.trim() !== project.name) {
      renameProject(project.id, editValue.trim())
    }
    setEditing(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setEditing(false)
  }

  const handleAddConversation = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isExpanded) toggleExpanded(project.id)
    setActiveProject(project.id)
    startAdding(project.id)
  }

  const handleSubmitConversation = (name: string) => {
    addConversation(project.id, name)
    stopAdding()
    setTimeout(() => {
      const updated = useProjectStore.getState().projects.find((p) => p.id === project.id)
      const lastConv = updated?.conversations[updated.conversations.length - 1]
      if (lastConv) openTab(lastConv.id, project.id)
    }, 0)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className={`group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
          isActive
            ? 'bg-surface-2 text-text-primary'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
        }`}
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-text-secondary transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        />
        {isExpanded ? (
          <FolderOpen size={14} style={{ color: project.color }} className="shrink-0" />
        ) : (
          <Folder size={14} style={{ color: project.color }} className="shrink-0" />
        )}
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 rounded border border-accent bg-surface-0 px-1 py-0.5 text-xs font-medium text-text-primary outline-none"
          />
        ) : (
          <span className="truncate font-medium">{project.name}</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <span
            onClick={handleAddConversation}
            title="New conversation"
            className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
          >
            <Plus size={12} />
          </span>
          {unreadCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 px-1 text-[10px] font-medium text-warning">
              {unreadCount}
            </span>
          )}
          {runningCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-success/20 px-1 text-[10px] font-medium text-success">
              {runningCount}
            </span>
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border-default pl-2">
          {activeConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
          {isAdding && (
            <div className="py-0.5">
              <InlineInput
                placeholder="Conversation name..."
                onSubmit={handleSubmitConversation}
                onCancel={stopAdding}
              />
            </div>
          )}
          {showArchived && archivedConversations.length > 0 && (
            <div className="mt-1">
              <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary">
                <Archive size={9} />
                <span>Archived ({archivedConversations.length})</span>
              </div>
              {archivedConversations.map((conv) => (
                <ConversationItem key={conv.id} conversation={conv} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
