import { create } from 'zustand'
import type { UpdateStatus } from '../../../shared/updateTypes'

/** User-facing 100% maps to this actual CSS zoom value. */
export const BASE_ZOOM = 1.2

interface SettingsState {
  zoom: number
  settingsOpen: boolean
  updateStatus: UpdateStatus
  updateBannerDismissed: boolean
  setZoom: (zoom: number) => void
  toggleSettings: () => void
  loadFromDisk: () => Promise<void>
  setUpdateStatus: (status: UpdateStatus) => void
  dismissUpdateBanner: () => void
  checkForUpdates: () => Promise<void>
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  initUpdateListener: () => () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  zoom: 1,
  settingsOpen: false,
  updateStatus: { state: 'idle', currentVersion: 'dev' },
  updateBannerDismissed: false,

  setZoom: (zoom) => set({ zoom: Math.round(zoom * 100) / 100 }),

  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

  loadFromDisk: async () => {
    const raw = await window.api.loadSettings()
    if (!raw || typeof raw !== 'object') return
    const data = raw as { zoom?: number }
    if (typeof data.zoom === 'number' && data.zoom >= 0.75 && data.zoom <= 1.25) {
      set({ zoom: data.zoom })
    }
  },

  setUpdateStatus: (status) => set({ updateStatus: status }),

  dismissUpdateBanner: () => set({ updateBannerDismissed: true }),

  checkForUpdates: async () => {
    await window.api.updaterCheck()
  },

  downloadUpdate: async () => {
    await window.api.updaterDownload()
  },

  installUpdate: async () => {
    await window.api.updaterInstall()
  },

  initUpdateListener: () => {
    // Fetch initial status
    window.api.updaterGetStatus().then((status) => {
      useSettingsStore.setState({ updateStatus: status })
    })

    // Subscribe to push updates
    const cleanup = window.api.onUpdaterStatus((status) => {
      useSettingsStore.setState({
        updateStatus: status,
        // Reset banner dismissal when a new version becomes available or downloaded
        ...(status.state === 'available' || status.state === 'downloaded'
          ? { updateBannerDismissed: false }
          : {})
      })
    })

    return cleanup
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
