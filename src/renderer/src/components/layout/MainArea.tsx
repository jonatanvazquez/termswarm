import { useRef, useCallback, useState } from 'react'
import { XTerminal } from '../terminal/XTerminal'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { WebPreview } from '../preview/WebPreview'
import { useNotificationStore } from '../../store/notificationStore'
import { useUIStore } from '../../store/uiStore'
import { useConversationStore } from '../../store/conversationStore'

export function MainArea() {
  const panelOpen = useNotificationStore((s) => s.panelOpen)
  const terminalHidden = useUIStore((s) => s.terminalHidden)
  const previewOpen = useUIStore((s) => s.previewOpen)
  const previewWidth = useUIStore((s) => s.previewWidth)
  const setPreviewWidth = useUIStore((s) => s.setPreviewWidth)
  const tabs = useConversationStore((s) => s.tabs)
  const activeTabId = useConversationStore((s) => s.activeTabId)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  console.log('[MainArea] render — tabs:', tabs.length, 'activeTab:', activeTabId, 'previewOpen:', previewOpen)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      setIsDragging(true)

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = rect.right - ev.clientX
        const clamped = Math.max(280, Math.min(newWidth, rect.width - 300))
        setPreviewWidth(clamped)
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
    [setPreviewWidth]
  )

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1">
      {/* Drag overlay — captures mouse during resize so webview doesn't steal events */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}

      {/* Terminal side — hidden via CSS so xterm stays attached to DOM */}
      <div
        className="flex min-w-0 flex-col"
        style={{ display: terminalHidden ? 'none' : 'flex', flex: terminalHidden ? 'none' : '1' }}
      >
        <div className="relative flex-1 overflow-hidden">
          {tabs.length === 0 && (
            <div className="flex h-full items-center justify-center bg-terminal-bg font-mono text-sm text-text-secondary">
              Select a conversation to view output
            </div>
          )}
          {tabs.map((tab) => (
            <XTerminal
              key={tab.conversationId}
              conversationId={tab.conversationId}
              visible={tab.conversationId === activeTabId}
            />
          ))}
        </div>
      </div>

      {/* Drag handle + Preview side */}
      {previewOpen && (
        <>
          {!terminalHidden && (
            <div
              onMouseDown={handleMouseDown}
              className="group flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent/30"
            >
              <div className="h-8 w-0.5 rounded-full bg-border-default transition-colors group-hover:bg-accent" />
            </div>
          )}
          <div
            className="flex shrink-0"
            style={{ width: terminalHidden ? '100%' : previewWidth }}
          >
            <WebPreview />
          </div>
        </>
      )}

      {/* Notification overlay */}
      {panelOpen && <NotificationPanel />}
    </div>
  )
}
