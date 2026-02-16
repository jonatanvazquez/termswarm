export interface AndroidEmulator {
  name: string
  displayName: string
}

export interface IOSSimulator {
  udid: string
  name: string
  runtime: string
  state: string
}

export interface EmulatorListResult<T> {
  available: boolean
  devices: T[]
  error?: string
}
