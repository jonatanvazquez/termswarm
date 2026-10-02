import { useState, useEffect, useRef } from 'react'
import {
  MessageSquare,
  Copy,
  Archive,
  Trash2,
  ArchiveRestore,
  Check,
  X,
  Square,
  RotateCw
} from 'lucide-react'
import type { Conversation } from '../../types'
import { StatusIndicator } from '../common/StatusIndicator'
import {
  useConversationStore,
  checkPendingRename,
  clearPendingRename,
  setPendingRenameForNewTab,
  syncClaudeName
} from '../../store/conversationStore'
import { useProjectStore } from '../../store/projectStore'
import { useTerminalStore } from '../../store/terminalStore'
import { useElapsed } from '../../hooks/useElapsed'
import { formatMemory, formatElapsed, formatDateTime } from '../../utils/format'

// Past this, a reply no longer lands while the conversation is still fresh — the wait
// label goes from highlighted to muted.
const FRESH_WAIT_MS = 5 * 60 * 1000

type ConfirmAction = null | 'delete' | 'archive'

interface ConversationItemProps {
  conversation: Conversation
}

export function ConversationItem({ conversation }: ConversationItemProps) {
  const openTab = useConversationStore((s) => s.openTab)
  const closeTab = useConversationStore((s) => s.closeTab)
  const stopSession = useConversationStore((s) => s.stopSession)
  const restartSession = useConversationStore((s) => s.restartSession)
  const activeTabId = useConversationStore((s) => s.activeTabId)
  // An open tab means a terminal (and, unless it exited, a process) exists for this session
  const isOpen = useConversationStore((s) =>
    s.tabs.some((t) => t.conversationId === conversation.id)
  )
  const markRead = useProjectStore((s) => s.markConversationRead)
  const duplicateConversation = useProjectStore((s) => s.duplicateConversation)
  const renameConversation = useProjectStore((s) => s.renameConversation)
  const archiveConversation = useProjectStore((s) => s.archiveConversation)
  const unarchiveConversation = useProjectStore((s) => s.unarchiveConversation)
  const deleteConversation = useProjectStore((s) => s.deleteConversation)

  const memoryBytes = useTerminalStore((s) => s.memoryBySession[conversation.id] ?? 0)

  const [editing, setEditing] = useState(() => checkPendingRename(conversation.id))
  const [editValue, setEditValue] = useState(conversation.name)
  const [confirming, setConfirming] = useState<ConfirmAction>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editStartedAtRef = useRef(0)

  // Clear the module-level flag after commit (safe with StrictMode)
  useEffect(() => {
    if (checkPendingRename(conversation.id)) {
      clearPendingRename()
    }
  }, [])

  // Track when edit mode starts (for blur protection)
  useEffect(() => {
    if (editing) {
      editStartedAtRef.current = Date.now()
    }
  }, [editing])

  const isActive = activeTabId === conversation.id
  const needsAttention = conversation.unread && conversation.status !== 'running'

  const isWaiting = conversation.status === 'waiting'
  const isStopped = conversation.status === 'stopped'
  const waitingMs = useElapsed(isWaiting ? conversation.waitingSince : undefined)
  // For sessions that aren't waiting on the user (stopped, idle terminals, errors), how long
  // since the last message instead
  const inactiveMs = useElapsed(
    !isWaiting && conversation.status !== 'running' ? conversation.lastMessageAt : undefined
  )

  const tooltip = [
    isWaiting && waitingMs !== null && `Waiting for your input for ${formatElapsed(waitingMs)}`,
    isStopped && 'Stopped — click to resume',
    conversation.lastMessageAt && `Last message: ${formatDateTime(conversation.lastMessageAt)}`
  ]
    .filter(Boolean)
    .join('\n')

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
      // Keep the Claude Code session named the same as the sidebar entry
      syncClaudeName(conversation.id)
    }
    setEditing(false)
    // Focus the terminal so the user can start typing immediately
    setTimeout(() => {
      useTerminalStore.getState().getTerminal(conversation.id)?.focus()
    }, 0)
  }

  const handleRenameBlur = () => {
    // If blur happens within 300ms of entering edit mode, the terminal stole focus — reclaim it
    if (Date.now() - editStartedAtRef.current < 300) {
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }
    handleRenameSubmit()
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') setEditing(false)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Serialize current terminal buffer before duplicating
    const { serializeBuffer, setPendingContent } = useTerminalStore.getState()
    const content = serializeBuffer(conversation.id)
    const result = duplicateConversation(conversation.id)
    if (result) {
      if (content) setPendingContent(result.newId, content)
      setPendingRenameForNewTab(result.newId)

      // Fork the Claude session file so the duplicate is independent
      if (result.sourceClaudeSessionId && result.newClaudeSessionId) {
        const project = useProjectStore.getState().projects.find(
          (p) => p.conversations.some((c) => c.id === result.newId)
        )
        if (project) {
          window.api
            .claudeForkSession(project.path, result.sourceClaudeSessionId, result.newClaudeSessionId)
            .then(() => openTab(result.newId, conversation.projectId))
        }
      } else {
        // Terminal — no Claude session to fork
        setTimeout(() => openTab(result.newId, conversation.projectId), 0)
      }
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    stopSession(conversation.id)
  }

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation()
    restartSession(conversation.id)
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
      // Hard kill: destroy remote tmux session before closing
      window.api.ptyKillRemote(conversation.id).catch(() => {})
      closeTab(conversation.id)
      deleteConversation(conversation.id)
    } else if (confirming === 'archive') {
      // Hard kill: destroy remote tmux session before archiving
      window.api.ptyKillRemote(conversation.id).catch(() => {})
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
          ref={inputRef}
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameBlur}
          onFocus={(e) => e.target.select()}
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
      title={tooltip || undefined}
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
          className={`flex items-center gap-1.5 text-[10px] tabular-nums group-hover:hidden ${
            needsAttention ? 'mr-1' : ''
          }`}
        >
          {waitingMs !== null && (
            <span className={waitingMs < FRESH_WAIT_MS ? 'text-warning' : 'text-warning/50'}>
              {formatElapsed(waitingMs)}
            </span>
          )}
          {inactiveMs !== null && (
            <span className="text-text-secondary/60">{formatElapsed(inactiveMs)}</span>
          )}
          {memoryBytes > 0 && (
            <span className="text-text-secondary/60">{formatMemory(memoryBytes)}</span>
          )}
        </span>
        {isOpen && (
          <span
            onClick={handleRestart}
            title="Restart session (resumes the conversation)"
            className="hidden h-4 w-4 items-center justify-center rounded hover:bg-surface-3 group-hover:flex"
          >
            <RotateCw size={10} />
          </span>
        )}
        {isOpen && !isStopped && (
          <span
            onClick={handleStop}
            title="Stop session (frees memory, keeps the conversation)"
            className="hidden h-4 w-4 items-center justify-center rounded hover:bg-surface-3 hover:text-warning group-hover:flex"
          >
            <Square size={9} />
          </span>
        )}
        <span
          onClick={handleDuplicate}
          title="Duplicate"
          className="hidden h-4 w-4 items-center justify-center rounded hover:bg-surface-3 group-hover:flex"
        >
          <Copy size={10} />
        </span>
        <span
          onClick={handleArchiveClick}
          title={conversation.archived ? 'Unarchive' : 'Archive'}
          className="hidden h-4 w-4 items-center justify-center rounded hover:bg-surface-3 group-hover:flex"
        >
          {conversation.archived ? <ArchiveRestore size={10} /> : <Archive size={10} />}
        </span>
        <span
          onClick={handleDeleteClick}
          title="Delete"
          className="hidden h-4 w-4 items-center justify-center rounded hover:bg-surface-3 hover:text-error group-hover:flex"
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
