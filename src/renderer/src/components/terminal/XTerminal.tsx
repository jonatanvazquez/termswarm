import { useRef, useEffect, useState } from 'react'
import { useTerminalStore } from '../../store/terminalStore'
import { useProjectStore } from '../../store/projectStore'
import { findMessageAtViewportTop, type TranscriptMessage } from '../../utils/claudePrompt'
import '@xterm/xterm/css/xterm.css'

interface XTerminalProps {
  conversationId: string
  visible: boolean
}

export function XTerminal({ conversationId, visible }: XTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const attachedRef = useRef(false)
  const [stickyMessage, setStickyMessage] = useState<TranscriptMessage | null>(null)
  const { createInstance, attachToElement, fitTerminal } = useTerminalStore.getState()

  const isClaudeSession = useProjectStore((state) => {
    for (const p of state.projects) {
      const c = p.conversations.find((conv) => conv.id === conversationId)
      if (c) return c.type === 'claude'
    }
    return false
  })

  // Create terminal instance + attach to DOM (once)
  useEffect(() => {
    console.log(
      '[XTerminal] useEffect mount:',
      conversationId,
      'attached:',
      attachedRef.current,
      'hasContainer:',
      !!containerRef.current
    )
    if (!containerRef.current || attachedRef.current) return
    createInstance(conversationId)
    attachToElement(conversationId, containerRef.current)
    attachedRef.current = true

    return () => {
      console.log('[XTerminal] useEffect CLEANUP (unmount):', conversationId)
      // Don't dispose here — disposal happens on tab close via conversationStore
    }
  }, [conversationId, createInstance, attachToElement])

  // Sticky header (Claude sessions only): while scrolled back, pin the user message that the
  // content at the top of the viewport belongs to. Derived from the buffer on every change
  // instead of tracked, so it can't drift when Claude Code redraws its output.
  useEffect(() => {
    if (!isClaudeSession || !attachedRef.current) return

    const terminal = useTerminalStore.getState().getTerminal(conversationId)
    if (!terminal) return

    let frame = 0
    const update = (): void => {
      frame = 0
      const next = findMessageAtViewportTop(terminal)
      setStickyMessage((prev) =>
        prev?.line === next?.line && prev?.text === next?.text ? prev : next
      )
    }
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    // onRender covers everything that changes what's on screen: new output, resizes and
    // user scrolling (which onScroll doesn't report).
    const disposable = terminal.onRender(schedule)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      disposable.dispose()
    }
  }, [conversationId, isClaudeSession])

  const jumpToStickyMessage = (): void => {
    if (!stickyMessage) return
    const terminal = useTerminalStore.getState().getTerminal(conversationId)
    terminal?.scrollToLine(stickyMessage.line)
    terminal?.focus()
  }

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
      className="relative h-full w-full bg-terminal-bg p-2"
      style={{ display: visible ? 'block' : 'none' }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {stickyMessage && (
        <button
          onClick={jumpToStickyMessage}
          title="Jump to this message"
          className="absolute inset-x-0 top-0 z-20 flex items-baseline gap-2 border-b border-border-default bg-terminal-bg/95 px-2 py-1.5 text-left font-mono text-[13px] leading-tight shadow-[0_4px_12px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        >
          <span className="shrink-0 text-text-secondary">❯</span>
          <span className="min-w-0 truncate text-terminal-fg">{stickyMessage.text}</span>
        </button>
      )}
    </div>
  )
}
