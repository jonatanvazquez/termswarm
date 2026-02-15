import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Check, X } from 'lucide-react'
import { PROJECT_COLORS } from '../../store/projectStore'

interface NewProjectFormProps {
  onSubmit: (name: string, path: string, color: string) => void
  onCancel: () => void
}

export function NewProjectForm({ onSubmit, onCancel }: NewProjectFormProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const nameRef = useRef<HTMLInputElement>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel
  const didOpenRef = useRef(false)

  // Auto-open folder picker once on mount (guard against StrictMode double-fire)
  useEffect(() => {
    if (didOpenRef.current) return
    didOpenRef.current = true
    ;(async () => {
      const selected = await window.api.selectDirectory()
      if (selected) {
        setPath(selected)
        const folderName = selected.split('/').pop() || ''
        setName(folderName)
        setTimeout(() => nameRef.current?.select(), 50)
      } else {
        onCancelRef.current()
      }
    })()
  }, [])

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
      onSubmit(name.trim(), path, color)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
    else if (e.key === 'Escape') onCancel()
  }

  // Don't render form until folder is selected
  if (!path) return null

  return (
    <div className="mx-1 rounded-lg border border-accent/50 bg-surface-2 p-2.5">
      {/* Folder display + change */}
      <button
        onClick={handleBrowse}
        className="mb-2 flex w-full items-center gap-1.5 rounded border border-border-default bg-surface-0 px-2 py-1 text-left text-xs text-text-secondary hover:border-accent hover:text-text-primary"
      >
        <FolderOpen size={11} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">{path}</span>
      </button>

      {/* Name input (auto-filled from folder) */}
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
