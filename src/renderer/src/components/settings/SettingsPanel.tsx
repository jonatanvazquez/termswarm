import { Download, Loader2, Minus, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

const ZOOM_MIN = 0.75
const ZOOM_MAX = 1.25
const ZOOM_STEP = 0.05

export function SettingsPanel() {
  const zoom = useSettingsStore((s) => s.zoom)
  const setZoom = useSettingsStore((s) => s.setZoom)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)
  const updateStatus = useSettingsStore((s) => s.updateStatus)
  const checkForUpdates = useSettingsStore((s) => s.checkForUpdates)
  const downloadUpdate = useSettingsStore((s) => s.downloadUpdate)
  const installUpdate = useSettingsStore((s) => s.installUpdate)

  const adjustZoom = (delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta))
    setZoom(next)
  }

  const stateLabel: Record<string, string> = {
    idle: 'No updates checked',
    checking: 'Checking...',
    available: `v${updateStatus.version} available`,
    'not-available': 'Up to date',
    downloading: `Downloading... ${updateStatus.progress ?? 0}%`,
    downloaded: `v${updateStatus.version} ready to install`,
    error: updateStatus.error ?? 'Update error'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={toggleSettings}>
      <div
        className="w-[360px] rounded-xl border border-border-default bg-surface-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Settings</h2>
          <button
            onClick={toggleSettings}
            className="rounded p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Zoom setting */}
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
          <span className="text-xs text-text-secondary">Zoom</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustZoom(-ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-xs font-medium text-text-primary">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => adjustZoom(ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
              className="rounded p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Separator */}
        <div className="my-3 h-px bg-border-default" />

        {/* Version */}
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
          <span className="text-xs text-text-secondary">Version</span>
          <span className="text-xs font-medium text-text-primary">
            {updateStatus.currentVersion}
          </span>
        </div>

        {/* Updates */}
        <div className="mt-2 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-text-secondary">Updates</span>
            <span className="text-[10px] text-text-secondary/70">
              {stateLabel[updateStatus.state] ?? updateStatus.state}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {updateStatus.state === 'downloading' && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${updateStatus.progress ?? 0}%` }}
                  />
                </div>
              </div>
            )}

            {updateStatus.state === 'checking' && (
              <Loader2 size={14} className="animate-spin text-text-secondary" />
            )}

            {(updateStatus.state === 'idle' ||
              updateStatus.state === 'not-available' ||
              updateStatus.state === 'error') && (
              <button
                onClick={checkForUpdates}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[10px] font-medium text-text-primary transition-colors hover:bg-white/15"
              >
                <Search size={12} />
                Check
              </button>
            )}

            {updateStatus.state === 'available' && (
              <button
                onClick={downloadUpdate}
                className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-accent/80"
              >
                <Download size={12} />
                Download
              </button>
            )}

            {updateStatus.state === 'downloaded' && (
              <button
                onClick={installUpdate}
                className="flex items-center gap-1 rounded bg-success px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-success/80"
              >
                <RefreshCw size={12} />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
