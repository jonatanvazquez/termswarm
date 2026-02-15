import { useGitStore } from '../../store/gitStore'

interface GitCommitFormProps {
  projectPath: string
}

export function GitCommitForm({ projectPath }: GitCommitFormProps) {
  const ps = useGitStore((s) => s.projects[projectPath])
  const setCommitMessage = useGitStore((s) => s.setCommitMessage)
  const commit = useGitStore((s) => s.commit)

  const message = ps?.commitMessage || ''
  const committing = ps?.committing || false
  const stagedCount = ps?.status?.staged.length || 0
  const canCommit = message.trim().length > 0 && stagedCount > 0 && !committing

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canCommit) {
      e.preventDefault()
      commit(projectPath)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <textarea
        rows={2}
        placeholder="Commit message"
        value={message}
        onChange={(e) => setCommitMessage(projectPath, e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full resize-none rounded border border-border-default bg-surface-0 px-2 py-1 text-[11px] text-text-primary placeholder-text-secondary outline-none focus:border-accent"
      />
      <button
        disabled={!canCommit}
        onClick={() => commit(projectPath)}
        className="w-full rounded bg-accent px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {committing ? 'Committing...' : `Commit${stagedCount > 0 ? ` (${stagedCount})` : ''}`}
      </button>
    </div>
  )
}
