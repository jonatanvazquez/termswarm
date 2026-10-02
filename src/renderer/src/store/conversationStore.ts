import { create } from 'zustand'
import type { Conversation, Project, Tab } from '../types'
import { useTerminalStore } from './terminalStore'
import { useProjectStore } from './projectStore'
import { useConnectionStore } from './connectionStore'
import { isClaudePromptIdle } from '../utils/claudePrompt'

// Module-level flag — not reactive, read synchronously in useState initializers.
// Split into check (non-destructive, safe for StrictMode double-invoke) and clear.
let _pendingRenameTabId: string | null = null

export function setPendingRenameForNewTab(id: string): void {
  _pendingRenameTabId = id
}

export function checkPendingRename(id: string): boolean {
  return _pendingRenameTabId === id
}

export function clearPendingRename(): void {
  _pendingRenameTabId = null
}

function findConversation(
  conversationId: string
): { project: Project; conversation: Conversation } | null {
  for (const project of useProjectStore.getState().projects) {
    const conversation = project.conversations.find((c) => c.id === conversationId)
    if (conversation) return { project, conversation }
  }
  return null
}

/** Start (or restart) the PTY behind a conversation. The main process replaces any old one. */
function launchPty(project: Project, conversation: Conversation): void {
  const mode = conversation.type || 'claude'
  // The main process decides between resuming and creating the Claude session (based on
  // whether its transcript exists) and takes it over from any other process holding it.
  const claude =
    mode === 'claude' && conversation.claudeSessionId
      ? { sessionId: conversation.claudeSessionId, name: conversation.name }
      : undefined

  console.log('[ConvStore] spawning PTY:', {
    sessionId: conversation.id,
    cwd: project.path,
    mode,
    status: conversation.status,
    claude,
    connectionId: project.connectionId
  })

  const spawnPty = (): void => {
    window.api
      .ptySpawn(conversation.id, project.path, [], mode, project.connectionId, claude)
      .then(() => {
        // An in-place restart keeps the xterm instance, so no resize event will tell the
        // new PTY its size — report it explicitly.
        const terminal = useTerminalStore.getState().getTerminal(conversation.id)
        if (terminal) window.api.ptyResize(conversation.id, terminal.cols, terminal.rows)
      })
      .catch((err) => {
        console.error('Failed to spawn PTY:', err)
      })
  }

  // The session is launched under the sidebar name, so the two are in sync from here
  if (claude) useProjectStore.getState().setClaudeName(conversation.id, conversation.name)

  // A stopped or crashed session is running again from here; the main process reports
  // 'waiting' once its prompt is up.
  if (conversation.status === 'stopped' || conversation.status === 'error') {
    useProjectStore.getState().markConversationLaunching(conversation.id)
  }

  // Auto-connect SSH if needed before spawning
  const connectionId = project.connectionId
  if (!connectionId) {
    spawnPty()
    return
  }

  const connStore = useConnectionStore.getState()
  const status = connStore.statuses[connectionId]?.status
  if (status !== 'connected' && status !== 'connecting') {
    console.log('[ConvStore] auto-connecting SSH before spawn:', connectionId)
    connStore.connect(connectionId).then(spawnPty)
  } else if (status === 'connecting') {
    // Wait for connection to complete
    const unsub = useConnectionStore.subscribe((state) => {
      const s = state.statuses[connectionId]?.status
      if (s === 'connected') {
        unsub()
        spawnPty()
      } else if (s === 'error') {
        unsub()
      }
    })
  } else {
    spawnPty()
  }
}

// --- Keeping the Claude Code session name in sync with the sidebar name ---

const RENAME_RETRY_DELAY_MS = 1000
const RENAME_MAX_RETRIES = 3
const renameRetries = new Map<string, number>()

/**
 * Apply the sidebar name to the Claude Code session when the two differ.
 * - Running session: type `/rename` into it, but only while its input box is empty.
 *   Otherwise retry shortly, and again whenever the session goes back to waiting.
 * - Session not running: write the title into its transcript. If it has none yet, the
 *   next launch passes the name with --name.
 */
export function syncClaudeName(conversationId: string): void {
  const found = findConversation(conversationId)
  if (!found) return
  const { project, conversation } = found
  if (conversation.type !== 'claude' || !conversation.claudeSessionId) return

  // Same cleanup the main process applies to the name it passes with --name
  // eslint-disable-next-line no-control-regex
  const name = conversation.name
    .replace(/[\x00-\x1f\x7f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name || conversation.claudeName === conversation.name) {
    renameRetries.delete(conversationId)
    return
  }

  const { setClaudeName } = useProjectStore.getState()
  const hasTab = useConversationStore
    .getState()
    .tabs.some((t) => t.conversationId === conversationId)
  const running = hasTab && conversation.status !== 'stopped' && conversation.status !== 'error'

  if (!running) {
    renameRetries.delete(conversationId)
    if (project.connectionId) return // Remote transcript — applied with --name on next launch
    window.api
      .claudeSetSessionTitle(project.path, conversation.claudeSessionId, name)
      .then((applied) => {
        if (applied) setClaudeName(conversationId, conversation.name)
      })
      .catch(() => {})
    return
  }

  const terminal = useTerminalStore.getState().getTerminal(conversationId)
  if (conversation.status === 'waiting' && terminal && isClaudePromptIdle(terminal)) {
    renameRetries.delete(conversationId)
    setClaudeName(conversationId, conversation.name)
    // Passive writes: typed on the user's behalf, not a message to Claude. Ink handles each
    // chunk as one key event, so Enter goes separately once the command text has landed.
    window.api.ptyWrite(conversationId, `/rename ${name}`, true)
    setTimeout(() => window.api.ptyWrite(conversationId, '\r', true), 150)
    return
  }

  // Claude is busy, a dialog is open, or the user has text in the input box
  const attempts = renameRetries.get(conversationId) ?? 0
  if (attempts < RENAME_MAX_RETRIES) {
    renameRetries.set(conversationId, attempts + 1)
    setTimeout(() => syncClaudeName(conversationId), RENAME_RETRY_DELAY_MS)
  } else {
    renameRetries.delete(conversationId)
  }
}

interface ConversationState {
  tabs: Tab[]
  activeTabId: string | null
  openTab: (conversationId: string, projectId: string) => void
  closeTab: (conversationId: string) => void
  setActiveTab: (conversationId: string) => void
  stopSession: (conversationId: string) => void
  restartSession: (conversationId: string) => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  openTab: (conversationId, projectId) =>
    set((state) => {
      console.log('[ConvStore] openTab:', conversationId, 'project:', projectId)

      // Switch active project if needed (saves/loads preview state)
      const projectStore = useProjectStore.getState()
      if (projectStore.activeProjectId !== projectId) {
        console.log('[ConvStore] switching active project to:', projectId)
        projectStore.setActiveProject(projectId)
      }

      const project = projectStore.projects.find((p) => p.id === projectId)
      const conversation = project?.conversations.find((c) => c.id === conversationId)

      const exists = state.tabs.find((t) => t.conversationId === conversationId)
      if (exists) {
        // The process exited but its terminal is still open — opening it brings it back
        if (conversation?.status === 'stopped') {
          setTimeout(() => get().restartSession(conversationId), 0)
        }
        console.log('[ConvStore] tab already exists, just activating')
        return { activeTabId: conversationId }
      }

      if (project && conversation) {
        launchPty(project, conversation)
      } else {
        console.error('[ConvStore] project or conversation not found:', projectId, conversationId)
      }

      return {
        tabs: [...state.tabs, { conversationId, projectId }],
        activeTabId: conversationId
      }
    }),
  closeTab: (conversationId) =>
    set((state) => {
      console.log('[ConvStore] closeTab:', conversationId)
      // Save terminal buffer before killing so it can be restored on reopen
      const { serializeBuffer, setPendingContent, disposeInstance } = useTerminalStore.getState()
      const content = serializeBuffer(conversationId)
      console.log(
        '[ConvStore] closeTab serialized buffer:',
        content.length,
        'chars, first 200:',
        JSON.stringify(content.slice(0, 200))
      )
      if (content) {
        setPendingContent(conversationId, content)
        console.log('[ConvStore] closeTab setPendingContent OK')
      } else {
        console.warn('[ConvStore] closeTab: NO content to save!')
      }

      // Kill PTY + dispose terminal instance
      window.api.ptyKill(conversationId).catch(() => {})
      disposeInstance(conversationId)

      const idx = state.tabs.findIndex((t) => t.conversationId === conversationId)
      const next = state.tabs.filter((t) => t.conversationId !== conversationId)
      let nextActive = state.activeTabId
      if (state.activeTabId === conversationId) {
        const newIdx = Math.min(idx, next.length - 1)
        nextActive = next[newIdx]?.conversationId ?? null
      }
      return { tabs: next, activeTabId: nextActive }
    }),
  setActiveTab: (conversationId) =>
    set((state) => {
      console.log('[ConvStore] setActiveTab:', conversationId, 'prev:', state.activeTabId)
      // Switch active project if the tab belongs to a different project
      const tab = state.tabs.find((t) => t.conversationId === conversationId)
      if (tab) {
        const projectStore = useProjectStore.getState()
        if (projectStore.activeProjectId !== tab.projectId) {
          console.log('[ConvStore] setActiveTab switching project to:', tab.projectId)
          projectStore.setActiveProject(tab.projectId)
        }
      }
      useProjectStore.getState().markConversationRead(conversationId)
      return { activeTabId: conversationId }
    }),

  // Free the session's process and terminal but keep the conversation: opening it again
  // resumes the same Claude session with its output restored.
  stopSession: (conversationId) => {
    if (!get().tabs.some((t) => t.conversationId === conversationId)) return
    console.log('[ConvStore] stopSession:', conversationId)
    // Hard kill: a remote tmux session left running would keep consuming resources
    window.api.ptyKillRemote(conversationId).catch(() => {})
    get().closeTab(conversationId)
    useProjectStore.getState().setConversationStatus(conversationId, 'stopped')
  },

  // Relaunch the session's process in the same terminal (or open it if it isn't open)
  restartSession: (conversationId) => {
    const found = findConversation(conversationId)
    if (!found) return
    const { project, conversation } = found

    if (!get().tabs.some((t) => t.conversationId === conversationId)) {
      get().openTab(conversationId, project.id)
      return
    }

    console.log('[ConvStore] restartSession:', conversationId)
    useTerminalStore
      .getState()
      .getTerminal(conversationId)
      ?.write('\r\n\x1b[90m--- session restarted ---\x1b[0m\r\n\r\n')

    // Wait for the old process (and remote tmux session) to be gone before relaunching
    window.api
      .ptyKillRemote(conversationId)
      .catch(() => {})
      .then(() => launchPty(project, conversation))
  }
}))
