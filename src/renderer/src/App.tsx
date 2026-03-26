import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { ConnectionManagerModal } from './components/connections/ConnectionManagerModal'
import { usePtyListener } from './hooks/usePtyListener'
import { useProjectStore } from './store/projectStore'
import { useSettingsStore, BASE_ZOOM } from './store/settingsStore'
import { useTerminalStore } from './store/terminalStore'
import { useUIStore } from './store/uiStore'
import { useConnectionStore } from './store/connectionStore'

function saveBuffersToDisk(): void {
  const buffers = useTerminalStore.getState().serializeAllBuffers()
  if (Object.keys(buffers).length > 0) {
    window.api.saveBuffers(buffers)
  }
}

function App(): React.JSX.Element {
  usePtyListener()

  useEffect(() => {
    console.log('=== [App] MOUNTED (full page load/reload) ===')
    // Kill any orphaned PTY sessions from previous renderer loads
    window.api.ptyKillAll().then(() => {
      console.log('[App] orphaned PTYs cleaned up')
    })
    useProjectStore.getState().loadFromDisk()
    useSettingsStore.getState().loadFromDisk()
    useUIStore.getState().loadFromDisk()
    useConnectionStore.getState().loadFromDisk()

    // Load saved terminal buffers from disk into pendingContent
    window.api.loadBuffers().then((buffers) => {
      if (buffers && Object.keys(buffers).length > 0) {
        console.log('[App] loaded saved buffers:', Object.keys(buffers).length, 'conversations')
        useTerminalStore.getState().loadSavedBuffers(buffers)
      }
    })

    // Periodic buffer save (safety net for hard kills)
    const interval = setInterval(saveBuffersToDisk, 10_000)

    // Save buffers when window is about to close
    const handleBeforeUnload = (): void => {
      saveBuffersToDisk()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Auto-update listener
    const cleanupUpdater = useSettingsStore.getState().initUpdateListener()

    // SSH status listener
    const cleanupSsh = useConnectionStore.getState().initStatusListener()

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      cleanupUpdater()
      cleanupSsh()
    }
  }, [])

  const zoom = useSettingsStore((s) => s.zoom)
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)
  const connectionManagerOpen = useConnectionStore((s) => s.managerOpen)

  // Use Electron's native zoom — works correctly with canvas/WebGL (xterm)
  useEffect(() => {
    window.api.setZoomFactor(zoom * BASE_ZOOM)
  }, [zoom])

  return (
    <>
      <AppLayout />
      {settingsOpen && <SettingsPanel />}
      {connectionManagerOpen && <ConnectionManagerModal />}
    </>
  )
}

export default App
