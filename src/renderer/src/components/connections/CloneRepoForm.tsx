import { useState, useEffect, useMemo } from 'react'
import { GitBranch, Loader2, Check, X, FolderOpen, Lock, Search } from 'lucide-react'
import { useConnectionStore } from '../../store/connectionStore'
import type { GitHubRepo } from '../../../../shared/sshTypes'

interface CloneRepoFormProps {
  connectionId: string
  defaultTargetDir: string
  onCloned: (path: string, name: string) => void
  onCancel: () => void
}

export function CloneRepoForm({
  connectionId,
  defaultTargetDir,
  onCloned,
  onCancel
}: CloneRepoFormProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [targetDir, setTargetDir] = useState(defaultTargetDir)
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [reposError, setReposError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [manualMode, setManualMode] = useState(false)

  const gitToken = useConnectionStore.getState().getGitToken(connectionId)
  const hasToken = Boolean(gitToken)

  // Fetch repos on mount if token exists
  useEffect(() => {
    if (!gitToken) return
    setLoadingRepos(true)
    setReposError(null)
    window.api
      .githubListRepos(gitToken)
      .then((result) => {
        if (result.success && result.repos) {
          setRepos(result.repos)
        } else {
          setReposError(result.error || 'Failed to fetch repos')
        }
      })
      .finally(() => setLoadingRepos(false))
  }, [gitToken])

  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const q = search.toLowerCase()
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    )
  }, [repos, search])

  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    setRepoUrl(repo.cloneUrl)
    setError(null)
  }

  const handleClone = async () => {
    const url = repoUrl.trim()
    if (!url || !targetDir.trim()) return
    setCloning(true)
    setError(null)

    const result = await window.api.sshGitClone(connectionId, url, targetDir.trim())

    if (result.success && result.path && result.name) {
      onCloned(result.path, result.name)
    } else {
      setError(result.error || 'Clone failed')
      setCloning(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !cloning && repoUrl.trim()) handleClone()
    else if (e.key === 'Escape') onCancel()
  }

  // Show URL form: when repo selected, manual mode, or no token
  if (selectedRepo || manualMode || !hasToken) {
    return (
      <div className="flex flex-col gap-2">
        {/* Repo URL */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Repository URL
          </label>
          <div className="flex items-center gap-1.5">
            <GitBranch size={12} className="shrink-0 text-text-secondary" />
            <input
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value)
                setSelectedRepo(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/user/repo.git"
              autoFocus={!hasToken}
              className="flex-1 rounded border border-border-default bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
            />
          </div>
          {selectedRepo && (
            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-accent">
              {selectedRepo.private && <Lock size={8} />}
              {selectedRepo.fullName}
              {selectedRepo.description && (
                <span className="text-text-secondary/60"> — {selectedRepo.description}</span>
              )}
            </p>
          )}
        </div>

        {/* Target directory */}
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-text-secondary">
            Clone into
          </label>
          <div className="flex items-center gap-1.5">
            <FolderOpen size={12} className="shrink-0 text-text-secondary" />
            <input
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded border border-border-default bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded bg-error/10 px-2.5 py-1.5 text-[11px] text-error">{error}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-1.5">
          {hasToken && (selectedRepo || manualMode) && (
            <button
              onClick={() => {
                setSelectedRepo(null)
                setManualMode(false)
                setRepoUrl('')
              }}
              disabled={cloning}
              className="mr-auto flex items-center gap-1 rounded px-2.5 py-1 text-[10px] text-accent hover:bg-accent/10"
            >
              Back to list
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={cloning}
            className="flex items-center gap-1 rounded px-2.5 py-1 text-[10px] text-text-secondary hover:bg-white/10 hover:text-text-primary disabled:opacity-40"
          >
            <X size={10} />
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!repoUrl.trim() || !targetDir.trim() || cloning}
            className="flex items-center gap-1 rounded bg-accent px-2.5 py-1 text-[10px] font-medium text-white transition-colors hover:bg-accent/80 disabled:opacity-40"
          >
            {cloning ? (
              <>
                <Loader2 size={10} className="animate-spin" />
                Cloning...
              </>
            ) : (
              <>
                <Check size={10} />
                Clone
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Repo browser (when token is available)
  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search repositories..."
          autoFocus
          className="w-full rounded border border-border-default bg-surface-0 py-1.5 pl-7 pr-2 text-xs text-text-primary outline-none placeholder:text-text-secondary/50 focus:border-accent"
        />
      </div>

      {/* Repo list */}
      <div className="max-h-[220px] min-h-[100px] overflow-y-auto rounded border border-border-default bg-surface-0">
        {loadingRepos ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 size={14} className="animate-spin text-text-secondary" />
            <span className="text-[11px] text-text-secondary">Loading repositories...</span>
          </div>
        ) : reposError ? (
          <div className="px-3 py-4 text-center text-[11px] text-error">{reposError}</div>
        ) : filteredRepos.length === 0 ? (
          <div className="px-3 py-4 text-center text-[11px] text-text-secondary">
            {search ? 'No repos match your search' : 'No repositories found'}
          </div>
        ) : (
          filteredRepos.map((repo) => (
            <button
              key={repo.fullName}
              onClick={() => handleSelectRepo(repo)}
              className="flex w-full items-start gap-2 border-b border-border-default/50 px-2.5 py-2 text-left transition-colors last:border-0 hover:bg-white/5"
            >
              <GitBranch size={12} className="mt-0.5 shrink-0 text-text-secondary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[11px] font-medium text-text-primary">
                    {repo.fullName}
                  </span>
                  {repo.private && <Lock size={9} className="shrink-0 text-warning" />}
                </div>
                {repo.description && (
                  <p className="truncate text-[10px] text-text-secondary/70">{repo.description}</p>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Manual URL option + cancel */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setManualMode(true)}
          className="text-[10px] text-text-secondary hover:text-accent"
        >
          Or enter URL manually
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-[10px] text-text-secondary hover:bg-white/10 hover:text-text-primary"
        >
          <X size={10} />
          Cancel
        </button>
      </div>
    </div>
  )
}
