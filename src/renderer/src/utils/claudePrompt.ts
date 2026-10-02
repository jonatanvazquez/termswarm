import type { Terminal, IBufferLine, IBufferCell } from '@xterm/xterm'

// Claude Code draws ❯ (U+276F) at column 0 both for its input box and for the user
// messages it echoes into the transcript.
const PROMPT_CHAR = '❯'
const BOX_RULE = '─'

/**
 * Text following the ❯ on a line, or null if the line doesn't start with one. Dim cells are
 * skipped: that's the placeholder hint Claude Code shows in an empty input box.
 */
function promptLineText(line: IBufferLine, cell: IBufferCell): string | null {
  if (line.getCell(0, cell)?.getChars() !== PROMPT_CHAR) return null

  let text = ''
  for (let x = 1; x < line.length; x++) {
    if (!line.getCell(x, cell) || cell.getWidth() === 0) continue
    const chars = cell.getChars()
    text += chars && !cell.isDim() ? chars : ' '
  }
  return text.replace(/\u00a0/g, ' ').trim()
}

interface ClaudePrompt {
  input: string
  // Sits between two horizontal rules, i.e. it's the input box and not a dialog selector
  boxed: boolean
}

/** The bottom-most ❯ line on screen — Claude Code's active prompt */
function findClaudePrompt(terminal: Terminal): ClaudePrompt | null {
  const buffer = terminal.buffer.active
  const cell = buffer.getNullCell()
  for (let y = buffer.baseY + terminal.rows - 1; y >= buffer.baseY; y--) {
    const line = buffer.getLine(y)
    const input = line ? promptLineText(line, cell) : null
    if (input === null) continue

    const above = buffer.getLine(y - 1)?.translateToString(true) ?? ''
    const below = buffer.getLine(y + 1)?.translateToString(true) ?? ''
    return { input, boxed: above.includes(BOX_RULE) && below.includes(BOX_RULE) }
  }
  return null
}

/** True when pressing Enter now would submit something the user typed */
export function hasPendingClaudeInput(terminal: Terminal): boolean {
  const prompt = findClaudePrompt(terminal)
  return prompt !== null && prompt.input !== ''
}

/** True when Claude Code is showing its input box and the box is empty */
export function isClaudePromptIdle(terminal: Terminal): boolean {
  const prompt = findClaudePrompt(terminal)
  return prompt !== null && prompt.boxed && prompt.input === ''
}

export interface TranscriptMessage {
  text: string
  line: number
}

// How far above the viewport to look for the message a response belongs to
const MAX_SCAN_LINES = 5000

/**
 * The user message that the content at the top of the viewport belongs to: the nearest
 * echoed message at or above the first visible line. Null when not scrolled back.
 */
export function findMessageAtViewportTop(terminal: Terminal): TranscriptMessage | null {
  const buffer = terminal.buffer.active
  if (buffer.type !== 'normal' || buffer.viewportY >= buffer.baseY) return null

  const cell = buffer.getNullCell()
  const stop = Math.max(0, buffer.viewportY - MAX_SCAN_LINES)
  for (let y = buffer.viewportY; y >= stop; y--) {
    const line = buffer.getLine(y)
    const text = line ? promptLineText(line, cell) : null
    if (text) return { text, line: y }
  }
  return null
}
