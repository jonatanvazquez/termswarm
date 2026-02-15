import type { GitCommit } from '../../../../shared/gitTypes'

interface GitLogListProps {
  commits: GitCommit[]
}

export function GitLogList({ commits }: GitLogListProps) {
  if (commits.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      {commits.map((c) => (
        <div
          key={c.hash}
          className="flex items-baseline gap-1.5 rounded px-1.5 py-0.5 text-[11px] hover:bg-surface-2"
        >
          <span className="shrink-0 font-mono text-accent">{c.hash}</span>
          <span className="min-w-0 flex-1 truncate text-text-primary">{c.message}</span>
          <span className="shrink-0 text-[10px] text-text-secondary">{c.relativeDate}</span>
        </div>
      ))}
    </div>
  )
}
