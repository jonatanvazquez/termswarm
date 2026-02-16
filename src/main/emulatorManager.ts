import { execFile, spawn } from 'child_process'
import { access } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'
import type { AndroidEmulator, IOSSimulator, EmulatorListResult } from '../shared/emulatorTypes'

const EXEC_OPTIONS = {
  timeout: 15_000,
  maxBuffer: 1024 * 1024
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, EXEC_OPTIONS, (err, stdout) => {
      if (err) reject(err)
      else resolve(stdout)
    })
  })
}

class EmulatorManager {
  private androidEmulatorBinary: string | null = null

  private async resolveAndroidEmulatorBinary(): Promise<string | null> {
    if (this.androidEmulatorBinary) return this.androidEmulatorBinary

    const candidates: string[] = []

    // Check environment variables first
    for (const envVar of ['ANDROID_HOME', 'ANDROID_SDK_ROOT']) {
      const sdkPath = process.env[envVar]
      if (sdkPath) {
        candidates.push(join(sdkPath, 'emulator', 'emulator'))
      }
    }

    // Platform-specific default paths
    if (process.platform === 'darwin') {
      candidates.push(join(homedir(), 'Library', 'Android', 'sdk', 'emulator', 'emulator'))
    } else if (process.platform === 'linux') {
      candidates.push(join(homedir(), 'Android', 'Sdk', 'emulator', 'emulator'))
    } else if (process.platform === 'win32') {
      const localAppData = process.env['LOCALAPPDATA'] || join(homedir(), 'AppData', 'Local')
      candidates.push(join(localAppData, 'Android', 'Sdk', 'emulator', 'emulator.exe'))
    }

    for (const candidate of candidates) {
      try {
        await access(candidate)
        this.androidEmulatorBinary = candidate
        return candidate
      } catch {
        // Try next candidate
      }
    }

    return null
  }

  async listAndroid(): Promise<EmulatorListResult<AndroidEmulator>> {
    try {
      const binary = await this.resolveAndroidEmulatorBinary()
      if (!binary) {
        return { available: false, devices: [], error: 'Android SDK not found' }
      }

      const stdout = await run(binary, ['-list-avds'])
      const devices = stdout
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((name) => ({
          name: name.trim(),
          displayName: name.trim().replace(/_/g, ' ')
        }))

      return { available: true, devices }
    } catch (err) {
      return { available: false, devices: [], error: (err as Error).message }
    }
  }

  async launchAndroid(avdName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const binary = await this.resolveAndroidEmulatorBinary()
      if (!binary) {
        return { success: false, error: 'Android SDK not found' }
      }

      const child = spawn(binary, [`@${avdName}`], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async listIOS(): Promise<EmulatorListResult<IOSSimulator>> {
    if (process.platform !== 'darwin') {
      return { available: false, devices: [], error: 'iOS Simulator is only available on macOS' }
    }

    try {
      const stdout = await run('xcrun', ['simctl', 'list', 'devices', 'available', '-j'])
      const parsed = JSON.parse(stdout) as {
        devices: Record<string, Array<{ udid: string; name: string; state: string }>>
      }

      const devices: IOSSimulator[] = []
      for (const [runtime, sims] of Object.entries(parsed.devices)) {
        // Runtime looks like "com.apple.CoreSimulator.SimRuntime.iOS-17-5"
        const runtimeName = runtime
          .replace('com.apple.CoreSimulator.SimRuntime.', '')
          .replace(/-/g, ' ')
          .replace(/\s(\d+)\s/, ' $1.')

        for (const sim of sims) {
          devices.push({
            udid: sim.udid,
            name: sim.name,
            runtime: runtimeName,
            state: sim.state
          })
        }
      }

      return { available: true, devices }
    } catch (err) {
      return { available: false, devices: [], error: (err as Error).message }
    }
  }

  async openAndroidManager(): Promise<{ success: boolean; error?: string }> {
    try {
      if (process.platform === 'darwin') {
        spawn('open', ['-a', 'Android Studio'], { detached: true, stdio: 'ignore' }).unref()
      } else if (process.platform === 'linux') {
        spawn('studio', [], { detached: true, stdio: 'ignore' }).unref()
      } else if (process.platform === 'win32') {
        spawn('cmd', ['/c', 'start', 'studio64'], { detached: true, stdio: 'ignore' }).unref()
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async openIOSManager(): Promise<{ success: boolean; error?: string }> {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'Only available on macOS' }
    }
    try {
      spawn('open', ['-a', 'Simulator'], { detached: true, stdio: 'ignore' }).unref()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }

  async launchIOS(udid: string): Promise<{ success: boolean; error?: string }> {
    if (process.platform !== 'darwin') {
      return { success: false, error: 'iOS Simulator is only available on macOS' }
    }

    try {
      // Boot the device (ignore error if already booted)
      try {
        await run('xcrun', ['simctl', 'boot', udid])
      } catch {
        // Already booted — that's fine
      }

      // Open Simulator.app targeting the device
      const child = spawn('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', udid], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()

      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  }
}

export const emulatorManager = new EmulatorManager()
