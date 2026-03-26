import { useState, useRef } from 'react'
import { FolderOpen, Check, X, Server, Monitor, Plus, GitBranch, Pencil } from 'lucide-react'
import { PROJECT_COLORS } from '../../store/projectStore'
import { useConnectionStore } from '../../store/connectionStore'
import { RemoteFolderPicker } from '../connections/RemoteFolderPicker'
import { CloneRepoForm } from '../connections/CloneRepoForm'

interface NewProjectFormProps {
  onSubmit: (name: string, path: string, color: string, connectionId?: string) => void
  onCancel: () => void
}

export function NewProjectForm({ onSubmit, onCancel }: NewProjectFormProps) {
  const [mode, setMode] = useState<'local' | 'remote'>('local')
  const [remoteAction, setRemoteAction] = useState<'browse' | 'clone' | null>(null)
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  const connections = useConnectionStore((s) => s.connections)
  const statuses = useConnectionStore((s) => s.statuses)
  const connect = useConnectionStore((s) => s.connect)
  const openManager = useConnectionStore((s) => s.openManager)
  const [connecting, setConnecting] = useState(false)

  const handleBrowse = async () => {
    const selected = await window.api.selectDirectory()
    if (selected) {
      setPath(selected)
      const folderName = selected.split('/').pop() || ''
      setName(folderName)
      setTimeout(() => nameRef.current?.select(), 50)
    }
  }

  const handleSubmit = () => {
    if (name.trim() && path) {
      onSubmit(
        name.trim(),
        path,
        color,
        mode === 'remote' && connectionId ? connectionId : undefined
      )
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
    else if (e.key === 'Escape') onCancel()
  }

  const handleRemoteFolderSelect = (remotePath: string) => {
    setPath(remotePath)
    const folderName = remotePath.split('/').pop() || ''
    setName(folderName)
    setShowFolderPicker(false)
    setRemoteAction(null)
    setTimeout(() => nameRef.current?.select(), 50)
  }

  const handleCloned = (clonedPath: string, repoName: string) => {
    setPath(clonedPath)
    setName(repoName)
    setRemoteAction(null)
    setTimeout(() => nameRef.current?.select(), 50)
  }

  const handleModeSwitch = (newMode: 'local' | 'remote') => {
    setMode(newMode)
    setPath('')
    setName('')
    setConnectionId(null)
    setShowFolderPicker(false)
    setRemoteAction(null)
  }

  return (
    <div className="mx-1 rounded-lg border border-accent/50 bg-surface-2 p-2.5">
      {/* Mode toggle */}
      <div className="mb-2 flex rounded bg-surface-0 p-0.5">
        <button
          onClick={() => handleModeSwitch('local')}
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
            mode === 'local'
              ? 'bg-surface-3 text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Monitor size={10} />
          Local
        </button>
        <button
          onClick={() => handleModeSwitch('remote')}
          className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
            mode === 'remote'
              ? 'bg-surface-3 text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Server size={10} />
          Remote
        </button>
      </div>

      {/* Local: browse button */}
      {mode === 'local' && !path && (
        <button
          onClick={handleBrowse}
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded border border-dashed border-border-default py-2 text-[11px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          <FolderOpen size={12} />
          Browse Local Folder
        </button>
      )}

      {/* Remote: connection selector + actions */}
      {mode === 'remote' && (
        <>
          {/* Connection selector */}
          <div className="mb-2">
            <div className="flex items-center gap-1">
              <select
                value={connectionId ?? ''}
                onChange={async (e) => {
                  const id = e.target.value || null
                  setConnectionId(id)
                  setPath('')
                  setName('')
                  setShowFolderPicker(false)
                  setRemoteAction(null)

                  // Auto-connect if not already connected
                  if (id) {
                    const status = useConnectionStore.getState().statuses[id]?.status
                    if (status !== 'connected' && status !== 'connecting') {
                      setConnecting(true)
                      await connect(id)
                      setConnecting(false)
                    }
                  }
                }}
                className="flex-1 rounded border border-border-default bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
              >
                <option value="">Select connection...</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.username}@{c.host})
                  </option>
                ))}
              </select>
              {connectionId && (
                <button
                  onClick={openManager}
                  className="rounded border border-border-default bg-surface-0 p-1 text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                  title="Edit connection"
                >
                  <Pencil size={12} />
                </button>
              )}
              <button
                onClick={openManager}
                className="rounded border border-border-default bg-surface-0 p-1 text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                title="Manage connections"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Connection status */}
          {connectionId && connecting && (
            <div className="mb-2 flex items-center gap-1.5 rounded bg-accent/5 px-2 py-1.5 text-[11px] text-accent">
              <div className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Connecting...
            </div>
          )}

          {connectionId && !connecting && statuses[connectionId]?.status === 'error' && (
            <div className="mb-2 rounded bg-error/10 px-2 py-1.5 text-[11px] text-error">
              {statuses[connectionId]?.error || 'Connection failed'}
            </div>
          )}

          {/* Action buttons: Browse or Clone */}
          {connectionId &&
            !path &&
            !remoteAction &&
            !connecting &&
            statuses[connectionId]?.status === 'connected' && (
              <div className="mb-2 flex gap-1.5">
                <button
                  onClick={() => {
                    setRemoteAction('browse')
                    setShowFolderPicker(true)
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded border border-dashed border-border-default py-2 text-[11px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <FolderOpen size={12} />
                  Browse Folders
                </button>
                <button
                  onClick={() => setRemoteAction('clone')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded border border-dashed border-border-default py-2 text-[11px] text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <GitBranch size={12} />
                  Clone Repo
                </button>
              </div>
            )}

          {/* Remote folder picker */}
          {connectionId && remoteAction === 'browse' && showFolderPicker && !path && (
            <div className="mb-2">
              <RemoteFolderPicker
                connectionId={connectionId}
                onSelect={handleRemoteFolderSelect}
                onCancel={() => {
                  setShowFolderPicker(false)
                  setRemoteAction(null)
                }}
              />
            </div>
          )}

          {/* Clone repo form */}
          {connectionId && remoteAction === 'clone' && !path && (
            <div className="mb-2">
              <CloneRepoForm
                connectionId={connectionId}
                defaultTargetDir="~/GitHub"
                onCloned={handleCloned}
                onCancel={() => setRemoteAction(null)}
              />
            </div>
          )}
        </>
      )}

      {/* Folder display + change (shown when path is selected) */}
      {path && (
        <button
          onClick={
            mode === 'local'
              ? handleBrowse
              : () => {
                  setPath('')
                  setName('')
                  setRemoteAction(null)
                }
          }
          className="mb-2 flex w-full items-center gap-1.5 rounded border border-border-default bg-surface-0 px-2 py-1 text-left text-xs text-text-secondary hover:border-accent hover:text-text-primary"
        >
          {mode === 'remote' ? (
            <Server size={11} className="shrink-0 text-accent" />
          ) : (
            <FolderOpen size={11} className="shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">{path}</span>
        </button>
      )}

      {/* Name input (shown when path is selected) */}
      {path && (
        <>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Project name..."
            className="mb-2 w-full rounded border border-border-default bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-accent"
          />

          {/* Color swatches */}
          <div className="mb-2 flex items-center gap-1">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="flex h-4.5 w-4.5 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
              >
                {color === c && <Check size={9} className="text-white drop-shadow" />}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] text-text-secondary hover:bg-surface-3 hover:text-text-primary"
        >
          <X size={10} />
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !path}
          className="flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-[10px] text-white hover:bg-accent/80 disabled:opacity-40"
        >
          <Check size={10} />
          Create
        </button>
      </div>
    </div>
  )
}
