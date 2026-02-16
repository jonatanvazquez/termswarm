import { Download, RefreshCw, X } from 'lucide-react'
import { useSettingsStore } from '../../store/settingsStore'

export function UpdateBanner() {
  const status = useSettingsStore((s) => s.updateStatus)
  const dismissed = useSettingsStore((s) => s.updateBannerDismissed)
  const dismiss = useSettingsStore((s) => s.dismissUpdateBanner)
  const downloadUpdate = useSettingsStore((s) => s.downloadUpdate)
  const installUpdate = useSettingsStore((s) => s.installUpdate)

  if (dismissed) return null
  if (status.state !== 'available' && status.state !== 'downloading' && status.state !== 'downloaded') return null

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-default bg-surface-1 px-3 py-1.5 text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {status.state === 'available' && (
          <>
            <span className="text-text-secondary">
              A new version <span className="font-medium text-text-primary">v{status.version}</span> is available
            </span>
            <button
              onClick={downloadUpdate}
              className="flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-accent/80"
            >
              <Download size={12} />
              Download
            </button>
          </>
        )}

        {status.state === 'downloading' && (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-text-secondary">Downloading update...</span>
            <div className="h-1.5 max-w-48 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${status.progress ?? 0}%` }}
              />
            </div>
            <span className="text-text-secondary">{status.progress ?? 0}%</span>
          </div>
        )}

        {status.state === 'downloaded' && (
          <>
            <span className="text-text-secondary">
              Version <span className="font-medium text-text-primary">v{status.version}</span> is ready to install
            </span>
            <button
              onClick={installUpdate}
              className="flex items-center gap-1 rounded bg-success px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-success/80"
            >
              <RefreshCw size={12} />
              Restart & Install
            </button>
          </>
        )}
      </div>

      <button
        onClick={dismiss}
        className="rounded p-0.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  )
}
