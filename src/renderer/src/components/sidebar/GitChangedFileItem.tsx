import { Plus, Minus } from 'lucide-react'
import type { GitChangedFile } from '../../../../shared/gitTypes'

interface GitChangedFileItemProps {
  file: GitChangedFile
  onToggle: () => void
}

const STATUS_COLORS: Record<string, string> = {
  M: 'text-warning',
  A: 'text-success',
  D: 'text-error',
  R: 'text-accent',
  '?': 'text-text-secondary'
}

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

export function GitChangedFileItem({ file, onToggle }: GitChangedFileItemProps) {
  const colorClass = STATUS_COLORS[file.status] || 'text-text-secondary'

  return (
    <div className="group flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] hover:bg-surface-2">
      <span className={`w-3 shrink-0 text-center font-mono font-medium ${colorClass}`}>
        {file.status}
      </span>
      <span className="min-w-0 flex-1 truncate text-text-primary" title={file.path}>
        {basename(file.path)}
      </span>
      {(file.insertions != null || file.deletions != null) && (
        <span className="shrink-0 font-mono text-[9px] flex gap-1">
          {file.insertions != null && file.insertions > 0 && (
            <span className="text-success">+{file.insertions}</span>
          )}
          {file.deletions != null && file.deletions > 0 && (
            <span className="text-error">-{file.deletions}</span>
          )}
        </span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        title={file.staged ? 'Unstage' : 'Stage'}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
      >
        {file.staged ? <Minus size={10} /> : <Plus size={10} />}
      </button>
    </div>
  )
}
