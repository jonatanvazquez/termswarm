import { create } from 'zustand'
import { Terminal, IMarker } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { useUIStore } from './uiStore'
import { useProjectStore } from './projectStore'
import { useConversationStore } from './conversationStore'

interface TerminalInstance {
  terminal: Terminal
  fitAddon: FitAddon
}

interface UserMessage {
  text: string
  marker: IMarker
}

interface TerminalState {
  instances: Map<string, TerminalInstance>
  pendingContent: Map<string, string>
  memoryBySession: Record<string, number>
  userMessages: Map<string, UserMessage[]>
  createInstance: (conversationId: string) => Terminal
  attachToElement: (conversationId: string, el: HTMLDivElement) => void
  disposeInstance: (conversationId: string) => void
  getTerminal: (conversationId: string) => Terminal | undefined
  fitTerminal: (conversationId: string) => void
  serializeBuffer: (conversationId: string) => string
  setPendingContent: (conversationId: string, content: string) => void
  serializeAllBuffers: () => Record<string, string>
  loadSavedBuffers: (buffers: Record<string, string>) => void
  setMemoryStats: (stats: Record<string, number>) => void
  addUserMessage: (conversationId: string, text: string, marker: IMarker) => void
  getUserMessages: (conversationId: string) => UserMessage[]
  clearUserMessages: (conversationId: string) => void
}

const THEME = {
  background: '#0c0c0e',
  foreground: '#c8c8d0',
  cursor: '#c8c8d0',
  selectionBackground: '#007acc55',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#007acc',
  magenta: '#8b5cf6',
  cyan: '#06b6d4',
  white: '#e0e0e8',
  brightBlack: '#8888a0',
  brightRed: '#f85149',
  brightGreen: '#3fb950',
  brightYellow: '#d29922',
  brightBlue: '#007acc',
  brightMagenta: '#8b5cf6',
  brightCyan: '#06b6d4',
  brightWhite: '#ffffff'
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  instances: new Map(),
  pendingContent: new Map(),
  memoryBySession: {},
  userMessages: new Map(),

  createInstance: (conversationId) => {
    const existing = get().instances.get(conversationId)
    if (existing) {
      console.log('[TermStore] createInstance: EXISTING for', conversationId)
      return existing.terminal
    }
    console.log('[TermStore] createInstance: NEW for', conversationId)

    const terminal = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      cursorBlink: true,
      scrollback: 10000,
      convertEol: true
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    // Write pending content BEFORE adding to instances map.
    // xterm.js buffers writes before open(), so this content renders first.
    // By writing before the instance is discoverable, PTY data can't arrive
    // and interleave before the old buffer content.
    const pending = get().pendingContent.get(conversationId)
    console.log('[TermStore] createInstance: pendingContent for', conversationId, ':', pending ? `${pending.length} chars, first 200: ${JSON.stringify(pending.slice(0, 200))}` : 'NONE')
    console.log('[TermStore] createInstance: pendingContent map size:', get().pendingContent.size, 'keys:', [...get().pendingContent.keys()])
    if (pending) {
      terminal.write(pending)
      terminal.write('\r\n\x1b[90m--- session restored ---\x1b[0m\r\n\r\n')
      set((state) => {
        const next = new Map(state.pendingContent)
        next.delete(conversationId)
        return { pendingContent: next }
      })
    }

    set((state) => {
      const next = new Map(state.instances)
      next.set(conversationId, { terminal, fitAddon })
      return { instances: next }
    })

    return terminal
  },

  attachToElement: (conversationId, el) => {
    const instance = get().instances.get(conversationId)
    if (!instance) return

    const { terminal, fitAddon } = instance

    terminal.open(el)

    // Try WebGL addon, fall back to canvas
    try {
      const webgl = new WebglAddon()
      webgl.onContextLoss(() => webgl.dispose())
      terminal.loadAddon(webgl)
    } catch {
      // Canvas renderer is fine
    }

    fitAddon.fit()

    // Click-to-move-cursor: translate clicks into arrow-key sequences
    let mouseDownPos: { x: number; y: number } | null = null

    el.addEventListener('mousedown', (e) => {
      mouseDownPos = { x: e.clientX, y: e.clientY }
    })

    el.addEventListener('click', (e) => {
      // Skip if this was a drag (text selection)
      if (
        mouseDownPos &&
        (Math.abs(e.clientX - mouseDownPos.x) > 3 ||
          Math.abs(e.clientY - mouseDownPos.y) > 3)
      ) {
        return
      }
      // Skip if there's an active selection
      if (terminal.hasSelection()) return

      const buffer = terminal.buffer.active

      // Use xterm.js internal render dimensions for accurate cell sizing
      const core = (terminal as any)._core
      const dims = core._renderService?.dimensions
      if (!dims) return
      const cellWidth = dims.css.cell.width
      const cellHeight = dims.css.cell.height

      const screenEl = el.querySelector('.xterm-screen')
      if (!screenEl) return
      const rect = screenEl.getBoundingClientRect()

      const clickCol = Math.min(
        Math.floor((e.clientX - rect.left) / cellWidth),
        terminal.cols - 1
      )
      const clickRow =
        Math.floor((e.clientY - rect.top) / cellHeight) + buffer.viewportY

      const appCursor = terminal.modes.applicationCursorKeysMode

      // Check if this is a Claude session
      const projectStore = useProjectStore.getState()
      let isClaudeSession = false
      for (const p of projectStore.projects) {
        const c = p.conversations.find((conv) => conv.id === conversationId)
        if (c) {
          isClaudeSession = c.type === 'claude'
          break
        }
      }

      if (isClaudeSession) {
        // Claude Code (Ink TUI) parks the cursor at the bottom of the buffer,
        // not on the input line, so we can't use buffer.cursorX/cursorY.
        // Instead: find the last ❯ prompt line, use End + left arrows.
        const clickedLine = buffer.getLine(clickRow)
        if (!clickedLine) return
        const clickedText = clickedLine.translateToString(true)

        const promptIdx = clickedText.indexOf('❯')
        if (promptIdx < 0) return

        // Only act on the LAST (active) prompt line
        let lastPromptRow = -1
        for (let y = buffer.baseY + terminal.rows - 1; y >= 0; y--) {
          const line = buffer.getLine(y)
          if (line && line.translateToString(true).includes('❯')) {
            lastPromptRow = y
            break
          }
        }
        if (clickRow !== lastPromptRow) return

        const inputStart = promptIdx + 2 // "❯ " = 2 cells
        const inputText = clickedText.slice(inputStart)
        const inputLength = inputText.length
        const targetPos = Math.max(0, Math.min(clickCol - inputStart, inputLength))

        console.log('[ClickMove:Claude] clickCol:', clickCol, 'inputStart:', inputStart,
          'targetPos:', targetPos, 'leftCount:', inputLength - targetPos,
          'clickedText:', JSON.stringify(clickedText))

        // Ink (Claude Code's TUI) processes each stdin chunk as a single
        // key event, so we must send each arrow as a separate ptyWrite.
        const left = appCursor ? '\x1bOD' : '\x1b[D'
        const leftCount = inputLength - targetPos
        for (let i = 0; i < leftCount; i++) {
          setTimeout(() => {
            window.api.ptyWrite(conversationId, left)
          }, i * 5)
        }
      } else {
        // Normal terminal: cursor position is reliable
        const cursorRow = buffer.baseY + buffer.cursorY
        const cursorCol = buffer.cursorX

        if (clickRow !== cursorRow) return

        const diff = clickCol - cursorCol
        if (diff === 0) return

        const arrow = diff > 0
          ? (appCursor ? '\x1bOC' : '\x1b[C')
          : (appCursor ? '\x1bOD' : '\x1b[D')
        window.api.ptyWrite(conversationId, arrow.repeat(Math.abs(diff)))
      }
    })

    // Wire user input → PTY
    terminal.onData((data) => {
      // Capture user message on Enter for Claude sessions
      if (data === '\r') {
        const projectStore = useProjectStore.getState()
        let isClaudeSession = false
        for (const p of projectStore.projects) {
          const c = p.conversations.find((conv) => conv.id === conversationId)
          if (c) {
            isClaudeSession = c.type === 'claude'
            break
          }
        }

        if (isClaudeSession) {
          const buffer = terminal.buffer.active
          const scanStart = buffer.baseY
          const scanEnd = buffer.baseY + terminal.rows

          // Scan visible viewport from bottom to find the last ❯ prompt
          let promptLine = -1
          let fullText = ''
          for (let y = scanEnd - 1; y >= scanStart; y--) {
            const line = buffer.getLine(y)
            if (!line) continue
            const text = line.translateToString(true)
            if (text.includes('❯')) {
              promptLine = y
              fullText = text
              // Collect wrapped continuation lines below
              for (let j = y + 1; j < scanEnd; j++) {
                const nextLine = buffer.getLine(j)
                if (nextLine && nextLine.isWrapped) {
                  fullText += nextLine.translateToString(true)
                } else {
                  break
                }
              }
              break
            }
          }

          console.log('[Sticky] Enter pressed, promptLine:', promptLine, 'text:', JSON.stringify(fullText))

          if (promptLine >= 0) {
            const promptIdx = fullText.indexOf('❯')
            const userText = fullText.slice(promptIdx + 1).trim()
            console.log('[Sticky] userText:', JSON.stringify(userText))
            if (userText) {
              const offset = promptLine - (buffer.baseY + buffer.cursorY)
              const marker = terminal.registerMarker(offset)
              console.log('[Sticky] Marker created:', !!marker, 'line:', marker?.line)
              if (marker) {
                get().addUserMessage(conversationId, userText, marker)
              }
            }
          }
        }
      }

      window.api.ptyWrite(conversationId, data)

      // Auto-advance for 'unread' filter: mark read + jump to next unread.
      // Self-debounces because markConversationRead flips the flag synchronously.
      // ('unanswered' auto-advance lives in usePtyListener, triggered by waiting→running.)
      const { conversationFilter } = useUIStore.getState()
      if (conversationFilter === 'unread') {
        const projectStore = useProjectStore.getState()
        let isUnread = false
        for (const p of projectStore.projects) {
          const c = p.conversations.find((c) => c.id === conversationId)
          if (c?.unread) { isUnread = true; break }
        }
        if (isUnread) {
          projectStore.markConversationRead(conversationId)
          let nextId: string | null = null
          let nextProjectId: string | null = null
          for (const p of projectStore.projects) {
            for (const c of p.conversations) {
              if (!c.archived && c.unread && c.status !== 'running' && c.id !== conversationId) {
                nextId = c.id
                nextProjectId = p.id
                break
              }
            }
            if (nextId) break
          }
          if (nextId && nextProjectId) {
            const { openTab } = useConversationStore.getState()
            setTimeout(() => openTab(nextId!, nextProjectId!), 100)
          }
        }
      }
    })

    // Report initial size
    const { cols, rows } = terminal
    window.api.ptyResize(conversationId, cols, rows)

    // Report size changes
    terminal.onResize(({ cols, rows }) => {
      window.api.ptyResize(conversationId, cols, rows)
    })
  },

  disposeInstance: (conversationId) => {
    console.log('[TermStore] disposeInstance:', conversationId, 'pendingContent still has:', [...get().pendingContent.keys()])
    const instance = get().instances.get(conversationId)
    if (instance) {
      // Dispose markers and clear user messages
      const messages = get().userMessages.get(conversationId)
      if (messages) {
        messages.forEach((m) => m.marker.dispose())
      }
      get().clearUserMessages(conversationId)

      instance.terminal.dispose()
      set((state) => {
        const next = new Map(state.instances)
        next.delete(conversationId)
        return { instances: next }
      })
      console.log('[TermStore] disposeInstance DONE, pendingContent still has:', [...get().pendingContent.keys()])
    }
  },

  getTerminal: (conversationId) => {
    return get().instances.get(conversationId)?.terminal
  },

  fitTerminal: (conversationId) => {
    const instance = get().instances.get(conversationId)
    if (instance) {
      try {
        instance.fitAddon.fit()
      } catch {
        // Element may not be visible
      }
    }
  },

  serializeBuffer: (conversationId) => {
    const instance = get().instances.get(conversationId)
    console.log('[TermStore] serializeBuffer:', conversationId, 'instance exists:', !!instance)
    if (!instance) return ''

    const buffer = instance.terminal.buffer.active
    const lines: string[] = []
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i)
      if (line) lines.push(line.translateToString(true))
    }
    console.log('[TermStore] serializeBuffer: raw lines:', lines.length, 'buffer.length:', buffer.length)

    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop()
    }

    const result = lines.join('\r\n') + '\r\n'
    console.log('[TermStore] serializeBuffer: after trim:', lines.length, 'lines,', result.length, 'chars, first 300:', JSON.stringify(result.slice(0, 300)))
    return result
  },

  setPendingContent: (conversationId, content) => {
    console.log('[TermStore] setPendingContent:', conversationId, content.length, 'chars')
    set((state) => {
      const next = new Map(state.pendingContent)
      next.set(conversationId, content)
      console.log('[TermStore] setPendingContent: map now has', next.size, 'entries, keys:', [...next.keys()])
      return { pendingContent: next }
    })
  },

  serializeAllBuffers: () => {
    const { instances, pendingContent } = get()
    const result: Record<string, string> = {}

    // Serialize all live terminal buffers
    for (const [id] of instances) {
      const content = get().serializeBuffer(id)
      if (content && content.trim()) {
        result[id] = content
      }
    }

    // Also include any pending content (from tabs closed within this session)
    for (const [id, content] of pendingContent) {
      if (content && content.trim() && !result[id]) {
        result[id] = content
      }
    }

    return result
  },

  loadSavedBuffers: (buffers) => {
    set((state) => {
      const next = new Map(state.pendingContent)
      for (const [id, content] of Object.entries(buffers)) {
        if (content && content.trim()) {
          next.set(id, content)
        }
      }
      console.log('[TermStore] loadSavedBuffers: loaded', next.size, 'buffers, keys:', [...next.keys()])
      return { pendingContent: next }
    })
  },

  setMemoryStats: (stats) => {
    set({ memoryBySession: stats })
  },

  addUserMessage: (conversationId, text, marker) => {
    set((state) => {
      const next = new Map(state.userMessages)
      const list = next.get(conversationId) || []
      next.set(conversationId, [...list, { text, marker }])
      return { userMessages: next }
    })
  },

  getUserMessages: (conversationId) => {
    return get().userMessages.get(conversationId) || []
  },

  clearUserMessages: (conversationId) => {
    set((state) => {
      const next = new Map(state.userMessages)
      next.delete(conversationId)
      return { userMessages: next }
    })
  }
}))
