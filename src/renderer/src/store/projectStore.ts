import { create } from 'zustand'
import type { Project, Conversation, ConversationStatus, ConversationType } from '../types'
import { useUIStore } from './uiStore'

export const PROJECT_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#eab308', '#ef4444', '#6366f1']

function uid(): string {
  return crypto.randomUUID().slice(0, 8)
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  expandedProjectIds: Set<string>
  showArchived: boolean
  setActiveProject: (id: string) => void
  toggleProjectExpanded: (id: string) => void
  toggleShowArchived: () => void
  addProject: (name: string, path: string, color?: string) => void
  deleteProject: (projectId: string) => void
  renameProject: (projectId: string, name: string) => void
  addConversation: (projectId: string, name: string, type?: ConversationType) => void
  renameConversation: (conversationId: string, name: string) => void
  archiveConversation: (conversationId: string) => void
  unarchiveConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  duplicateConversation: (conversationId: string) => { newId: string; sourceClaudeSessionId?: string; newClaudeSessionId?: string } | null
  markConversationRead: (conversationId: string) => void
  setConversationStatus: (conversationId: string, status: ConversationStatus) => void
  setProjectPreview: (projectId: string, previewOpen: boolean, previewUrl: string) => void
  loadFromDisk: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  expandedProjectIds: new Set<string>(),
  showArchived: false,

  setActiveProject: (id) =>
    set((state) => {
      const ui = useUIStore.getState()

      // Save current preview state to outgoing project
      const projects = state.activeProjectId
        ? state.projects.map((p) =>
            p.id === state.activeProjectId
              ? { ...p, previewOpen: ui.previewOpen, previewUrl: ui.previewUrl }
              : p
          )
        : state.projects

      // Load incoming project's preview state into uiStore
      const incoming = projects.find((p) => p.id === id)
      if (incoming) {
        ui.setPreviewState(
          incoming.previewOpen ?? false,
          incoming.previewUrl ?? 'http://localhost:3000'
        )
      }

      return {
        projects,
        activeProjectId: id,
        expandedProjectIds: new Set([...state.expandedProjectIds, id])
      }
    }),

  toggleProjectExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedProjectIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { expandedProjectIds: next }
    }),

  toggleShowArchived: () => set((state) => ({ showArchived: !state.showArchived })),

  addProject: (name, path, chosenColor?) =>
    set((state) => {
      const id = `proj-${uid()}`
      const color = chosenColor || PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length]
      const newProject: Project = { id, name, path, color, conversations: [] }
      return {
        projects: [...state.projects, newProject],
        activeProjectId: id,
        expandedProjectIds: new Set([...state.expandedProjectIds, id])
      }
    }),

  deleteProject: (projectId) =>
    set((state) => {
      const next = state.projects.filter((p) => p.id !== projectId)
      const wasActive = state.activeProjectId === projectId
      return {
        projects: next,
        activeProjectId: wasActive ? (next[0]?.id ?? null) : state.activeProjectId
      }
    }),

  renameProject: (projectId, name) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, name } : p
      )
    })),

  addConversation: (projectId, name, type = 'claude') =>
    set((state) => {
      const convId = `conv-${uid()}`
      const newConv: Conversation = {
        id: convId,
        projectId,
        name,
        status: 'running',
        lastMessage: type === 'terminal' ? '$ Starting terminal...' : '> Starting new session...',
        createdAt: new Date().toISOString(),
        unread: false,
        archived: false,
        claudeSessionId: type === 'claude' ? crypto.randomUUID() : undefined,
        type
      }
      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, conversations: [...p.conversations, newConv] }
            : p
        )
      }
    }),

  renameConversation: (conversationId, name) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, name } : c
        )
      }))
    })),

  archiveConversation: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, archived: true } : c
        )
      }))
    })),

  unarchiveConversation: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, archived: false } : c
        )
      }))
    })),

  deleteConversation: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.filter((c) => c.id !== conversationId)
      }))
    })),

  duplicateConversation: (conversationId) => {
    let result: { newId: string; sourceClaudeSessionId?: string; newClaudeSessionId?: string } | null = null
    set((state) => {
      let original: Conversation | undefined
      let projectId: string | undefined
      for (const p of state.projects) {
        const c = p.conversations.find((c) => c.id === conversationId)
        if (c) {
          original = c
          projectId = p.id
          break
        }
      }
      if (!original || !projectId) return state

      const newId = `conv-${uid()}`
      const newClaudeSessionId = original.type === 'terminal' ? undefined : crypto.randomUUID()
      const duplicate: Conversation = {
        ...original,
        id: newId,
        name: `${original.name} (copy)`,
        status: 'idle',
        createdAt: new Date().toISOString(),
        unread: false,
        archived: false,
        claudeSessionId: newClaudeSessionId,
        type: original.type || 'claude'
      }

      result = { newId, sourceClaudeSessionId: original.claudeSessionId, newClaudeSessionId }

      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, conversations: [...p.conversations, duplicate] }
            : p
        )
      }
    })
    return result
  },

  markConversationRead: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread: false } : c
        )
      }))
    })),

  setConversationStatus: (conversationId, status) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, status } : c
        )
      }))
    })),

  setProjectPreview: (projectId, previewOpen, previewUrl) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, previewOpen, previewUrl } : p
      )
    })),

  loadFromDisk: async () => {
    const raw = await window.api.loadProjects()
    if (!raw || typeof raw !== 'object') return

    // Support both old format (plain array) and new format (object with metadata)
    let savedProjects: Project[]
    let savedExpandedIds: string[] = []
    let savedActiveId: string | null = null

    if (Array.isArray(raw)) {
      savedProjects = raw as Project[]
    } else {
      const data = raw as { projects?: Project[]; expandedIds?: string[]; activeProjectId?: string }
      savedProjects = data.projects || []
      savedExpandedIds = data.expandedIds || []
      savedActiveId = data.activeProjectId || null
    }

    if (savedProjects.length === 0) return

    // Check if IDs need regeneration (old counter-based IDs have duplicates)
    const seenIds = new Set<string>()
    let needsRegen = false
    for (const p of savedProjects) {
      if (seenIds.has(p.id)) { needsRegen = true; break }
      seenIds.add(p.id)
      for (const c of p.conversations) {
        if (seenIds.has(c.id)) { needsRegen = true; break }
        seenIds.add(c.id)
      }
      if (needsRegen) break
    }

    let projects: Project[]
    if (needsRegen) {
      projects = savedProjects.map((p) => {
        const projId = `proj-${uid()}`
        return {
          ...p,
          id: projId,
          conversations: p.conversations.map((c) => ({
            ...c,
            id: `conv-${uid()}`,
            projectId: projId,
            status: 'idle' as ConversationStatus,
            claudeSessionId: c.claudeSessionId || (c.type === 'terminal' ? undefined : crypto.randomUUID()),
            type: c.type || 'claude'
          }))
        }
      })
    } else {
      projects = savedProjects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) => ({
          ...c,
          status: 'idle' as ConversationStatus,
          claudeSessionId: c.claudeSessionId || (c.type === 'terminal' ? undefined : crypto.randomUUID()),
          type: c.type || 'claude'
        }))
      }))
    }

    // Resolve active project (use saved if still exists, else first)
    const activeProjectId = needsRegen
      ? (projects[0]?.id ?? null)
      : (projects.find((p) => p.id === savedActiveId) ? savedActiveId : (projects[0]?.id ?? null))

    // Resolve expanded IDs (use saved if IDs weren't regenerated)
    const expandedProjectIds = needsRegen
      ? new Set(projects[0] ? [projects[0].id] : [])
      : new Set(savedExpandedIds.filter((id) => projects.some((p) => p.id === id)))

    set({ projects, activeProjectId, expandedProjectIds })

    // Sync active project's preview state to uiStore
    const activeProject = projects.find((p) => p.id === activeProjectId)
    if (activeProject) {
      useUIStore.getState().setPreviewState(
        activeProject.previewOpen ?? false,
        activeProject.previewUrl ?? 'http://localhost:3000'
      )
    }
  }
}))

// Auto-save: subscribe to project changes and persist
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useProjectStore.subscribe((state) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (state.projects.length > 0) {
      window.api.saveProjects({
        projects: state.projects,
        expandedIds: [...state.expandedProjectIds],
        activeProjectId: state.activeProjectId
      })
    }
  }, 500)
})
