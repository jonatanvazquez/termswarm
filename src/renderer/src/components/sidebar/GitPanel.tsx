import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useGitStore } from '../../store/gitStore'
import { GitChangedFileItem } from './GitChangedFileItem'
import { GitCommitForm } from './GitCommitForm'
import { GitLogList } from './GitLogList'

const MAX_FILES_PER_SECTION = 100

type GitTab = 'changes' | 'history'

export function GitPanel() {
  const [activeTab, setActiveTab] = useState<GitTab>('changes')

  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)
  const projectPath = activeProject?.path ?? ''

  const ps = useGitStore((s) => s.projects[projectPath])
  const stageFiles = useGitStore((s) => s.stageFiles)
  const unstageFiles = useGitStore((s) => s.unstageFiles)
  const stageAll = useGitStore((s) => s.stageAll)
  const unstageAll = useGitStore((s) => s.unstageAll)

  const status = ps?.status
  const log = ps?.log

  if (!projectPath || !status?.isGitRepo) {
    return (
      <div className="flex items-center justify-center py-4 text-[11px] text-text-secondary">
        Not a git repository
      </div>
    )
  }

  const stagedVisible = status.staged.slice(0, MAX_FILES_PER_SECTION)
  const stagedExtra = status.staged.length - stagedVisible.length
  const unstagedAll = [...status.unstaged, ...status.untracked]
  const unstagedVisible = unstagedAll.slice(0, MAX_FILES_PER_SECTION)
  const unstagedExtra = unstagedAll.length - unstagedVisible.length

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-border-default">
        {(['changes', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 text-[10px] font-medium uppercase transition-colors ${
              activeTab === tab
                ? 'border-b border-accent text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'changes' && (
          <div className="flex flex-col gap-2 px-2 pb-2 pt-1">
            {/* Commit form */}
            <GitCommitForm projectPath={projectPath} />

            {/* Staged Changes */}
            {status.staged.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-medium uppercase text-text-secondary">
                    Staged Changes ({status.staged.length})
                  </span>
                  <button
                    onClick={() => unstageAll(projectPath)}
                    title="Unstage all"
                    className="flex h-4 w-4 items-center justify-center rounded text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  >
                    <Minus size={10} />
                  </button>
                </div>
                <div className="flex flex-col">
                  {stagedVisible.map((f) => (
                    <GitChangedFileItem
                      key={`staged-${f.path}`}
                      file={f}
                      onToggle={() => unstageFiles(projectPath, [f.path])}
                    />
                  ))}
                  {stagedExtra > 0 && (
                    <span className="px-1.5 text-[10px] text-text-secondary">
                      (+{stagedExtra} more)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Changes (unstaged + untracked) */}
            {unstagedAll.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-medium uppercase text-text-secondary">
                    Changes ({unstagedAll.length})
                  </span>
                  <button
                    onClick={() => stageAll(projectPath)}
                    title="Stage all"
                    className="flex h-4 w-4 items-center justify-center rounded text-text-secondary hover:bg-surface-3 hover:text-text-primary"
                  >
                    <Plus size={10} />
                  </button>
                </div>
                <div className="flex flex-col">
                  {unstagedVisible.map((f) => (
                    <GitChangedFileItem
                      key={`unstaged-${f.path}`}
                      file={f}
                      onToggle={() => stageFiles(projectPath, [f.path])}
                    />
                  ))}
                  {unstagedExtra > 0 && (
                    <span className="px-1.5 text-[10px] text-text-secondary">
                      (+{unstagedExtra} more)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && log && (
          <div className="px-2 pb-2 pt-1">
            <GitLogList commits={log.commits} />
          </div>
        )}
      </div>
    </div>
  )
}
