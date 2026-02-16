import { create } from 'zustand'
import type { Project, Conversation, ConversationStatus, ConversationType, BrowserTab } from '../types'
import { useUIStore } from './uiStore'
import { useConversationStore } from './conversationStore'

export const PROJECT_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#eab308', '#ef4444', '#6366f1']

function uid(): string {
  return crypto.randomUUID().slice(0, 8)
}

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  expandedProjectIds: Set<string>
  showArchived: boolean
  searchQuery: string
  searchOpen: boolean
  setActiveProject: (id: string) => void
  toggleProjectExpanded: (id: string) => void
  toggleShowArchived: () => void
  setSearchQuery: (q: string) => void
  toggleSearch: () => void
  archiveProject: (projectId: string) => void
  unarchiveProject: (projectId: string) => void
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
  markConversationUnread: (conversationId: string) => void
  setConversationStatus: (conversationId: string, status: ConversationStatus) => void
  setProjectPreview: (projectId: string, previewOpen: boolean, previewTabs: BrowserTab[], activePreviewTabId: string) => void
  loadFromDisk: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  expandedProjectIds: new Set<string>(),
  showArchived: false,
  searchQuery: '',
  searchOpen: false,

  setSearchQuery: (q) => set({ searchQuery: q }),

  toggleSearch: () =>
    set((state) => ({
      searchOpen: !state.searchOpen,
      searchQuery: state.searchOpen ? '' : state.searchQuery
    })),

  archiveProject: (projectId) =>
    set((state) => {
      const convStore = useConversationStore.getState()
      const project = state.projects.find((p) => p.id === projectId)
      if (project) {
        for (const conv of project.conversations) {
          convStore.closeTab(conv.id)
        }
      }

      const projects = state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              archived: true,
              conversations: p.conversations.map((c) => ({ ...c, archived: true }))
            }
          : p
      )

      let activeProjectId = state.activeProjectId
      if (activeProjectId === projectId) {
        activeProjectId = projects.find((p) => !p.archived)?.id ?? null
      }

      return { projects, activeProjectId }
    }),

  unarchiveProject: (projectId) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              archived: false,
              conversations: p.conversations.map((c) => ({ ...c, archived: false }))
            }
          : p
      )
    })),

  setActiveProject: (id) =>
    set((state) => {
      const ui = useUIStore.getState()

      // Save current preview state to outgoing project
      const activeTab = ui.previewTabs.find((t) => t.id === ui.activePreviewTabId)
      const projects = state.activeProjectId
        ? state.projects.map((p) =>
            p.id === state.activeProjectId
              ? {
                  ...p,
                  previewOpen: ui.previewOpen,
                  previewTabs: ui.previewTabs,
                  activePreviewTabId: ui.activePreviewTabId,
                  previewUrl: activeTab?.url ?? p.previewUrl
                }
              : p
          )
        : state.projects

      // Load incoming project's preview state into uiStore
      const incoming = projects.find((p) => p.id === id)
      if (incoming) {
        const tabs =
          incoming.previewTabs && incoming.previewTabs.length > 0
            ? incoming.previewTabs
            : [{ id: uid(), url: incoming.previewUrl || 'http://localhost:3000' }]
        const tabId =
          incoming.activePreviewTabId && tabs.some((t) => t.id === incoming.activePreviewTabId)
            ? incoming.activePreviewTabId
            : tabs[0]?.id ?? ''
        ui.setPreviewState(incoming.previewOpen ?? false, tabs, tabId)
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
      projects: state.projects.map((p) => {
        const hasConv = p.conversations.some((c) => c.id === conversationId)
        return {
          ...p,
          archived: hasConv ? false : p.archived,
          conversations: p.conversations.map((c) =>
            c.id === conversationId ? { ...c, archived: false } : c
          )
        }
      })
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

  markConversationUnread: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread: true } : c
        )
      }))
    })),

  setConversationStatus: (conversationId, status) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                status,
                waitingSince: status === 'waiting' ? (c.status !== 'waiting' ? new Date().toISOString() : c.waitingSince) : undefined
              }
            : c
        )
      }))
    })),

  setProjectPreview: (projectId, previewOpen, previewTabs, activePreviewTabId) =>
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p
        const activeTab = previewTabs.find((t) => t.id === activePreviewTabId)
        return {
          ...p,
          previewOpen,
          previewTabs,
          activePreviewTabId,
          previewUrl: activeTab?.url ?? p.previewUrl
        }
      })
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
          archived: p.archived ?? false,
          conversations: p.conversations.map((c) => ({
            ...c,
            id: `conv-${uid()}`,
            projectId: projId,
            status: 'waiting' as ConversationStatus,
            waitingSince: c.waitingSince || new Date().toISOString(),
            claudeSessionId: c.claudeSessionId || (c.type === 'terminal' ? undefined : crypto.randomUUID()),
            type: c.type || 'claude'
          }))
        }
      })
    } else {
      projects = savedProjects.map((p) => ({
        ...p,
        archived: p.archived ?? false,
        conversations: p.conversations.map((c) => ({
          ...c,
          status: 'waiting' as ConversationStatus,
          waitingSince: c.waitingSince || new Date().toISOString(),
          claudeSessionId: c.claudeSessionId || (c.type === 'terminal' ? undefined : crypto.randomUUID()),
          type: c.type || 'claude'
        }))
      }))
    }

    // Migrate old previewUrl → previewTabs for all projects
    projects = projects.map((p) => {
      if (p.previewTabs && p.previewTabs.length > 0) return p
      const tab = { id: uid(), url: p.previewUrl || 'http://localhost:3000' }
      return { ...p, previewTabs: [tab], activePreviewTabId: tab.id }
    })

    // Resolve active project (use saved if still exists and not archived, else first non-archived)
    const findActive = (id: string | null) => {
      const p = id ? projects.find((p) => p.id === id) : null
      if (p && !p.archived) return id
      return projects.find((p) => !p.archived)?.id ?? null
    }
    const activeProjectId = needsRegen
      ? findActive(projects[0]?.id ?? null)
      : findActive(savedActiveId)

    // Resolve expanded IDs (use saved if IDs weren't regenerated)
    const expandedProjectIds = needsRegen
      ? new Set(projects[0] ? [projects[0].id] : [])
      : new Set(savedExpandedIds.filter((id) => projects.some((p) => p.id === id)))

    set({ projects, activeProjectId, expandedProjectIds })

    // Sync active project's preview state to uiStore
    const activeProject = projects.find((p) => p.id === activeProjectId)
    if (activeProject) {
      const tabs =
        activeProject.previewTabs && activeProject.previewTabs.length > 0
          ? activeProject.previewTabs
          : [{ id: uid(), url: activeProject.previewUrl || 'http://localhost:3000' }]
      const tabId =
        activeProject.activePreviewTabId &&
        tabs.some((t) => t.id === activeProject.activePreviewTabId)
          ? activeProject.activePreviewTabId!
          : tabs[0]?.id ?? ''
      useUIStore.getState().setPreviewState(activeProject.previewOpen ?? false, tabs, tabId)
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
