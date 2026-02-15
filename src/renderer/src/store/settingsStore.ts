import { create } from 'zustand'

/** User-facing 100% maps to this actual CSS zoom value. */
export const BASE_ZOOM = 1.2

interface SettingsState {
  zoom: number
  settingsOpen: boolean
  setZoom: (zoom: number) => void
  toggleSettings: () => void
  loadFromDisk: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  zoom: 1,
  settingsOpen: false,

  setZoom: (zoom) => set({ zoom: Math.round(zoom * 100) / 100 }),

  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  loadFromDisk: async () => {
    const raw = await window.api.loadSettings()
    if (!raw || typeof raw !== 'object') return
    const data = raw as { zoom?: number }
    if (typeof data.zoom === 'number' && data.zoom >= 0.75 && data.zoom <= 1.25) {
      set({ zoom: data.zoom })
    }
  }
}))

// Auto-save: debounced 500ms
let saveTimeout: ReturnType<typeof setTimeout> | null = null
useSettingsStore.subscribe((state) => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    window.api.saveSettings({ zoom: state.zoom })
  }, 500)
})
