import { useRef, useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTerminalStore } from '../../store/terminalStore'
import { useProjectStore } from '../../store/projectStore'
import '@xterm/xterm/css/xterm.css'

interface XTerminalProps {
  conversationId: string
  visible: boolean
}

export function XTerminal({ conversationId, visible }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const attachedRef = useRef(false)
  const [stickyMessage, setStickyMessage] = useState<string | null>(null)
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  )
  const { createInstance, attachToElement, fitTerminal } = useTerminalStore.getState()

  const isClaudeSession = useProjectStore((state) => {
    for (const p of state.projects) {
      const c = p.conversations.find((conv) => conv.id === conversationId)
      if (c) return c.type === 'claude'
    }
    return false
  })

  const updateOverlayPos = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setOverlayPos({ top: rect.top, left: rect.left, width: rect.width })
    }
  }, [])

  // Create terminal instance + attach to DOM (once)
  useEffect(() => {
    console.log('[XTerminal] useEffect mount:', conversationId, 'attached:', attachedRef.current, 'hasContainer:', !!containerRef.current)
    if (!containerRef.current || attachedRef.current) return
    createInstance(conversationId)
    attachToElement(conversationId, containerRef.current)
    attachedRef.current = true

    return () => {
      console.log('[XTerminal] useEffect CLEANUP (unmount):', conversationId)
      // Don't dispose here — disposal happens on tab close via conversationStore
    }
  }, [conversationId, createInstance, attachToElement])

  // Scroll listener for sticky header (Claude sessions only)
  useEffect(() => {
    if (!isClaudeSession || !attachedRef.current) return

    const terminal = useTerminalStore.getState().getTerminal(conversationId)
    if (!terminal) return

    const disposable = terminal.onScroll(() => {
      const messages = useTerminalStore.getState().getUserMessages(conversationId)
      if (!messages || messages.length === 0) {
        setStickyMessage(null)
        return
      }

      const viewportY = terminal.buffer.active.viewportY
      const baseY = terminal.buffer.active.baseY

      // If at bottom (viewing latest content), hide sticky
      if (viewportY >= baseY) {
        setStickyMessage(null)
        return
      }

      // Find the most recent message not visible in the viewport
      const viewportEnd = viewportY + terminal.rows
      let sticky: string | null = null
      for (const msg of messages) {
        const isVisible =
          msg.marker.line >= viewportY && msg.marker.line < viewportEnd
        if (!isVisible) {
          sticky = msg.text
        }
      }

      console.log('[Sticky] scroll vY:', viewportY, 'vEnd:', viewportEnd, 'marker:', messages[messages.length - 1]?.marker.line, 'sticky:', sticky)
      if (sticky) updateOverlayPos()
      setStickyMessage(sticky)
    })

    return () => disposable.dispose()
  }, [conversationId, isClaudeSession, updateOverlayPos])

  // Fit + focus on visibility change
  useEffect(() => {
    if (!visible || !attachedRef.current) return
    const timer = setTimeout(() => {
      fitTerminal(conversationId)
      const terminal = useTerminalStore.getState().getTerminal(conversationId)
      terminal?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [visible, conversationId, fitTerminal])

  // ResizeObserver for container size changes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (visible) fitTerminal(conversationId)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [conversationId, visible, fitTerminal])

  return (
    <div
      ref={wrapperRef}
      className="h-full w-full bg-terminal-bg p-2"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {stickyMessage &&
        overlayPos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: overlayPos.top,
              left: overlayPos.left,
              width: overlayPos.width,
              zIndex: 99999,
              background: 'rgba(12, 12, 14, 0.95)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 16px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none'
            }}
          >
            <span style={{ color: '#8888a0' }}>❯</span>{' '}
            <span style={{ color: '#c8c8d0' }}>{stickyMessage}</span>
          </div>,
          document.body
        )}
    </div>
  )
}
