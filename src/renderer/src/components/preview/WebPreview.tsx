import { useState, useRef, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Globe,
  Smartphone,
  Monitor,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { IconButton } from '../common/IconButton'

type DeviceMode = 'desktop' | 'mobile'
type WebviewState = 'probing' | 'live' | 'error'

export function WebPreview() {
  const previewUrl = useUIStore((s) => s.previewUrl)
  const setPreviewUrl = useUIStore((s) => s.setPreviewUrl)
  const togglePreview = useUIStore((s) => s.togglePreview)

  const [urlInput, setUrlInput] = useState(previewUrl)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [viewState, setViewState] = useState<WebviewState>('probing')
  const [liveUrl, setLiveUrl] = useState<string | null>(null)
  const webviewRef = useRef<Electron.WebviewTag>(null)

  const navigateTo = useCallback(async (url: string) => {
    console.log('[WebPreview] navigateTo:', url)
    setViewState('probing')
    setLiveUrl(null)
    setErrorMsg(null)

    const reachable = await window.api.probeUrl(url)
    console.log('[WebPreview] probe result:', reachable)
    if (!reachable) {
      setErrorMsg('Connection refused — server may not be running')
      setViewState('error')
      return
    }

    setLiveUrl(url)
    setViewState('live')
  }, [])

  // Health check
  useEffect(() => {
    if (viewState !== 'live' || !liveUrl) return

    const interval = setInterval(async () => {
      const alive = await window.api.probeUrl(liveUrl)
      if (!alive) {
        console.log('[WebPreview] health check FAILED, unmounting webview')
        setLiveUrl(null)
        setErrorMsg('Server stopped — connection lost')
        setViewState('error')
      }
    }, 500)

    return () => clearInterval(interval)
  }, [viewState, liveUrl])

  // Webview event listeners
  useEffect(() => {
    if (viewState !== 'live') return
    const wv = webviewRef.current
    if (!wv) return

    const onNavigate = (e: Electron.DidNavigateEvent): void => {
      if (e.url === 'about:blank') return
      setUrlInput(e.url)
    }

    const onCrash = (): void => {
      console.log('[WebPreview] webview CRASHED')
      setLiveUrl(null)
      setErrorMsg('Preview crashed — server may have stopped')
      setViewState('error')
    }

    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate as EventListener)
    wv.addEventListener('crashed', onCrash)

    return () => {
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate as EventListener)
      wv.removeEventListener('crashed', onCrash)
    }
  }, [viewState])

  useEffect(() => {
    setUrlInput(previewUrl)
    navigateTo(previewUrl)
  }, [previewUrl, navigateTo])

  const handleUrlSubmit = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      let url = urlInput.trim()
      if (url && !url.startsWith('http')) url = `http://${url}`
      setPreviewUrl(url)
      navigateTo(url)
    }
  }

  const goBack = (): void => webviewRef.current?.goBack()
  const goForward = (): void => webviewRef.current?.goForward()

  const reload = useCallback((): void => {
    const url = useUIStore.getState().previewUrl
    navigateTo(url)
  }, [navigateTo])

  return (
    <div className="flex w-full flex-col bg-surface-1">
      <div className="flex h-[var(--spacing-tabbar)] items-center gap-1 border-b border-border-default px-2">
        <IconButton tooltip="Back" onClick={goBack}>
          <ArrowLeft size={12} />
        </IconButton>
        <IconButton tooltip="Forward" onClick={goForward}>
          <ArrowRight size={12} />
        </IconButton>
        <IconButton tooltip="Reload" onClick={reload}>
          <RotateCw size={12} className={viewState === 'probing' ? 'animate-spin' : ''} />
        </IconButton>

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

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-surface-0">
        {viewState === 'live' && liveUrl && (
          <webview
            ref={webviewRef}
            src={liveUrl}
            className="h-full border-0"
            style={{ width: deviceMode === 'mobile' ? 375 : '100%' }}
          />
        )}

        {viewState === 'probing' && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <Loader2 size={24} className="animate-spin text-text-secondary" />
            <p className="text-xs text-text-secondary">Connecting...</p>
            <p className="text-[11px] text-text-secondary/60">{urlInput}</p>
          </div>
        )}

        {viewState === 'error' && (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <AlertTriangle size={28} className="text-text-secondary" />
            <p className="text-xs text-text-secondary">{errorMsg}</p>
            <p className="text-[11px] text-text-secondary/60">{urlInput}</p>
            <button
              onClick={reload}
              className="mt-1 rounded bg-surface-2 px-3 py-1 text-[11px] text-text-primary transition-colors hover:bg-surface-3"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
