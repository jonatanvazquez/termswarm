export interface SSHConnection {
  id: string
  name: string
  host: string
  port: number
  username: string
  authMethod: 'key' | 'password'
  privateKeyPath?: string
  password?: string
  passphrase?: string
  gitToken?: string
}

export interface SSHConnectionSaved {
  id: string
  name: string
  host: string
  port: number
  username: string
  authMethod: 'key' | 'password'
  privateKeyPath?: string
  gitToken?: string
}

export type SSHConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface SSHConnectionState {
  connectionId: string
  status: SSHConnectionStatus
  error?: string
}

export interface GitHubRepo {
  name: string
  fullName: string
  cloneUrl: string
  description: string | null
  private: boolean
  updatedAt: string
}

export interface SFTPEntry {
  name: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}
