import { useState, useRef } from 'react'
import { PanelLeft, SquareTerminal, Globe } from 'lucide-react'
import { useProjectStore } from '../../store/projectStore'
import { useUIStore } from '../../store/uiStore'
import { IconButton } from '../common/IconButton'
import { TermSwarmLogo } from '../common/TermSwarmLogo'
import { EmulatorDropdown } from './EmulatorDropdown'

const isIOSAvailable = window.api.platform === 'darwin'

function AndroidIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48A5.84 5.84 0 0012 1c-.96 0-1.86.23-2.66.63L7.85.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31A5.983 5.983 0 006 7h12c0-2.21-1.2-4.15-2.97-5.18-.07-.05-.14-.1-.22-.16l.22-.5zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

export function TitleBar() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const terminalHidden = useUIStore((s) => s.terminalHidden)
  const toggleTerminal = useUIStore((s) => s.toggleTerminal)
  const previewOpen = useUIStore((s) => s.previewOpen)
  const togglePreview = useUIStore((s) => s.togglePreview)

  const [androidOpen, setAndroidOpen] = useState(false)
  const [iosOpen, setIOSOpen] = useState(false)
  const androidRef = useRef<HTMLButtonElement>(null)
  const iosRef = useRef<HTMLButtonElement>(null)

  return (
    <div
      className="drag-region relative flex h-[var(--spacing-titlebar)] items-center border-b border-border-default bg-surface-1"
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2">
        <TermSwarmLogo size={14} />
        <span className="text-xs font-medium text-text-primary">TermSwarm</span>
        {activeProject && (
          <>
            <span className="text-text-secondary">—</span>
            <span className="text-xs text-text-secondary">{activeProject.name}</span>
          </>
        )}
      </div>
      <div className="no-drag ml-auto mr-3 flex items-center gap-1">
        <IconButton
          ref={androidRef}
          tooltip="Android emulators"
          onClick={() => { setAndroidOpen(!androidOpen); setIOSOpen(false) }}
          className={androidOpen ? 'text-accent' : ''}
        >
          <AndroidIcon />
        </IconButton>
        {isIOSAvailable && (
          <IconButton
            ref={iosRef}
            tooltip="iOS simulators"
            onClick={() => { setIOSOpen(!iosOpen); setAndroidOpen(false) }}
            className={iosOpen ? 'text-accent' : ''}
          >
            <AppleIcon />
          </IconButton>
        )}
        <div className="mx-1 h-4 w-px bg-border-default" />
        <IconButton
          tooltip={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          onClick={toggleSidebar}
          className={sidebarCollapsed ? '' : 'text-accent'}
        >
          <PanelLeft size={14} />
        </IconButton>
        <IconButton
          tooltip={terminalHidden ? 'Show terminal' : 'Hide terminal'}
          onClick={toggleTerminal}
          className={terminalHidden ? '' : 'text-accent'}
        >
          <SquareTerminal size={14} />
        </IconButton>
        <IconButton
          tooltip={previewOpen ? 'Hide preview' : 'Show preview'}
          onClick={togglePreview}
          className={previewOpen ? 'text-accent' : ''}
        >
          <Globe size={14} />
        </IconButton>
      </div>

      <EmulatorDropdown
        type="android"
        anchorRef={androidRef}
        isOpen={androidOpen}
        onClose={() => setAndroidOpen(false)}
      />
      {isIOSAvailable && (
        <EmulatorDropdown
          type="ios"
          anchorRef={iosRef}
          isOpen={iosOpen}
          onClose={() => setIOSOpen(false)}
        />
      )}
    </div>
  )
}
