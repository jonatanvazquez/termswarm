import { Minus, Plus, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

const ZOOM_MIN = 0.75
const ZOOM_MAX = 1.25
const ZOOM_STEP = 0.05

export function SettingsPanel() {
  const zoom = useSettingsStore((s) => s.zoom)
  const setZoom = useSettingsStore((s) => s.setZoom)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  const adjustZoom = (delta: number) => {
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom + delta))
    setZoom(next)
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
      </div>
    </div>
  )
}
