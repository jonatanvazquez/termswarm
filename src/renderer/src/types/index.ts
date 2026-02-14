export type ConversationStatus = 'running' | 'waiting' | 'idle' | 'error'

export interface Conversation {
  id: string
  projectId: string
  name: string
  status: ConversationStatus
  lastMessage: string
  createdAt: string
  unread: boolean
  archived: boolean
}

export interface Project {
  id: string
  name: string
  path: string
  color: string
  conversations: Conversation[]
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
