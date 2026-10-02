export type ConversationStatus = 'running' | 'waiting' | 'idle' | 'error' | 'paused' | 'stopped'

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
  waitingSince?: string
  // Last time the user sent input in this session
  lastMessageAt?: string
  // Name last applied to the Claude Code session itself (see syncClaudeName)
  claudeName?: string
}

export interface BrowserTab {
  id: string
  url: string
}

export interface Project {
  id: string
  name: string
  path: string
  color: string
  conversations: Conversation[]
  previewOpen?: boolean
  previewUrl?: string
  previewTabs?: BrowserTab[]
  activePreviewTabId?: string
  archived?: boolean
  connectionId?: string
}

export interface Tab {
  conversationId: string
  projectId: string
}
