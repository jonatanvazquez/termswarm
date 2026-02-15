import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const DATA_DIR = join(app.getPath('userData'), 'termswarm-data')
const DATA_FILE = join(DATA_DIR, 'projects.json')
const BUFFERS_FILE = join(DATA_DIR, 'buffers.json')
const SETTINGS_FILE = join(DATA_DIR, 'settings.json')
const UI_LAYOUT_FILE = join(DATA_DIR, 'ui-layout.json')

export function loadProjects(): unknown {
  try {
    if (!existsSync(DATA_FILE)) return null
    const raw = readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveProjects(data: unknown): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save projects:', err)
  }
}

export function loadBuffers(): Record<string, string> | null {
  try {
    if (!existsSync(BUFFERS_FILE)) return null
    const raw = readFileSync(BUFFERS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveBuffers(data: Record<string, string>): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    writeFileSync(BUFFERS_FILE, JSON.stringify(data), 'utf-8')
  } catch (err) {
    console.error('Failed to save buffers:', err)
  }
}

export function loadSettings(): unknown {
  try {
    if (!existsSync(SETTINGS_FILE)) return null
    const raw = readFileSync(SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSettings(data: unknown): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

export function loadUILayout(): unknown {
  try {
    if (!existsSync(UI_LAYOUT_FILE)) return null
    const raw = readFileSync(UI_LAYOUT_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveUILayout(data: unknown): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    writeFileSync(UI_LAYOUT_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save UI layout:', err)
  }
}
