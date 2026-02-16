import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'
import type { AndroidEmulator, IOSSimulator } from '../../../../shared/emulatorTypes'

interface EmulatorDropdownProps {
  type: 'android' | 'ios'
  anchorRef: RefObject<HTMLButtonElement | null>
  isOpen: boolean
  onClose: () => void
}

const MENU_WIDTH = 224 // w-56 = 14rem = 224px
const EDGE_PADDING = 8

export function EmulatorDropdown({ type, anchorRef, isOpen, onClose }: EmulatorDropdownProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [androidDevices, setAndroidDevices] = useState<AndroidEmulator[]>([])
  const [iosDevices, setIOSDevices] = useState<IOSSimulator[]>([])
  const [launching, setLaunching] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false })

  const computePosition = useCallback(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth

    // Horizontal: left-align to the button, clamp to viewport edges
    let left = rect.left
    if (left + MENU_WIDTH > vw - EDGE_PADDING) left = vw - EDGE_PADDING - MENU_WIDTH
    if (left < EDGE_PADDING) left = EDGE_PADDING

    // Vertical: prefer below, flip above if not enough space
    const spaceBelow = vh - rect.bottom - EDGE_PADDING
    const spaceAbove = rect.top - EDGE_PADDING
    const menuHeight = menuRef.current?.offsetHeight || 320
    const openUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

    const top = openUp ? rect.top - menuHeight - 4 : rect.bottom + 4

    setPos({ top, left, openUp })
  }, [anchorRef])

  useEffect(() => {
    if (!isOpen) return

    computePosition()

    // Fetch devices
    setLoading(true)
    setError(null)

    const fetchDevices =
      type === 'android' ? window.api.emulatorListAndroid() : window.api.emulatorListIOS()

    fetchDevices
      .then((result) => {
        if (!result.available) {
          setError(result.error || `${type === 'android' ? 'Android SDK' : 'Xcode'} not found`)
          return
        }
        if (type === 'android') {
          setAndroidDevices(result.devices as AndroidEmulator[])
        } else {
          setIOSDevices(result.devices as IOSSimulator[])
        }
      })
      .catch((err) => {
        setError((err as Error).message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, type, anchorRef, computePosition])

  // Reposition after content loads (menu height may change)
  useEffect(() => {
    if (isOpen && !loading) {
      requestAnimationFrame(computePosition)
    }
  }, [isOpen, loading, androidDevices, iosDevices, computePosition])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const handleLaunchAndroid = async (name: string) => {
    setLaunching(name)
    await window.api.emulatorLaunchAndroid(name)
    setLaunching(null)
    onClose()
  }

  const handleLaunchIOS = async (udid: string) => {
    setLaunching(udid)
    await window.api.emulatorLaunchIOS(udid)
    setLaunching(null)
    onClose()
  }

  const handleCreateNew = async () => {
    if (type === 'android') {
      await window.api.emulatorOpenAndroidManager()
    } else {
      await window.api.emulatorOpenIOSManager()
    }
    onClose()
  }

  // Group iOS devices by runtime
  const iosGrouped = iosDevices.reduce<Record<string, IOSSimulator[]>>((acc, sim) => {
    if (!acc[sim.runtime]) acc[sim.runtime] = []
    acc[sim.runtime].push(sim)
    return acc
  }, {})

  return createPortal(
    <div
      ref={menuRef}
      className="max-h-80 w-56 overflow-y-auto rounded-md border border-border-default bg-surface-1 py-1 shadow-lg"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        {type === 'android' ? 'Android Emulators' : 'iOS Simulators'}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={14} className="animate-spin text-text-secondary" />
        </div>
      )}

      {error && <div className="px-3 py-2 text-xs text-error">{error}</div>}

      {!loading && !error && type === 'android' && androidDevices.length === 0 && (
        <div className="px-3 py-2 text-xs text-text-secondary">No AVDs found</div>
      )}

      {!loading && !error && type === 'ios' && iosDevices.length === 0 && (
        <div className="px-3 py-2 text-xs text-text-secondary">No simulators found</div>
      )}

      {!loading &&
        !error &&
        type === 'android' &&
        androidDevices.map((device) => (
          <button
            key={device.name}
            onClick={() => handleLaunchAndroid(device.name)}
            disabled={launching === device.name}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-2 disabled:opacity-50"
          >
            {launching === device.name ? (
              <Loader2 size={10} className="shrink-0 animate-spin" />
            ) : (
              <span className="h-2.5 w-2.5 shrink-0" />
            )}
            {device.displayName}
          </button>
        ))}

      {!loading &&
        !error &&
        type === 'ios' &&
        Object.entries(iosGrouped).map(([runtime, sims]) => (
          <div key={runtime}>
            <div className="px-3 py-1 text-[10px] font-medium text-text-secondary">{runtime}</div>
            {sims.map((sim) => (
              <button
                key={sim.udid}
                onClick={() => handleLaunchIOS(sim.udid)}
                disabled={launching === sim.udid}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-2 disabled:opacity-50"
              >
                {launching === sim.udid ? (
                  <Loader2 size={10} className="shrink-0 animate-spin" />
                ) : (
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${sim.state === 'Booted' ? 'bg-success' : 'bg-text-secondary/30'}`}
                  />
                )}
                {sim.name}
              </button>
            ))}
          </div>
        ))}

      {!loading && (
        <>
          <div className="mx-2 my-1 border-t border-border-default" />
          <button
            onClick={handleCreateNew}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          >
            <Plus size={12} className="shrink-0" />
            {type === 'android' ? 'Open Android Studio' : 'Open Simulator'}
          </button>
        </>
      )}
    </div>,
    document.body
  )
}
