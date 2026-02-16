import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Globe,
  Smartphone,
  Monitor,
  AlertTriangle,
  Loader2,
  Crosshair,
  Plus,
  TerminalSquare
} from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useConversationStore } from '../../store/conversationStore'
import { useProjectStore } from '../../store/projectStore'
import { useTerminalStore } from '../../store/terminalStore'
import { IconButton } from '../common/IconButton'
import { DOM_SELECTOR_SCRIPT, DOM_SELECTOR_DEACTIVATE_SCRIPT } from './domSelectorScript'
import { ConsolePanel } from './ConsolePanel'
import type { ConsoleEntry } from './ConsolePanel'
import type { BrowserTab } from '../../types'

function getHostname(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

type DeviceMode = 'desktop' | 'mobile'
type WebviewState = 'probing' | 'live' | 'error'

function WebviewPanel({ tab, visible }: { tab: BrowserTab; visible: boolean }) {
  const setPreviewTabUrl = useUIStore((s) => s.setPreviewTabUrl)

  const [urlInput, setUrlInput] = useState(tab.url)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [viewState, setViewState] = useState<WebviewState>('probing')
  const [liveUrl, setLiveUrl] = useState<string | null>(null)
  const [selectorActive, setSelectorActive] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([])
  const [preserveLog, setPreserveLog] = useState(false)
  const [consolePanelHeight, setConsolePanelHeight] = useState(200)
  const [consoleResizing, setConsoleResizing] = useState(false)
  const webviewRef = useRef<Electron.WebviewTag>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const navigateTo = useCallback(async (url: string) => {
    setViewState('probing')
    setLiveUrl(null)
    setErrorMsg(null)
    setSelectorActive(false)

    const reachable = await window.api.probeUrl(url)
    if (!reachable) {
      setErrorMsg('Connection refused — server may not be running')
      setViewState('error')
      return
    }

    setLiveUrl(url)
    setViewState('live')
  }, [])

  // Navigate when tab URL changes
  useEffect(() => {
    setUrlInput(tab.url)
    navigateTo(tab.url)
  }, [tab.url, navigateTo])

  // Health check — skip for background (hidden) panels
  useEffect(() => {
    if (!visible) return
    if (viewState !== 'live' || !liveUrl) return

    const interval = setInterval(async () => {
      const alive = await window.api.probeUrl(liveUrl)
      if (!alive) {
        setLiveUrl(null)
        setErrorMsg('Server stopped — connection lost')
        setViewState('error')
      }
    }, 500)

    return () => clearInterval(interval)
  }, [viewState, liveUrl, visible])

  // Auto-retry — skip for background (hidden) panels
  useEffect(() => {
    if (!visible) return
    if (viewState !== 'error') return

    const interval = setInterval(async () => {
      const reachable = await window.api.probeUrl(tab.url)
      if (reachable) {
        setErrorMsg(null)
        setLiveUrl(tab.url)
        setViewState('live')
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [viewState, tab.url, visible])

  // Webview event listeners
  useEffect(() => {
    if (viewState !== 'live') return
    const wv = webviewRef.current
    if (!wv) return

    const onDomReady = (): void => {
      wv.focus()
    }

    const onNavigate = (e: Electron.DidNavigateEvent): void => {
      if (e.url === 'about:blank') return
      setUrlInput(e.url)
      setPreviewTabUrl(tab.id, e.url)
      setSelectorActive(false)
      if (!preserveLog) setConsoleEntries([])
    }

    const onCrash = (): void => {
      setLiveUrl(null)
      setErrorMsg('Preview crashed — server may have stopped')
      setViewState('error')
      setSelectorActive(false)
    }

    wv.addEventListener('dom-ready', onDomReady)
    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigate as EventListener)
    wv.addEventListener('crashed', onCrash)

    return () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigate as EventListener)
      wv.removeEventListener('crashed', onCrash)
    }
  }, [viewState, preserveLog])

  // Console-message listener for DOM selector communication
  useEffect(() => {
    if (viewState !== 'live') return
    const wv = webviewRef.current
    if (!wv) return

    const levelMap: Record<number, ConsoleEntry['level']> = {
      0: 'debug',
      1: 'log',
      2: 'warn',
      3: 'error'
    }

    const onConsoleMessage = (e: Electron.ConsoleMessageEvent): void => {
      const msg = e.message
      if (msg.startsWith('__TS_DOM_SELECT__:')) {
        const html = msg.slice('__TS_DOM_SELECT__:'.length)
        const activeTabId = useConversationStore.getState().activeTabId
        if (!activeTabId) return

        const payload = '\n```html\n' + html + '\n```\n'
        window.api.ptyWrite(activeTabId, payload)
        showToast('Sent to Claude terminal')
        setSelectorActive(false)

        // Focus the terminal so the user can keep typing or press Enter
        setTimeout(() => {
          useTerminalStore.getState().getTerminal(activeTabId)?.focus()
        }, 50)
      } else if (msg === '__TS_DOM_CANCEL__') {
        setSelectorActive(false)
      } else if (!msg.startsWith('__TS_DOM_')) {
        setConsoleEntries((prev) => {
          const next = [
            ...prev,
            {
              level: levelMap[e.level] ?? 'log',
              message: msg,
              timestamp: Date.now()
            }
          ]
          return next.length > 1000 ? next.slice(-1000) : next
        })
      }
    }

    wv.addEventListener('console-message', onConsoleMessage)
    return () => {
      wv.removeEventListener('console-message', onConsoleMessage)
    }
  }, [viewState])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }, [])

  const findActiveConversationType = useCallback((): 'claude' | 'terminal' | null => {
    const activeTabId = useConversationStore.getState().activeTabId
    if (!activeTabId) return null
    const projects = useProjectStore.getState().projects
    for (const p of projects) {
      const conv = p.conversations.find((c) => c.id === activeTabId)
      if (conv) return conv.type
    }
    return null
  }, [])

  const toggleDomSelector = useCallback(() => {
    const wv = webviewRef.current
    if (!wv) return

    if (selectorActive) {
      wv.executeJavaScript(DOM_SELECTOR_DEACTIVATE_SCRIPT).catch(() => {})
      setSelectorActive(false)
      return
    }

    const convType = findActiveConversationType()
    if (convType !== 'claude') {
      showToast(convType === 'terminal' ? 'Switch to a Claude tab first' : 'No active Claude tab')
      return
    }

    wv.executeJavaScript(DOM_SELECTOR_SCRIPT).catch(() => {})
    setSelectorActive(true)
  }, [selectorActive, findActiveConversationType, showToast])

  const handleUrlSubmit = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      let url = urlInput.trim()
      if (url && !url.startsWith('http')) url = `http://${url}`
      setPreviewTabUrl(tab.id, url)
    }
  }

  const goBack = (): void => webviewRef.current?.goBack()
  const goForward = (): void => webviewRef.current?.goForward()

  const reload = useCallback((): void => {
    navigateTo(tab.url)
  }, [navigateTo, tab.url])

  const startConsoleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startHeight = consolePanelHeight
      setConsoleResizing(true)

      const onMouseMove = (ev: MouseEvent): void => {
        const container = containerRef.current
        if (!container) return
        const maxHeight = container.clientHeight * 0.6
        const delta = startY - ev.clientY
        setConsolePanelHeight(Math.max(80, Math.min(maxHeight, startHeight + delta)))
      }

      const onMouseUp = (): void => {
        setConsoleResizing(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [consolePanelHeight]
  )

  return (
    <div
      className="absolute inset-0 flex flex-col bg-surface-1"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* URL bar + controls */}
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

        <IconButton
          tooltip={selectorActive ? 'Cancel DOM selector (ESC)' : 'Select DOM element'}
          onClick={toggleDomSelector}
          className={selectorActive ? 'text-accent bg-accent/10' : ''}
          disabled={viewState !== 'live'}
        >
          <Crosshair size={12} />
        </IconButton>
        <IconButton
          tooltip={consoleOpen ? 'Hide console' : 'Show console'}
          onClick={() => setConsoleOpen((v) => !v)}
          className={consoleOpen ? 'text-accent' : ''}
          disabled={viewState !== 'live'}
        >
          <TerminalSquare size={12} />
        </IconButton>
      </div>

      {/* Webview content + console */}
      <div ref={containerRef} className="relative flex flex-1 flex-col overflow-hidden bg-surface-0">
        {/* Drag overlay — captures mouse during resize so webview doesn't steal events */}
        {consoleResizing && <div className="fixed inset-0 z-50 cursor-row-resize" />}
        {/* Webview area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
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

          {toastMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-surface-3 px-3 py-1.5 text-[11px] text-text-primary shadow-lg">
              {toastMessage}
            </div>
          )}
        </div>

        {/* Console panel at bottom */}
        {consoleOpen && (
          <>
            <div
              onMouseDown={startConsoleResize}
              className="group flex h-1 shrink-0 cursor-row-resize items-center justify-center hover:bg-accent/30"
            >
              <div className="h-0.5 w-8 rounded-full bg-border-default group-hover:bg-accent" />
            </div>
            <div className="shrink-0" style={{ height: consolePanelHeight }}>
              <ConsolePanel
                entries={consoleEntries}
                onClear={() => setConsoleEntries([])}
                preserveLog={preserveLog}
                onTogglePreserveLog={() => setPreserveLog((v) => !v)}
                showToast={showToast}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function WebPreview() {
  const previewTabs = useUIStore((s) => s.previewTabs)
  const activePreviewTabId = useUIStore((s) => s.activePreviewTabId)
  const addPreviewTab = useUIStore((s) => s.addPreviewTab)
  const closePreviewTab = useUIStore((s) => s.closePreviewTab)
  const setActivePreviewTab = useUIStore((s) => s.setActivePreviewTab)
  const togglePreview = useUIStore((s) => s.togglePreview)

  // Read all projects for background webview persistence
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  // Collect webview panels from all non-archived projects so they persist across switches
  const allPanels = useMemo(
    () =>
      projects
        .filter((p) => !p.archived)
        .flatMap((p) =>
          (p.previewTabs || []).map((tab) => ({
            tab,
            projectId: p.id
          }))
        ),
    [projects]
  )

  return (
    <div className="flex w-full flex-col bg-surface-1">
      {/* Tab bar — shows only active project's tabs */}
      <div className="flex h-[var(--spacing-tabbar)] items-center border-b border-border-default">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto">
          {previewTabs.map((tab) => {
            const isActive = tab.id === activePreviewTabId
            return (
              <div
                key={tab.id}
                className={`group flex h-full shrink-0 cursor-pointer items-center gap-1.5 border-r border-border-default px-3 ${
                  isActive
                    ? 'bg-surface-0 text-text-primary'
                    : 'text-text-secondary hover:bg-surface-2'
                }`}
                onClick={() => setActivePreviewTab(tab.id)}
              >
                <Globe size={10} className="shrink-0" />
                <span className="max-w-[120px] truncate text-[11px]">
                  {getHostname(tab.url)}
                </span>
                <button
                  className="ml-0.5 rounded p-0.5 opacity-0 transition-opacity hover:bg-surface-3 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    closePreviewTab(tab.id)
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            )
          })}
          <button
            onClick={() => addPreviewTab()}
            className="flex h-full shrink-0 items-center px-2 text-text-secondary hover:text-text-primary"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="flex shrink-0 items-center pr-1">
          <IconButton tooltip="Close preview" onClick={togglePreview}>
            <X size={12} />
          </IconButton>
        </div>
      </div>

      {/* Webview panels — renders ALL projects' panels for persistence */}
      <div className="relative flex-1">
        {allPanels.map(({ tab, projectId }) => (
          <WebviewPanel
            key={`${projectId}-${tab.id}`}
            tab={tab}
            visible={projectId === activeProjectId && tab.id === activePreviewTabId}
          />
        ))}
      </div>
    </div>
  )
}
