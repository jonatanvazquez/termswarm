import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { SendHorizonal, TextSelect, Trash2, Search, X } from 'lucide-react'
import { useConversationStore } from '../../store/conversationStore'
import { useProjectStore } from '../../store/projectStore'
import { useTerminalStore } from '../../store/terminalStore'

export interface ConsoleEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

interface ConsolePanelProps {
  entries: ConsoleEntry[]
  onClear: () => void
  preserveLog: boolean
  onTogglePreserveLog: () => void
  showToast: (msg: string) => void
}

const levelBorderColor: Record<ConsoleEntry['level'], string> = {
  log: 'border-blue-400',
  info: 'border-blue-400',
  warn: 'border-orange-400',
  error: 'border-red-400',
  debug: 'border-neutral-500'
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

function sendToTerminal(text: string, showToast: (msg: string) => void): void {
  const activeTabId = useConversationStore.getState().activeTabId
  if (!activeTabId) {
    showToast('No active tab')
    return
  }

  const projects = useProjectStore.getState().projects
  let convType: string | null = null
  for (const p of projects) {
    const conv = p.conversations.find((c) => c.id === activeTabId)
    if (conv) {
      convType = conv.type
      break
    }
  }

  if (convType !== 'claude') {
    showToast(convType === 'terminal' ? 'Switch to a Claude tab first' : 'No active Claude tab')
    return
  }

  const payload = '\n```\n' + text + '\n```\n'
  window.api.ptyWrite(activeTabId, payload)
  showToast('Sent to Claude terminal')

  setTimeout(() => {
    useTerminalStore.getState().getTerminal(activeTabId)?.focus()
  }, 50)
}

export function ConsolePanel({
  entries,
  onClear,
  preserveLog,
  onTogglePreserveLog,
  showToast
}: ConsolePanelProps) {
  const logAreaRef = useRef<HTMLDivElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [filterText, setFilterText] = useState('')
  const shouldAutoScroll = useRef(true)

  const filteredEntries = useMemo(() => {
    if (!filterText) return entries
    const lower = filterText.toLowerCase()
    return entries.filter((e) => e.message.toLowerCase().includes(lower))
  }, [entries, filterText])

  // Track whether user has scrolled up
  const onScroll = useCallback(() => {
    const el = logAreaRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    shouldAutoScroll.current = atBottom
  }, [])

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    const el = logAreaRef.current
    if (el && shouldAutoScroll.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [filteredEntries.length])

  // Selection detection
  useEffect(() => {
    const onSelectionChange = (): void => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !logAreaRef.current) {
        setHasSelection(false)
        return
      }
      const node = sel.anchorNode
      setHasSelection(node !== null && logAreaRef.current.contains(node))
    }

    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  const handleSendAll = useCallback(() => {
    if (entries.length === 0) return
    const text = entries
      .map((e) => `[${e.level.toUpperCase()}] ${e.message}`)
      .join('\n')
    sendToTerminal(text, showToast)
  }, [entries, showToast])

  const handleSendSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel) return
    const text = sel.toString().trim()
    if (text) sendToTerminal(text, showToast)
  }, [showToast])

  return (
    <div className="flex h-full flex-col overflow-hidden border-t border-border-default bg-surface-1">
      {/* Toolbar */}
      <div className="flex h-7 shrink-0 items-center gap-1 border-b border-border-default px-2">
        <button
          title="Send all to Claude"
          onClick={handleSendAll}
          disabled={entries.length === 0}
          className="flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-secondary"
        >
          <SendHorizonal size={10} />
          Send All
        </button>
        {hasSelection && (
          <button
            title="Send selection to Claude"
            onClick={handleSendSelection}
            className="flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <TextSelect size={10} />
            Send Selection
          </button>
        )}
        <div className="mx-1 h-3 w-px bg-border-default" />
        <button
          title="Clear console"
          onClick={onClear}
          className="flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
        >
          <Trash2 size={10} />
          Clear
        </button>
        <div className="mx-1 h-3 w-px bg-border-default" />
        <div className="flex h-5 min-w-0 max-w-[200px] flex-1 items-center gap-1 rounded bg-surface-0 px-1.5">
          <Search size={9} className="shrink-0 text-text-secondary/60" />
          <input
            ref={filterInputRef}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filter"
            className="min-w-0 flex-1 bg-transparent text-[10px] text-text-primary outline-none placeholder:text-text-secondary/50"
          />
          {filterText && (
            <button
              onClick={() => {
                setFilterText('')
                filterInputRef.current?.focus()
              }}
              className="shrink-0 text-text-secondary/60 hover:text-text-primary"
            >
              <X size={9} />
            </button>
          )}
        </div>
        <div className="flex-1" />
        <label className="flex items-center gap-1.5 text-[10px] text-text-secondary">
          <input
            type="checkbox"
            checked={preserveLog}
            onChange={onTogglePreserveLog}
            className="h-3 w-3 rounded border-border-default accent-accent"
          />
          Preserve log
        </label>
      </div>

      {/* Log area */}
      <div
        ref={logAreaRef}
        onScroll={onScroll}
        className="flex-1 select-text overflow-y-auto font-mono text-[11px]"
      >
        {filteredEntries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-text-secondary/50">
            {entries.length === 0
              ? 'No console output'
              : `No results for "${filterText}"`}
          </div>
        ) : (
          filteredEntries.map((entry, i) => (
            <div
              key={i}
              className={`flex gap-2 border-l-2 px-2 py-0.5 ${levelBorderColor[entry.level]} hover:bg-surface-0/50`}
            >
              <span className="shrink-0 text-text-secondary/60">{formatTime(entry.timestamp)}</span>
              <span className="min-w-0 whitespace-pre-wrap break-all text-text-primary">
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
