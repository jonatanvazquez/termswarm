import { create } from 'zustand'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'

interface TerminalInstance {
  terminal: Terminal
  fitAddon: FitAddon
}

interface TerminalState {
  instances: Map<string, TerminalInstance>
  pendingContent: Map<string, string>
  memoryBySession: Record<string, number>
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

    // Wire user input → PTY
    terminal.onData((data) => {
      window.api.ptyWrite(conversationId, data)
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
  }
}))
