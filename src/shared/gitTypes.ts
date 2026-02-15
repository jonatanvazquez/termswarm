export interface GitChangedFile {
  path: string
  status: string // M, A, D, R, ?, etc.
  staged: boolean
  origPath?: string // for renames
  insertions?: number
  deletions?: number
}

export interface GitCommit {
  hash: string // 7 chars
  message: string // first line
  author: string
  relativeDate: string // "2 hours ago"
}

export interface GitStatusResult {
  isGitRepo: boolean
  branch: string // "main", "HEAD detached at abc1234"
  ahead: number
  behind: number
  staged: GitChangedFile[]
  unstaged: GitChangedFile[]
  untracked: GitChangedFile[]
}

export interface GitLogResult {
  commits: GitCommit[]
}

export interface GitPullResult {
  success: boolean
  message: string
}
