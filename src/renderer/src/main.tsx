import './app.css'

// Block Vite's automatic page reload on HMR WebSocket reconnect.
// Chromium's network service can crash when a webview loses its server connection,
// which kills ALL WebSocket connections including Vite's HMR. When Vite reconnects,
// it does location.reload() — but the dev server never went down, so the reload is
// unnecessary and destroys all in-memory state (tabs, terminals).
//
// We use the Navigation API to intercept reload navigations. location.reload() is
// [Unforgeable] in WebIDL and can't be overridden, but the Navigation API CAN
// preventDefault() on navigate events.
if (import.meta.env.DEV && typeof (window as any).navigation !== 'undefined') {
  ;(window as any).navigation.addEventListener('navigate', (event: any) => {
    if (event.navigationType === 'reload') {
      event.preventDefault()
      console.warn('[TermSwarm] Blocked Vite page reload (network service recovery)')
    }
  })
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
