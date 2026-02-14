import { useState } from 'react'
import { MessageSquare, Copy, Archive, Trash2, ArchiveRestore, Check, X } from 'lucide-react'
import type { Conversation } from '../../types'
import { StatusIndicator } from '../common/StatusIndicator'
import { useConversationStore } from '../../store/conversationStore'
import { useProjectStore } from '../../store/projectStore'

type ConfirmAction = null | 'delete' | 'archive'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const openTab = useConversationStore((s) => s.openTab)
  const closeTab = useConversationStore((s) => s.closeTab)
  const activeTabId = useConversationStore((s) => s.activeTabId)
  const markRead = useProjectStore((s) => s.markConversationRead)
  const duplicateConversation = useProjectStore((s) => s.duplicateConversation)
  const renameConversation = useProjectStore((s) => s.renameConversation)
  const archiveConversation = useProjectStore((s) => s.archiveConversation)
  const unarchiveConversation = useProjectStore((s) => s.unarchiveConversation)
  const deleteConversation = useProjectStore((s) => s.deleteConversation)

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(conversation.name)
  const [confirming, setConfirming] = useState<ConfirmAction>(null)

  const isActive = activeTabId === conversation.id
  const needsAttention = conversation.unread && conversation.status !== 'running'

  const handleClick = () => {
    if (confirming) return
    openTab(conversation.id, conversation.projectId)
    if (conversation.unread) markRead(conversation.id)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming) return
    setEditValue(conversation.name)
    setEditing(true)
  }

  const handleRenameSubmit = () => {
    if (editValue.trim() && editValue.trim() !== conversation.name) {
      renameConversation(conversation.id, editValue.trim())
    }
    setEditing(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setEditing(false)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newId = duplicateConversation(conversation.id)
    if (newId) openTab(newId, conversation.projectId)
  }

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (conversation.archived) {
      unarchiveConversation(conversation.id)
    } else {
      setConfirming('archive')
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming('delete')
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirming === 'delete') {
      closeTab(conversation.id)
      deleteConversation(conversation.id)
    } else if (confirming === 'archive') {
      archiveConversation(conversation.id)
      closeTab(conversation.id)
    }
    setConfirming(null)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(null)
  }

  // --- Rename mode ---
  if (editing) {
    return (
      <div className="px-2 py-0.5">
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameSubmit}
          className="w-full rounded border border-accent bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none"
        />
      </div>
    )
  }

  // --- Confirmation mode ---
  if (confirming) {
    const isDelete = confirming === 'delete'
    return (
      <div
        className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
          isDelete ? 'bg-error/10' : 'bg-warning/10'
        }`}
      >
        <span className={isDelete ? 'text-error' : 'text-warning'}>
          {isDelete ? 'Delete?' : 'Archive?'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleConfirm}
            className={`flex h-5 items-center gap-1 rounded px-1.5 text-[10px] font-medium text-white ${
              isDelete ? 'bg-error hover:bg-error/80' : 'bg-warning hover:bg-warning/80'
            }`}
          >
            <Check size={10} />
            Yes
          </button>
          <button
            onClick={handleCancel}
            className="flex h-5 items-center gap-1 rounded bg-surface-3 px-1.5 text-[10px] font-medium text-text-secondary hover:bg-surface-2"
          >
            <X size={10} />
            No
          </button>
        </div>
      </div>
    )
  }

  // --- Normal mode ---
  return (
    <button
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`group flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
        isActive
          ? 'bg-surface-3 text-text-primary'
          : needsAttention
            ? 'text-text-primary hover:bg-surface-2'
            : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
      } ${conversation.archived ? 'opacity-50' : ''}`}
    >
      <StatusIndicator status={conversation.status} />
      <span className={`min-w-0 truncate ${needsAttention ? 'font-semibold' : ''}`}>
        {conversation.name}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-0.5">
        <span
          onClick={handleDuplicate}
          title="Duplicate"
          className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
        >
          <Copy size={10} />
        </span>
        <span
          onClick={handleArchiveClick}
          title={conversation.archived ? 'Unarchive' : 'Archive'}
          className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
        >
          {conversation.archived ? <ArchiveRestore size={10} /> : <Archive size={10} />}
        </span>
        <span
          onClick={handleDeleteClick}
          title="Delete"
          className="flex h-4 w-4 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 hover:text-error group-hover:opacity-100"
        >
          <Trash2 size={10} />
        </span>
        {needsAttention && (
          <>
            {conversation.status === 'waiting' && (
              <MessageSquare size={10} className="text-warning" />
            )}
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                conversation.status === 'error'
                  ? 'bg-error'
                  : conversation.status === 'waiting'
                    ? 'bg-warning'
                    : 'bg-accent'
              }`}
            />
          </>
        )}
      </span>
    </button>
  )
}
