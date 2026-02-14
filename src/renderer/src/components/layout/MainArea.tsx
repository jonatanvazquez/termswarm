import { useRef, useCallback } from 'react'
import { TerminalTabBar } from '../terminal/TerminalTabBar'
import { MockTerminal } from '../terminal/MockTerminal'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { MockPreview } from '../preview/MockPreview'
import { useNotificationStore } from '../../store/notificationStore'
import { useUIStore } from '../../store/uiStore'

export function MainArea() {
  const panelOpen = useNotificationStore((s) => s.panelOpen)
  const previewOpen = useUIStore((s) => s.previewOpen)
  const previewWidth = useUIStore((s) => s.previewWidth)
  const setPreviewWidth = useUIStore((s) => s.setPreviewWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const newWidth = rect.right - ev.clientX
        const clamped = Math.max(280, Math.min(newWidth, rect.width - 300))
        setPreviewWidth(clamped)
      }

      const onMouseUp = () => {
        dragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
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
      {/* Terminal side */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TerminalTabBar />
        <MockTerminal />
      </div>

      {/* Drag handle + Preview side */}
      {previewOpen && (
        <>
          <div
            onMouseDown={handleMouseDown}
            className="group flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent/30"
          >
            <div className="h-8 w-0.5 rounded-full bg-border-default transition-colors group-hover:bg-accent" />
          </div>
          <div className="flex shrink-0" style={{ width: previewWidth }}>
            <MockPreview />
          </div>
        </>
      )}

      {/* Notification overlay */}
      {panelOpen && <NotificationPanel />}
    </div>
  )
}
