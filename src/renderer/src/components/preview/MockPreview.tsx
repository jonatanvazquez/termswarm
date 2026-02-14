import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Globe,
  Smartphone,
  Monitor,
  Maximize2
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useProjectStore } from '../../store/projectStore'
import { IconButton } from '../common/IconButton'

type DeviceMode = 'desktop' | 'mobile'

export function MockPreview() {
  const previewUrl = useUIStore((s) => s.previewUrl)
  const setPreviewUrl = useUIStore((s) => s.setPreviewUrl)
  const togglePreview = useUIStore((s) => s.togglePreview)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const projects = useProjectStore((s) => s.projects)
  const activeProject = projects.find((p) => p.id === activeProjectId)

  const [urlInput, setUrlInput] = useState(previewUrl)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUrlSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      let url = urlInput.trim()
      if (url && !url.startsWith('http')) url = `http://${url}`
      setPreviewUrl(url)
    }
  }

  return (
    <div className="flex w-full flex-col bg-surface-1">
      {/* Browser chrome */}
      <div className="flex h-[var(--spacing-tabbar)] items-center gap-1 border-b border-border-default px-2">
        <IconButton tooltip="Back">
          <ArrowLeft size={12} />
        </IconButton>
        <IconButton tooltip="Forward">
          <ArrowRight size={12} />
        </IconButton>
        <IconButton tooltip="Reload" onClick={() => setRefreshKey((k) => k + 1)}>
          <RotateCw size={12} />
        </IconButton>

        {/* URL bar */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded bg-surface-0 px-2 py-1">
          <Globe size={10} className="shrink-0 text-text-secondary" />
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleUrlSubmit}
            className="min-w-0 flex-1 bg-transparent text-[11px] text-text-primary outline-none placeholder:text-text-secondary"
            placeholder="http://localhost:3000"
          />
        </div>

        {/* Device toggles */}
        <IconButton
          tooltip="Desktop"
          onClick={() => setDeviceMode('desktop')}
          className={deviceMode === 'desktop' ? 'text-accent' : ''}
        >
          <Monitor size={12} />
        </IconButton>
        <IconButton
          tooltip="Mobile"
          onClick={() => setDeviceMode('mobile')}
          className={deviceMode === 'mobile' ? 'text-accent' : ''}
        >
          <Smartphone size={12} />
        </IconButton>

        <div className="mx-1 h-3 w-px bg-border-default" />

        <IconButton tooltip="Close preview" onClick={togglePreview}>
          <X size={12} />
        </IconButton>
      </div>

      {/* Mock browser viewport */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-surface-0 p-4">
        <div
          key={refreshKey}
          className={`flex h-full flex-col overflow-hidden rounded-lg border border-border-default bg-white shadow-lg ${
            deviceMode === 'mobile' ? 'w-[375px]' : 'w-full'
          }`}
        >
          {/* Mock page content */}
          <MockPageContent projectName={activeProject?.name} url={previewUrl} />
        </div>
      </div>
    </div>
  )
}

function MockPageContent({ projectName, url }: { projectName?: string; url: string }) {
  return (
    <div className="flex h-full flex-col bg-[#0f0f0f] text-white">
      {/* Mock nav */}
      <nav className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <span className="text-sm font-bold">{projectName || 'Preview'}</span>
        <div className="flex gap-4 text-xs text-white/50">
          <span>Features</span>
          <span>Pricing</span>
          <span>Docs</span>
        </div>
      </nav>

      {/* Mock hero */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Maximize2 size={20} />
        </div>
        <h1 className="text-2xl font-bold">
          {projectName || 'Your App'}
        </h1>
        <p className="max-w-md text-sm text-white/50">
          Live preview of your development server. When connected to a real terminal,
          this panel will show {url} with hot-reload.
        </p>
        <div className="mt-2 flex gap-3">
          <div className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium">
            Get Started
          </div>
          <div className="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-white/70">
            Learn More
          </div>
        </div>

        {/* Mock stats */}
        <div className="mt-8 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-lg font-bold text-blue-400">4.2k</div>
            <div className="text-[10px] text-white/40">Users</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-400">99.9%</div>
            <div className="text-[10px] text-white/40">Uptime</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">12ms</div>
            <div className="text-[10px] text-white/40">Latency</div>
          </div>
        </div>
      </div>

      {/* Mock footer */}
      <div className="border-t border-white/10 px-6 py-3 text-center text-[10px] text-white/30">
        {url} — Development Preview
      </div>
    </div>
  )
}
