import { useState } from 'react'
import { X, Plus, Pencil, Trash2, Plug, Unplug, Server } from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import { ConnectionForm } from './ConnectionForm'
import type { SSHConnectionSaved } from '../../../../shared/sshTypes'

type View = 'list' | 'add' | 'edit'

export function ConnectionManagerModal() {
  const connections = useConnectionStore((s) => s.connections)
  const statuses = useConnectionStore((s) => s.statuses)
  const closeManager = useConnectionStore((s) => s.closeManager)
  const addConnection = useConnectionStore((s) => s.addConnection)
  const updateConnection = useConnectionStore((s) => s.updateConnection)
  const deleteConnection = useConnectionStore((s) => s.deleteConnection)
  const connect = useConnectionStore((s) => s.connect)
  const disconnect = useConnectionStore((s) => s.disconnect)

  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [passwordPrompt, setPasswordPrompt] = useState<{
    id: string
    authMethod: 'key' | 'password'
  } | null>(null)
  const [promptPassword, setPromptPassword] = useState('')

  const editingConn = editingId ? connections.find((c) => c.id === editingId) : undefined

  const handleAdd = (conn: Omit<SSHConnectionSaved, 'id'>) => {
    addConnection(conn)
    setView('list')
  }

  const handleEdit = (conn: Omit<SSHConnectionSaved, 'id'>) => {
    if (editingId) {
      updateConnection(editingId, conn)
    }
    setEditingId(null)
    setView('list')
  }

  const handleDelete = (id: string) => {
    disconnect(id)
    deleteConnection(id)
  }

  const handleConnect = (conn: SSHConnectionSaved) => {
    const status = statuses[conn.id]?.status
    if (status === 'connected' || status === 'connecting') {
      disconnect(conn.id)
      return
    }

    if (conn.authMethod === 'password') {
      setPasswordPrompt({ id: conn.id, authMethod: 'password' })
      setPromptPassword('')
    } else {
      // Key auth — might need passphrase, try without first
      connect(conn.id)
    }
  }

  const handlePasswordSubmit = () => {
    if (!passwordPrompt) return
    if (passwordPrompt.authMethod === 'password') {
      connect(passwordPrompt.id, promptPassword)
    } else {
      connect(passwordPrompt.id, undefined, promptPassword)
    }
    setPasswordPrompt(null)
    setPromptPassword('')
  }

  const statusColor = (connId: string): string => {
    const status = statuses[connId]?.status
    if (status === 'connected') return 'bg-success'
    if (status === 'connecting') return 'bg-warning animate-pulse'
    if (status === 'error') return 'bg-error'
    return 'bg-text-secondary/30'
  }

  const statusLabel = (connId: string): string => {
    const entry = statuses[connId]
    if (!entry) return 'Disconnected'
    if (entry.status === 'connected') return 'Connected'
    if (entry.status === 'connecting') return 'Connecting...'
    if (entry.status === 'error') return entry.error || 'Error'
    return 'Disconnected'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-[460px] rounded-xl border border-border-default bg-surface-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">
              {view === 'add'
                ? 'New Connection'
                : view === 'edit'
                  ? 'Edit Connection'
                  : 'SSH Connections'}
            </h2>
          </div>
          <button
            onClick={closeManager}
            className="rounded p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Password prompt overlay */}
        {passwordPrompt && (
          <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
            <label className="mb-1.5 block text-[11px] font-medium text-text-primary">
              {passwordPrompt.authMethod === 'password' ? 'Enter password' : 'Enter key passphrase'}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={promptPassword}
                onChange={(e) => setPromptPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
                className="flex-1 rounded border border-border-default bg-surface-0 px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
              />
              <button
                onClick={handlePasswordSubmit}
                className="rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white hover:bg-accent/80"
              >
                Connect
              </button>
              <button
                onClick={() => setPasswordPrompt(null)}
                className="rounded px-2 py-1.5 text-[11px] text-text-secondary hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {view === 'list' ? (
          <>
            {/* Connection List */}
            {connections.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-secondary">
                No SSH connections configured yet.
              </div>
            ) : (
              <div className="max-h-[300px] space-y-1.5 overflow-y-auto">
                {connections.map((conn) => (
                  <div
                    key={conn.id}
                    className="group flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${statusColor(conn.id)}`} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-text-primary">
                          {conn.name}
                        </div>
                        <div className="truncate text-[10px] text-text-secondary">
                          {conn.username}@{conn.host}:{conn.port} &middot; {statusLabel(conn.id)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleConnect(conn)}
                        className="rounded p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                        title={statuses[conn.id]?.status === 'connected' ? 'Disconnect' : 'Connect'}
                      >
                        {statuses[conn.id]?.status === 'connected' ||
                        statuses[conn.id]?.status === 'connecting' ? (
                          <Unplug size={13} />
                        ) : (
                          <Plug size={13} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(conn.id)
                          setView('edit')
                        }}
                        className="rounded p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="rounded p-1.5 text-text-secondary transition-colors hover:bg-error/10 hover:text-error"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add button */}
            <button
              onClick={() => setView('add')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-default py-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <Plus size={13} />
              Add Connection
            </button>
          </>
        ) : view === 'add' ? (
          <ConnectionForm onSave={handleAdd} onCancel={() => setView('list')} />
        ) : (
          <ConnectionForm
            initial={editingConn}
            onSave={handleEdit}
            onCancel={() => {
              setEditingId(null)
              setView('list')
            }}
          />
        )}
      </div>
    </div>
  )
}
