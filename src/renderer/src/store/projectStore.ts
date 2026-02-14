import { create } from 'zustand'
import type { Project, Conversation } from '../types'
import { mockProjects, mockTerminalOutputs } from '../data/mockData'

export const PROJECT_COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#eab308', '#ef4444', '#6366f1']

let projectCounter = 0
let convCounter = 0

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  expandedProjectIds: Set<string>
  showArchived: boolean
  setActiveProject: (id: string) => void
  toggleProjectExpanded: (id: string) => void
  toggleShowArchived: () => void
  addProject: (name: string, path: string, color?: string) => void
  renameProject: (projectId: string, name: string) => void
  addConversation: (projectId: string, name: string) => void
  renameConversation: (conversationId: string, name: string) => void
  archiveConversation: (conversationId: string) => void
  unarchiveConversation: (conversationId: string) => void
  deleteConversation: (conversationId: string) => void
  duplicateConversation: (conversationId: string) => string | null
  markConversationRead: (conversationId: string) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: mockProjects,
  activeProjectId: mockProjects[0]?.id ?? null,
  expandedProjectIds: new Set([mockProjects[0]?.id ?? '']),
  showArchived: false,

  setActiveProject: (id) =>
    set((state) => ({
      activeProjectId: id,
      expandedProjectIds: new Set([...state.expandedProjectIds, id])
    })),

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
      const id = `proj-new-${++projectCounter}`
      const color = chosenColor || PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length]
      const newProject: Project = { id, name, path, color, conversations: [] }
      return {
        projects: [...state.projects, newProject],
        activeProjectId: id,
        expandedProjectIds: new Set([...state.expandedProjectIds, id])
      }
    }),

  renameProject: (projectId, name) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, name } : p
      )
    })),

  addConversation: (projectId, name) =>
    set((state) => {
      const convId = `conv-new-${++convCounter}`
      const newConv: Conversation = {
        id: convId,
        projectId,
        name,
        status: 'running',
        lastMessage: '> Starting new session...',
        createdAt: new Date().toISOString(),
        unread: false,
        archived: false
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
    let newId: string | null = null
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

      newId = `conv-dup-${++convCounter}`
      const duplicate: Conversation = {
        ...original,
        id: newId,
        name: `${original.name} (copy)`,
        createdAt: new Date().toISOString(),
        unread: false,
        archived: false
      }

      if (mockTerminalOutputs[conversationId]) {
        mockTerminalOutputs[newId] = [...mockTerminalOutputs[conversationId]]
      }

      return {
        projects: state.projects.map((p) =>
          p.id === projectId
            ? { ...p, conversations: [...p.conversations, duplicate] }
            : p
        )
      }
    })
    return newId
  },

  markConversationRead: (conversationId) =>
    set((state) => ({
      projects: state.projects.map((p) => ({
        ...p,
        conversations: p.conversations.map((c) =>
          c.id === conversationId ? { ...c, unread: false } : c
        )
      }))
    }))
}))
