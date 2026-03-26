import { useState, useEffect } from 'react'
import { ChevronRight, Folder, FolderOpen, Loader2, ArrowUp, Check, X } from 'lucide-react'
import type { SFTPEntry } from '../../../../shared/sshTypes'

interface RemoteFolderPickerProps {
  connectionId: string
  onSelect: (path: string) => void
  onCancel: () => void
}

export function RemoteFolderPicker({ connectionId, onSelect, onCancel }: RemoteFolderPickerProps) {
  const [currentPath, setCurrentPath] = useState('/home')
  const [entries, setEntries] = useState<SFTPEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDirectory = async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const items = await window.api.sshListDir(connectionId, path)
      setEntries(items.filter((e) => e.isDirectory))
      setCurrentPath(path)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDirectory(currentPath)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = (dirName: string) => {
    const newPath = currentPath === '/' ? `/${dirName}` : `${currentPath}/${dirName}`
    loadDirectory(newPath)
  }

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
    loadDirectory(parent)
  }

  const pathParts = currentPath.split('/').filter(Boolean)

  return (
    <div className="flex flex-col gap-2">
      {/* Breadcrumb path */}
      <div className="flex items-center gap-1 overflow-x-auto rounded bg-surface-0 px-2.5 py-1.5">
        <button
          onClick={navigateUp}
          disabled={currentPath === '/'}
          className="shrink-0 rounded p-0.5 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-30"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={() => loadDirectory('/')}
          className="shrink-0 text-[11px] text-text-secondary hover:text-accent"
        >
          /
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex shrink-0 items-center gap-1">
            <ChevronRight size={10} className="text-text-secondary/50" />
            <button
              onClick={() => loadDirectory('/' + pathParts.slice(0, i + 1).join('/'))}
              className="text-[11px] text-text-secondary hover:text-accent"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* Directory listing */}
      <div className="max-h-[240px] min-h-[120px] overflow-y-auto rounded border border-border-default bg-surface-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-text-secondary" />
          </div>
        ) : error ? (
          <div className="px-3 py-4 text-center text-[11px] text-error">{error}</div>
        ) : entries.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-text-secondary">
            No subdirectories
          </div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.name}
              onDoubleClick={() => navigateTo(entry.name)}
              onClick={() => navigateTo(entry.name)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
            >
              {entry.isDirectory ? (
                <Folder size={13} className="shrink-0 text-accent/70" />
              ) : (
                <FolderOpen size={13} className="shrink-0 text-text-secondary" />
              )}
              <span className="truncate text-[11px] text-text-primary">{entry.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Current selection */}
      <div className="rounded bg-accent/5 px-2.5 py-1.5 text-[11px] text-accent">
        Selected: {currentPath}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1.5">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded px-3 py-1.5 text-[11px] text-text-secondary hover:bg-white/10 hover:text-text-primary"
        >
          <X size={12} />
          Cancel
        </button>
        <button
          onClick={() => onSelect(currentPath)}
          className="flex items-center gap-1 rounded bg-accent px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-accent/80"
        >
          <Check size={12} />
          Select Folder
        </button>
      </div>
    </div>
  )
}
