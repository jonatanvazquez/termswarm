import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronRight,
  FolderOpen,
  Folder,
  Plus,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  X,
  Terminal,
  Sparkles
} from 'lucide-react'
import type { Project, ConversationType } from '../../types'
import { useProjectStore } from '../../store/projectStore'
import { useConversationStore, setPendingRenameForNewTab } from '../../store/conversationStore'
import { useUIStore } from '../../store/uiStore'
import { ConversationItem } from './ConversationItem'

interface ProjectItemProps {
  project: Project
  isArchived?: boolean
  forceExpanded?: boolean
}

export function ProjectItem({ project, isArchived, forceExpanded }: ProjectItemProps) {
  const expandedIds = useProjectStore((s) => s.expandedProjectIds)
  const toggleExpanded = useProjectStore((s) => s.toggleProjectExpanded)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const addConversation = useProjectStore((s) => s.addConversation)
  const renameProject = useProjectStore((s) => s.renameProject)
  const deleteProject = useProjectStore((s) => s.deleteProject)
  const archiveProject = useProjectStore((s) => s.archiveProject)
  const unarchiveProject = useProjectStore((s) => s.unarchiveProject)
  const showArchived = useProjectStore((s) => s.showArchived)
  const openTab = useConversationStore((s) => s.openTab)
  const closeTab = useConversationStore((s) => s.closeTab)
  const conversationFilter = useUIStore((s) => s.conversationFilter)

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(project.name)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const plusRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isExpanded = forceExpanded || expandedIds.has(project.id)
  const isActive = activeProjectId === project.id

  const activeConversations = project.conversations.filter((c) => !c.archived)
  const archivedConversations = project.conversations.filter((c) => c.archived)
  const waitingCount = activeConversations.filter((c) => c.status === 'waiting').length
  const unreadCount = activeConversations.filter((c) => c.unread && c.status !== 'running').length
  const visibleConversations = isArchived
    ? []
    : conversationFilter === 'unanswered'
      ? activeConversations
          .filter((c) => c.status === 'waiting')
          .sort((a, b) => (a.waitingSince ?? '').localeCompare(b.waitingSince ?? ''))
      : conversationFilter === 'working'
        ? activeConversations.filter((c) => c.status === 'running')
        : conversationFilter === 'unread'
          ? activeConversations.filter((c) => c.unread && c.status !== 'running')
          : activeConversations

  // Close menu on click outside
  useEffect(() => {
    if (!showNewMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNewMenu])

  const handleClick = () => {
    if (confirmingDelete || confirmingArchive) return
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

  const handlePlusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (plusRef.current) {
      const rect = plusRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setShowNewMenu(true)
  }

  const createSession = (type: ConversationType) => {
    setShowNewMenu(false)
    if (!isExpanded) toggleExpanded(project.id)
    setActiveProject(project.id)

    const count = project.conversations.length + 1
    const name = type === 'terminal' ? `Terminal ${count}` : `Session ${count}`
    addConversation(project.id, name, type)

    // Zustand set() is synchronous — the new ID is available immediately
    const updated = useProjectStore.getState().projects.find((p) => p.id === project.id)
    const lastConv = updated?.conversations[updated.conversations.length - 1]
    if (lastConv) {
      // Set BEFORE React re-renders the new ConversationItem
      setPendingRenameForNewTab(lastConv.id)
      setTimeout(() => openTab(lastConv.id, project.id), 0)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingDelete(true)
  }

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    for (const conv of project.conversations) {
      closeTab(conv.id)
    }
    deleteProject(project.id)
    setConfirmingDelete(false)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingDelete(false)
  }

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isArchived) {
      unarchiveProject(project.id)
    } else {
      setConfirmingArchive(true)
    }
  }

  const handleConfirmArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    archiveProject(project.id)
    setConfirmingArchive(false)
  }

  const handleCancelArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirmingArchive(false)
  }

  if (confirmingDelete) {
    const count = project.conversations.length
    return (
      <div className="flex items-center justify-between rounded bg-error/10 px-2 py-1.5 text-xs">
        <span className="text-error">
          Delete {project.name}? ({count} {count === 1 ? 'session' : 'sessions'})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirmDelete}
            className="flex h-5 items-center gap-1 rounded bg-error px-1.5 text-[10px] font-medium text-white hover:bg-error/80"
          >
            <Check size={10} />
            Yes
          </button>
          <button
            onClick={handleCancelDelete}
            className="flex h-5 items-center gap-1 rounded bg-surface-3 px-1.5 text-[10px] font-medium text-text-secondary hover:bg-surface-2"
          >
            <X size={10} />
            No
          </button>
        </div>
      </div>
    )
  }

  if (confirmingArchive) {
    const count = project.conversations.length
    return (
      <div className="flex items-center justify-between rounded bg-warning/10 px-2 py-1.5 text-xs">
        <span className="text-warning">
          Archive {project.name}? ({count} {count === 1 ? 'session' : 'sessions'})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirmArchive}
            className="flex h-5 items-center gap-1 rounded bg-warning px-1.5 text-[10px] font-medium text-white hover:bg-warning/80"
          >
            <Check size={10} />
            Yes
          </button>
          <button
            onClick={handleCancelArchive}
            className="flex h-5 items-center gap-1 rounded bg-surface-3 px-1.5 text-[10px] font-medium text-text-secondary hover:bg-surface-2"
          >
            <X size={10} />
            No
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={isArchived ? 'opacity-50' : ''}>
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
          {!isArchived && (
            <span
              ref={plusRef}
              onClick={handlePlusClick}
              title="New session"
              className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
            >
              <Plus size={12} />
            </span>
          )}
          <span
            onClick={handleArchiveClick}
            title={isArchived ? 'Unarchive project' : 'Archive project'}
            className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
          >
            {isArchived ? <ArchiveRestore size={10} /> : <Archive size={10} />}
          </span>
          <span
            onClick={handleDeleteClick}
            title="Delete project"
            className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 hover:text-error group-hover:opacity-100"
          >
            <Trash2 size={10} />
          </span>
          {!isArchived && unreadCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 px-1 text-[10px] font-medium text-warning">
              {unreadCount}
            </span>
          )}
          {!isArchived && waitingCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 px-1 text-[10px] font-medium text-warning">
              {waitingCount}
            </span>
          )}
        </span>
      </button>

      {/* Portal-rendered menu so it isn't clipped by sidebar overflow */}
      {showNewMenu &&
        createPortal(
          <div
            ref={menuRef}
            className="w-40 overflow-hidden rounded-md border border-border-default bg-surface-1 py-1 shadow-lg"
            style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                createSession('claude')
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-2"
            >
              <Sparkles size={12} className="shrink-0 text-accent" />
              Claude Code
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                createSession('terminal')
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-2"
            >
              <Terminal size={12} className="shrink-0 text-text-secondary" />
              Terminal
            </button>
          </div>,
          document.body
        )}

      {isExpanded && (
        <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border-default pl-2">
          {visibleConversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
          {isArchived ? (
            archivedConversations.length > 0 && (
              <>
                {archivedConversations.map((conv) => (
                  <ConversationItem key={conv.id} conversation={conv} />
                ))}
              </>
            )
          ) : (
            showArchived && archivedConversations.length > 0 && (
              <div className="mt-1">
                <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-text-secondary">
                  <Archive size={9} />
                  <span>Archived ({archivedConversations.length})</span>
                </div>
                {archivedConversations.map((conv) => (
                  <ConversationItem key={conv.id} conversation={conv} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
