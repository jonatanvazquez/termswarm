export type ConversationStatus = 'running' | 'waiting' | 'idle' | 'error' | 'paused'

export type ConversationType = 'claude' | 'terminal'

export interface Conversation {
  id: string
  projectId: string
  name: string
  status: ConversationStatus
  lastMessage: string
  createdAt: string
  unread: boolean
  archived: boolean
  claudeSessionId?: string
  type: ConversationType
}

export interface Project {
  id: string
  name: string
  path: string
  color: string
  conversations: Conversation[]
  previewOpen?: boolean
  previewUrl?: string
}

export interface Notification {
  id: string
  conversationId: string
  projectName: string
  conversationName: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  timestamp: string
}

export interface Tab {
  conversationId: string
  projectId: string
}
