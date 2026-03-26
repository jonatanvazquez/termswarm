import { create } from 'zustand'
import type {
  SSHConnection,
  SSHConnectionSaved,
  SSHConnectionStatus
} from '../../../shared/sshTypes'

function uid(): string {
  return crypto.randomUUID().slice(0, 8)
}

interface ConnectionStatusEntry {
  status: SSHConnectionStatus
  error?: string
}

interface ConnectionState {
  connections: SSHConnectionSaved[]
  statuses: Record<string, ConnectionStatusEntry>
  managerOpen: boolean

  loadFromDisk: () => Promise<void>
  addConnection: (conn: Omit<SSHConnectionSaved, 'id'>) => string
  updateConnection: (id: string, updates: Partial<SSHConnectionSaved>) => void
  deleteConnection: (id: string) => void
  setStatus: (connectionId: string, status: SSHConnectionStatus, error?: string) => void
  getGitToken: (connectionId: string) => string | undefined
  openManager: () => void
  closeManager: () => void

  connect: (id: string, password?: string, passphrase?: string) => Promise<void>
  disconnect: (id: string) => void
  testConnection: (config: SSHConnection) => Promise<{ success: boolean; error?: string }>
  reconnect: (id: string) => Promise<void>
  initStatusListener: () => () => void
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  statuses: {},
  managerOpen: false,

  loadFromDisk: async () => {
    const raw = await window.api.loadConnections()
    if (raw && Array.isArray(raw)) {
      set({ connections: raw as SSHConnectionSaved[] })
    }
  },

  addConnection: (conn) => {
    const id = `ssh-${uid()}`
    const saved: SSHConnectionSaved = { id, ...conn }
    set((state) => ({ connections: [...state.connections, saved] }))
    return id
  },

  updateConnection: (id, updates) =>
    set((state) => ({
      connections: state.connections.map((c) => (c.id === id ? { ...c, ...updates } : c))
    })),

  deleteConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id)
    })),

  setStatus: (connectionId, status, error) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [connectionId]: { status, error }
      }
    })),

  getGitToken: (connectionId) => {
    const conn = get().connections.find((c) => c.id === connectionId)
    return conn?.gitToken
  },

  openManager: () => set({ managerOpen: true }),
  closeManager: () => set({ managerOpen: false }),

  connect: async (id, password?, passphrase?) => {
    const conn = get().connections.find((c) => c.id === id)
    if (!conn) return

    const config: SSHConnection = {
      ...conn,
      password,
      passphrase,
      gitToken: conn.gitToken
    }

    set((state) => ({
      statuses: { ...state.statuses, [id]: { status: 'connecting' } }
    }))

    try {
      await window.api.sshConnect(config)
    } catch (err) {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [id]: { status: 'error', error: (err as Error).message }
        }
      }))
    }
  },

  disconnect: (id) => {
    window.api.sshDisconnect(id)
    set((state) => ({
      statuses: { ...state.statuses, [id]: { status: 'disconnected' } }
    }))
  },

  testConnection: async (config) => {
    return window.api.sshTestConnection(config)
  },

  reconnect: async (id) => {
    set((state) => ({
      statuses: { ...state.statuses, [id]: { status: 'connecting' } }
    }))
    try {
      await window.api.sshReconnect(id)
    } catch (err) {
      set((state) => ({
        statuses: {
          ...state.statuses,
          [id]: { status: 'error', error: (err as Error).message }
        }
      }))
    }
  },

  initStatusListener: () => {
    const cleanup = window.api.onSshStatus((connectionId, status, error) => {
      get().setStatus(connectionId, status, error)
    })
    return cleanup
  }
}))

// Auto-save connections on change (tokens are NOT saved — in-memory only)
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useConnectionStore.subscribe((state) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    if (state.connections.length > 0) {
      window.api.saveConnections(state.connections)
    }
  }, 500)
})
