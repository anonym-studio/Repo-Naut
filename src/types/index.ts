// ---- リポジトリ ----
export type Commit = {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string // ISO 8601
}

export type ArchiveMeta = {
  originalPath: string
  lastCommitSha: string
  lastCommitMessage: string
  lastCommitDate: string
  archivedAt: string
}

export type Platform = 'github' | 'gitlab' | 'bitbucket' | 'other'

export type Repository = {
  id: string
  name: string
  path: string
  workspaceId: string
  remoteUrl?: string
  platform?: Platform
  // git2から取得（メモリ保持、永続化しない）
  latestCommit?: Commit
  currentBranch?: string
  branches?: string[]
  ahead?: number
  behind?: number
  unstagedCount?: number
  // ユーザー定義メタ（永続化）
  tags: string[]
  note?: string
  language: string[]
  status: 'active' | 'archived'
  archivedAt?: string
  archiveMeta?: ArchiveMeta
  hasReadme?: boolean
}

export type ReadmeContent = {
  fileName: string
  path: string
  content: string
  truncated: boolean
  size: number
}

export type RepoMeta = Pick<Repository, 'tags' | 'note' | 'status' | 'archivedAt' | 'archiveMeta'>

export type RepoDetail = {
  commits: Commit[]
  branches: string[]
}

// ---- Workspace ----
export type Workspace = {
  id: string
  name: string
  path: string
  archiveDirName: string // デフォルト: "_archive"
  createdAt: string
}

// ---- タスク (カンバン) ----
export type Column = 'todo' | 'in_progress' | 'review' | 'done'

export type Task = {
  id: string
  repoId?: string // null = グローバルタスク
  title: string
  description?: string // Markdown
  column: Column
  order: number
  priority: 'low' | 'medium' | 'high'
  labels: string[]
  dueDate?: string
  commitSha?: string
  prUrl?: string
  createdAt: string
  updatedAt: string
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>

// ---- GitHub API (PAT有効時) ----
export type PatValidation = {
  valid: boolean
  login?: string
  scopes?: string
  message?: string
}

export type GitHubStats = {
  openPrCount: number
  openIssueCount: number
  fetchedAt: string
}

// ---- エディタ設定 ----
export type EditorPreset = 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'custom'

export type EditorConfig = {
  id: string
  name: string
  command: string
  args: string[]
  preset?: EditorPreset
}

export type TerminalPreset =
  | 'auto'
  | 'iterm2'
  | 'terminal_app'
  | 'ghostty'
  | 'windows_terminal'
  | 'cmd'
  | 'custom'

// ---- 設定 ----
export type Settings = {
  workspaces: Workspace[]
  activeWorkspaceId: string
  github: {
    enabled: boolean
  }
  editors: EditorConfig[]
  defaultEditorId: string
  gh: {
    path?: string
  }
  terminal: {
    command?: string
    preset: TerminalPreset
  }
  theme: 'light' | 'dark' | 'system'
  commitHistoryLimit: number
  excludedDirs: string[]
}

// ---- Tauriコマンド戻り値 ----
export type GitCommandResult = {
  success: boolean
  stdout: string
  stderr: string
}

export type CommitActivityDay = {
  /** YYYY-MM-DD (UTC) */
  date: string
  count: number
}

export type CommitActivity = {
  days: number
  total: number
  series: CommitActivityDay[]
}

export type GhAuthStatus = {
  installed: boolean
  authenticated: boolean
  username?: string
}

export type CreateRepoResult = {
  success: boolean
  repoUrl?: string
  localPath?: string
  error?: string
}
