import { useRef, useCallback, useState, useEffect } from 'react'
import { ChevronRight, GitBranch, RefreshCw } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { useGitStore } from '../../store/gitStore'
import { SidebarActions } from '../sidebar/SidebarActions'
import { ProjectList } from '../sidebar/ProjectList'
import { GitPanel } from '../sidebar/GitPanel'

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const width = useUIStore((s) => s.sidebarWidth)
  const gitPanelCollapsed = useUIStore((s) => s.gitPanelCollapsed)
  const gitPanelHeight = useUIStore((s) => s.gitPanelHeight)
  const toggleGitPanel = useUIStore((s) => s.toggleGitPanel)
  const setGitPanelHeight = useUIStore((s) => s.setGitPanelHeight)

  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)

  const startPolling = useGitStore((s) => s.startPolling)
  const stopPolling = useGitStore((s) => s.stopPolling)
  const pullAction = useGitStore((s) => s.pull)
  const gitStatus = useGitStore((s) => {
    const activeProject = projects.find((p) => p.id === activeProjectId)
    const path = activeProject?.path ?? ''
    return s.projects[path]?.status ?? null
  })
  const pulling = useGitStore((s) => {
    const activeProject = projects.find((p) => p.id === activeProjectId)
    const path = activeProject?.path ?? ''
    return s.projects[path]?.pulling ?? false
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pullMessage, setPullMessage] = useState<{ text: string; error: boolean } | null>(null)

  // Auto-clear pull message after 5s
  useEffect(() => {
    if (!pullMessage) return
    const timer = setTimeout(() => setPullMessage(null), 5000)
    return () => clearTimeout(timer)
  }, [pullMessage])

  const handlePull = useCallback(async () => {
    const activeProject = projects.find((p) => p.id === activeProjectId)
    const path = activeProject?.path
    if (!path || pulling) return
    const result = await pullAction(path)
    if (!result.success) {
      setPullMessage({ text: result.message, error: true })
    }
  }, [activeProjectId, projects, pulling, pullAction])

  // Git polling for active project
  useEffect(() => {
    const activeProject = projects.find((p) => p.id === activeProjectId)
    const path = activeProject?.path
    if (!path) return
    startPolling(path)
    return () => stopPolling(path)
  }, [activeProjectId, projects, startPolling, stopPolling])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      setIsDragging(true)

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const newHeight = rect.bottom - ev.clientY
        const clamped = Math.max(80, Math.min(newHeight, rect.height - 120))
        setGitPanelHeight(clamped)
      }

      const onMouseUp = () => {
        dragging.current = false
        setIsDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [setGitPanelHeight]
  )

  if (collapsed) return null

  const totalChanges = gitStatus?.isGitRepo
    ? gitStatus.staged.length + gitStatus.unstaged.length + gitStatus.untracked.length
    : 0

  return (
    <div
      ref={containerRef}
      className="flex flex-col border-r border-border-default bg-surface-1"
      style={{ width }}
    >
      {/* Drag overlay — captures mouse during resize */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-row-resize" />}

      <SidebarActions />

      {/* Project list — takes remaining space above git panel */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <ProjectList />
      </div>

      {/* Draggable divider */}
      {!gitPanelCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="group flex h-1 shrink-0 cursor-row-resize items-center justify-center hover:bg-accent/30"
        >
          <div className="h-0.5 w-8 rounded-full bg-border-default transition-colors group-hover:bg-accent" />
        </div>
      )}

      {/* Git panel header */}
      <div className="flex shrink-0 flex-col border-t border-border-default">
        <div className="flex w-full items-center gap-1 px-3 py-1.5">
          <button
            onClick={toggleGitPanel}
            className="flex flex-1 items-center gap-1 text-[10px] font-medium uppercase text-text-secondary hover:text-text-primary"
          >
            <ChevronRight
              size={10}
              className={`shrink-0 transition-transform ${!gitPanelCollapsed ? 'rotate-90' : ''}`}
            />
            <GitBranch size={10} className="shrink-0" />
            Source Control
            {totalChanges > 0 && (
              <span className="ml-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent/20 px-1 text-[9px] font-medium text-accent">
                {totalChanges}
              </span>
            )}
          </button>
          {gitStatus?.isGitRepo && (
            <div className="flex items-center gap-1">
              {(gitStatus.ahead > 0 || gitStatus.behind > 0) && (
                <span className="text-[9px] text-text-secondary">
                  {gitStatus.ahead > 0 && `↑${gitStatus.ahead}`}
                  {gitStatus.ahead > 0 && gitStatus.behind > 0 && ' '}
                  {gitStatus.behind > 0 && `↓${gitStatus.behind}`}
                </span>
              )}
              <button
                onClick={handlePull}
                disabled={pulling}
                title="Sync (pull)"
                className="flex h-4 w-4 items-center justify-center rounded text-text-secondary hover:bg-surface-3 hover:text-text-primary disabled:opacity-50"
              >
                <RefreshCw size={10} className={pulling ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>
        {pullMessage && (
          <div
            className={`px-3 pb-1 text-[10px] ${pullMessage.error ? 'text-red-400' : 'text-text-secondary'}`}
          >
            {pullMessage.text}
          </div>
        )}
      </div>

      {/* Git panel body */}
      {!gitPanelCollapsed && (
        <div className="shrink-0 overflow-y-auto" style={{ height: gitPanelHeight }}>
          <GitPanel />
        </div>
      )}
    </div>
  )
}
