import { useRef, useEffect } from 'react'
import { useTerminalStore } from '../../store/terminalStore'
import '@xterm/xterm/css/xterm.css'

interface XTerminalProps {
  conversationId: string
  visible: boolean
}

export function XTerminal({ conversationId, visible }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const attachedRef = useRef(false)
  const { createInstance, attachToElement, fitTerminal } = useTerminalStore.getState()

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
      className="h-full w-full bg-terminal-bg p-2"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
