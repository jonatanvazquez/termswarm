import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { usePtyListener } from './hooks/usePtyListener'
import { useProjectStore } from './store/projectStore'
import { useSettingsStore, BASE_ZOOM } from './store/settingsStore'
import { useTerminalStore } from './store/terminalStore'
import { useUIStore } from './store/uiStore'

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

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const zoom = useSettingsStore((s) => s.zoom)
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)

  // Use Electron's native zoom — works correctly with canvas/WebGL (xterm)
  useEffect(() => {
    window.api.setZoomFactor(zoom * BASE_ZOOM)
  }, [zoom])

  return (
    <>
      <AppLayout />
      {settingsOpen && <SettingsPanel />}
    </>
  )
}

export default App
