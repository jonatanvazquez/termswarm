import { useCallback, useSyncExternalStore } from 'react'

// One shared 1s ticker for every elapsed-time label, running only while something listens
const listeners = new Set<() => void>()
let ticker: ReturnType<typeof setInterval> | null = null

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!ticker) {
    ticker = setInterval(() => listeners.forEach((l) => l()), 1000)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && ticker) {
      clearInterval(ticker)
      ticker = null
    }
  }
}

/**
 * Milliseconds elapsed since an ISO timestamp, or null without one. Rounded down to the
 * second during the first minute and to the minute after that, so a label built from it
 * only re-renders when it can actually change.
 */
export function useElapsed(since: string | undefined): number | null {
  const getSnapshot = useCallback(() => {
    if (!since) return null
    const elapsed = Math.max(0, Date.now() - new Date(since).getTime())
    const step = elapsed < 60_000 ? 1000 : 60_000
    return Math.floor(elapsed / step) * step
  }, [since])

  return useSyncExternalStore(subscribe, getSnapshot)
}
