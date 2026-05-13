use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ---- コミット・アーカイブ ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub sha: String,
    pub short_sha: String,
    pub message: String,
    pub author: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveMeta {
    pub original_path: String,
    pub last_commit_sha: String,
    pub last_commit_message: String,
    pub last_commit_date: String,
    pub archived_at: String,
}

// ---- リポジトリ ----

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Github,
    Gitlab,
    Bitbucket,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RepoStatus {
    Active,
    Archived,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: String,
    pub workspace_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub platform: Option<Platform>,
    // Runtime only (not persisted)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latest_commit: Option<Commit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_branch: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub branches: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ahead: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub behind: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unstaged_count: Option<u32>,
    // Persisted metadata
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub language: Vec<String>,
    pub status: RepoStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archive_meta: Option<ArchiveMeta>,
    /// リポジトリ直下に `README.md` 系ファイルが存在するか（スキャン時に検出）
    #[serde(default)]
    pub has_readme: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoDetail {
    pub commits: Vec<Commit>,
    pub branches: Vec<String>,
}

// ---- Workspace ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub archive_dir_name: String,
    pub created_at: String,
}

// ---- カンバン ----

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Column {
    Todo,
    InProgress,
    Review,
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_id: Option<String>,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub column: Column,
    pub order: f64,
    pub priority: Priority,
    pub labels: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub commit_sha: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pr_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ---- エディタ設定 ----

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum EditorPreset {
    Vscode,
    Cursor,
    Windsurf,
    Zed,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorConfig {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preset: Option<EditorPreset>,
}

// ---- 設定 ----

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GithubSettings {
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GhSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "snake_case")]
pub enum TerminalPreset {
    #[default]
    Auto,
    Iterm2,
    TerminalApp,
    Ghostty,
    WindowsTerminal,
    Cmd,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(default)]
    pub preset: TerminalPreset,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub workspaces: Vec<Workspace>,
    pub active_workspace_id: String,
    pub github: GithubSettings,
    pub editors: Vec<EditorConfig>,
    pub default_editor_id: String,
    pub gh: GhSettings,
    pub terminal: TerminalSettings,
    pub theme: Theme,
    pub commit_history_limit: u32,
    /// ネストされたリポジトリスキャン時に除外するディレクトリ名（ユーザー定義）
    #[serde(default)]
    pub excluded_dirs: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        let vscode = EditorConfig {
            id: "default-vscode".to_string(),
            name: "VS Code".to_string(),
            command: "code".to_string(),
            args: vec![],
            preset: Some(EditorPreset::Vscode),
        };
        Settings {
            workspaces: vec![],
            active_workspace_id: String::new(),
            github: GithubSettings { enabled: false },
            editors: vec![vscode],
            default_editor_id: "default-vscode".to_string(),
            gh: GhSettings::default(),
            terminal: TerminalSettings::default(),
            theme: Theme::System,
            commit_history_limit: 50,
            excluded_dirs: vec![],
        }
    }
}

// ---- Tauriコマンド戻り値 ----

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GhAuthStatus {
    pub installed: bool,
    pub authenticated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepoResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubStats {
    pub open_pr_count: u32,
    pub open_issue_count: u32,
    pub fetched_at: String,
}

// ---- JSONファイル保存構造 ----

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RepoMetaEntry {
    pub tags: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archived_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub archive_meta: Option<ArchiveMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ReposMeta {
    pub repos: HashMap<String, RepoMetaEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KanbanStore {
    pub tasks: Vec<Task>,
}
