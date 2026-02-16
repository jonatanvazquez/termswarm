import { useRef, useCallback, useState } from 'react'
import { TitleBar } from './TitleBar'
import { UpdateBanner } from '../common/UpdateBanner'
import { Sidebar } from './Sidebar'
import { MainArea } from './MainArea'
import { StatusBar } from './StatusBar'
import { useUIStore } from '../../store/uiStore'

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const dragging = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      setIsDragging(true)

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return
        const newWidth = ev.clientX
        const clamped = Math.max(180, Math.min(newWidth, window.innerWidth - 400))
        setSidebarWidth(clamped)
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
    [setSidebarWidth]
  )

  return (
    <div className="flex h-full flex-col bg-surface-0">
      <TitleBar />
      <UpdateBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {/* Sidebar resize handle */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className="group flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-accent/30"
          >
            <div className="h-8 w-0.5 rounded-full bg-border-default transition-colors group-hover:bg-accent" />
          </div>
        )}
        <MainArea />
      </div>
      {/* Drag overlay — captures mouse during sidebar resize */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
      <StatusBar />
    </div>
  )
}
