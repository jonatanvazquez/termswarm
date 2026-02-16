import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

function getDataDir(): string {
  return join(app.getPath('userData'), 'termswarm-data')
}

function getDataFile(): string {
  return join(getDataDir(), 'projects.json')
}

function getBuffersFile(): string {
  return join(getDataDir(), 'buffers.json')
}

function getSettingsFile(): string {
  return join(getDataDir(), 'settings.json')
}

function getUILayoutFile(): string {
  return join(getDataDir(), 'ui-layout.json')
}

export function loadProjects(): unknown {
  try {
    if (!existsSync(getDataFile())) return null
    const raw = readFileSync(getDataFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveProjects(data: unknown): void {
  try {
    if (!existsSync(getDataDir())) {
      mkdirSync(getDataDir(), { recursive: true })
    }
    writeFileSync(getDataFile(), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save projects:', err)
  }
}

export function loadBuffers(): Record<string, string> | null {
  try {
    if (!existsSync(getBuffersFile())) return null
    const raw = readFileSync(getBuffersFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveBuffers(data: Record<string, string>): void {
  try {
    if (!existsSync(getDataDir())) {
      mkdirSync(getDataDir(), { recursive: true })
    }
    writeFileSync(getBuffersFile(), JSON.stringify(data), 'utf-8')
  } catch (err) {
    console.error('Failed to save buffers:', err)
  }
}

export function loadSettings(): unknown {
  try {
    if (!existsSync(getSettingsFile())) return null
    const raw = readFileSync(getSettingsFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveSettings(data: unknown): void {
  try {
    if (!existsSync(getDataDir())) {
      mkdirSync(getDataDir(), { recursive: true })
    }
    writeFileSync(getSettingsFile(), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save settings:', err)
  }
}

export function loadUILayout(): unknown {
  try {
    if (!existsSync(getUILayoutFile())) return null
    const raw = readFileSync(getUILayoutFile(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveUILayout(data: unknown): void {
  try {
    if (!existsSync(getDataDir())) {
      mkdirSync(getDataDir(), { recursive: true })
    }
    writeFileSync(getUILayoutFile(), JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save UI layout:', err)
  }
}
