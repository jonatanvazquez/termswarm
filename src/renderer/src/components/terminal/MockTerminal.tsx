import { useConversationStore } from '../../store/conversationStore'
import { mockTerminalOutputs } from '../../data/mockData'
import { useRef, useEffect } from 'react'

function parseAnsi(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const regex = /\x1b\[(\d+)m/g
  let lastIndex = 0
  let currentClass = ''
  let key = 0

  const colorMap: Record<string, string> = {
    '0': '',
    '31': 'text-error',
    '32': 'text-success',
    '33': 'text-warning',
    '36': 'text-accent',
    '90': 'text-text-secondary'
  }

  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index)
      if (currentClass) {
        parts.push(
          <span key={key++} className={currentClass}>
            {segment}
          </span>
        )
      } else {
        parts.push(segment)
      }
    }
    currentClass = colorMap[match[1]] || ''
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex)
    if (currentClass) {
      parts.push(
        <span key={key++} className={currentClass}>
          {segment}
        </span>
      )
    } else {
      parts.push(segment)
    }
  }

  return parts.length > 0 ? parts : [text]
}

export function MockTerminal() {
  const activeTabId = useConversationStore((s) => s.activeTabId)
  const scrollRef = useRef<HTMLDivElement>(null)

  const lines = activeTabId ? mockTerminalOutputs[activeTabId] : null

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeTabId])

  if (!activeTabId || !lines) {
    return (
      <div className="flex flex-1 items-center justify-center bg-terminal-bg font-mono text-sm text-text-secondary">
        Select a conversation to view output
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto bg-terminal-bg p-4 font-mono text-sm leading-relaxed text-terminal-fg"
    >
      {lines.map((line, i) => (
        <div key={i} className="min-h-[1.4em]">
          {line === '' ? '\u00A0' : parseAnsi(line)}
        </div>
      ))}
      <div className="mt-1 flex items-center gap-1">
        <span className="text-accent">$</span>
        <span className="inline-block h-3.5 w-1.5 animate-pulse bg-terminal-fg" />
      </div>
    </div>
  )
}
