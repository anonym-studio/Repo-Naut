use crate::models::{Commit, Platform, RepoStatus, Repository, Workspace};
use crate::store;
use crate::watcher;
use git2::{BranchType, Repository as GitRepo, Status, StatusOptions};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use uuid::Uuid;
use walkdir::WalkDir;

/// workspace配下の.gitディレクトリを再帰検索してリポジトリ一覧を返す
#[tauri::command]
pub async fn scan_workspace(app: AppHandle, path: String) -> Result<Vec<Repository>, String> {
    let workspace_root = PathBuf::from(&path);
    if !workspace_root.exists() {
        return Err(format!("workspace path does not exist: {}", path));
    }

    let settings = store::load_settings(&app)?;
    let workspace_id = settings
        .workspaces
        .iter()
        .find(|w| w.path == path)
        .map(|w| w.id.clone())
        .unwrap_or_default();
    let archive_dir_name = settings
        .workspaces
        .iter()
        .find(|w| w.path == path)
        .map(|w| w.archive_dir_name.clone())
        .unwrap_or_else(|| "_archive".to_string());
    let user_excluded: Vec<String> = settings
        .excluded_dirs
        .iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let repos_meta = store::load_repos_meta(&app)?;

    let mut found: Vec<PathBuf> = Vec::new();
    let mut walker = WalkDir::new(&workspace_root)
        .max_depth(8)
        .follow_links(false)
        .into_iter();
    while let Some(entry) = walker.next() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if !entry.file_type().is_dir() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();

        // .git を見つけたら親をリポジトリとして登録し、その配下は探索しない
        if name == ".git" {
            if let Some(repo_dir) = entry.path().parent() {
                found.push(repo_dir.to_path_buf());
            }
            walker.skip_current_dir();
            continue;
        }

        // 除外対象（node_modules等 + ユーザー設定）に入ったらツリー全体をスキップ
        if is_excluded_dir(&name) || user_excluded.iter().any(|e| e == &name) {
            walker.skip_current_dir();
            continue;
        }
    }

    let archive_root = workspace_root.join(&archive_dir_name);

    let mut repos: Vec<Repository> = Vec::new();
    for repo_path in found {
        let path_str = repo_path.to_string_lossy().to_string();
        let id = store::repo_id_from_path(&path_str);
        let name = repo_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "repo".to_string());

        let meta = repos_meta.repos.get(&id).cloned().unwrap_or_default();
        let status = if meta.status == "archived" || repo_path.starts_with(&archive_root) {
            RepoStatus::Archived
        } else {
            RepoStatus::Active
        };

        let git_info = load_git_info(&repo_path);
        let language = collect_languages(&repo_path);
        let has_readme = detect_readme(&repo_path).is_some();

        repos.push(Repository {
            id,
            name,
            path: path_str,
            workspace_id: workspace_id.clone(),
            remote_url: git_info.remote_url,
            platform: git_info.platform,
            latest_commit: git_info.latest_commit,
            current_branch: git_info.current_branch,
            branches: Some(git_info.branches),
            ahead: git_info.ahead,
            behind: git_info.behind,
            unstaged_count: git_info.unstaged_count,
            tags: meta.tags,
            note: meta.note,
            language,
            status,
            archived_at: meta.archived_at,
            archive_meta: meta.archive_meta,
            has_readme,
        });
    }

    Ok(repos)
}

#[tauri::command]
pub async fn add_workspace(
    app: AppHandle,
    name: String,
    path: String,
) -> Result<Workspace, String> {
    let mut settings = store::load_settings(&app)?;
    let workspace = Workspace {
        id: Uuid::new_v4().to_string(),
        name,
        path,
        archive_dir_name: "_archive".to_string(),
        created_at: store::iso_now(),
    };
    settings.workspaces.push(workspace.clone());
    if settings.active_workspace_id.is_empty() {
        settings.active_workspace_id = workspace.id.clone();
    }
    store::save_settings(&app, &settings)?;
    let _ = watcher::start_watching(&app, workspace.id.clone(), workspace.path.clone());
    Ok(workspace)
}

#[tauri::command]
pub async fn remove_workspace(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    settings.workspaces.retain(|w| w.id != id);
    if settings.active_workspace_id == id {
        settings.active_workspace_id = settings
            .workspaces
            .first()
            .map(|w| w.id.clone())
            .unwrap_or_default();
    }
    store::save_settings(&app, &settings)?;

    if let Some(active) = settings
        .workspaces
        .iter()
        .find(|w| w.id == settings.active_workspace_id)
    {
        let _ = watcher::start_watching(&app, active.id.clone(), active.path.clone());
    } else {
        let _ = watcher::stop_watching(&app);
    }
    Ok(())
}

#[tauri::command]
pub async fn set_active_workspace(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    settings.active_workspace_id = id.clone();
    store::save_settings(&app, &settings)?;
    if let Some(active) = settings.workspaces.iter().find(|w| w.id == id) {
        let _ = watcher::start_watching(&app, active.id.clone(), active.path.clone());
    }
    Ok(())
}

// ---- 内部ユーティリティ ----

/// リポジトリ直下から README ファイルを探す（大文字小文字を問わず複数の拡張子に対応）。
/// 見つかれば絶対パスを返す。
pub(crate) fn detect_readme(repo_path: &Path) -> Option<PathBuf> {
    let entries = std::fs::read_dir(repo_path).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let lower = name.to_ascii_lowercase();
        let matched = matches!(
            lower.as_str(),
            "readme.md" | "readme.markdown" | "readme.mdown" | "readme.mkd" | "readme.rst" | "readme.txt" | "readme"
        );
        if matched && entry.file_type().ok()?.is_file() {
            return Some(entry.path());
        }
    }
    None
}

fn is_excluded_dir(name: &str) -> bool {
    matches!(
        name,
        "node_modules"
            | ".git"
            | ".idea"
            | ".vscode"
            | ".turbo"
            | ".cache"
            | "dist"
            | "build"
            | "target"
            | ".next"
    )
}

#[derive(Default)]
struct GitInfo {
    remote_url: Option<String>,
    platform: Option<Platform>,
    latest_commit: Option<Commit>,
    current_branch: Option<String>,
    branches: Vec<String>,
    ahead: Option<u32>,
    behind: Option<u32>,
    unstaged_count: Option<u32>,
}

fn load_git_info(path: &Path) -> GitInfo {
    let repo = match GitRepo::open(path) {
        Ok(r) => r,
        Err(_) => return GitInfo::default(),
    };

    let remote_url = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(|s| s.to_string()));
    let platform = remote_url.as_deref().map(detect_platform);

    let head = repo.head().ok();
    let current_branch = head
        .as_ref()
        .and_then(|h| h.shorthand().map(|s| s.to_string()));

    let latest_commit = head.as_ref().and_then(|h| h.peel_to_commit().ok()).map(|c| {
        let sha = c.id().to_string();
        let short_sha = sha.chars().take(7).collect::<String>();
        let when = c.time();
        let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(when.seconds(), 0)
            .unwrap_or_else(chrono::Utc::now);
        Commit {
            sha,
            short_sha,
            message: c.summary().unwrap_or("").to_string(),
            author: c.author().name().unwrap_or("").to_string(),
            date: dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
        }
    });

    let branches: Vec<String> = repo
        .branches(Some(BranchType::Local))
        .map(|iter| {
            iter.filter_map(|b| b.ok())
                .filter_map(|(branch, _)| branch.name().ok().flatten().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let (ahead, behind) = match head.as_ref() {
        Some(h) => compute_ahead_behind(&repo, h)
            .map(|(a, b)| (Some(a as u32), Some(b as u32)))
            .unwrap_or((None, None)),
        None => (None, None),
    };

    let mut status_opts = StatusOptions::new();
    status_opts.include_untracked(true).include_ignored(false);
    let unstaged_count = repo
        .statuses(Some(&mut status_opts))
        .ok()
        .map(|statuses| {
            statuses
                .iter()
                .filter(|s| {
                    let st = s.status();
                    st.intersects(
                        Status::WT_NEW
                            | Status::WT_MODIFIED
                            | Status::WT_DELETED
                            | Status::WT_RENAMED
                            | Status::WT_TYPECHANGE,
                    )
                })
                .count() as u32
        });

    GitInfo {
        remote_url,
        platform,
        latest_commit,
        current_branch,
        branches,
        ahead,
        behind,
        unstaged_count,
    }
}

fn compute_ahead_behind(
    repo: &GitRepo,
    head: &git2::Reference,
) -> Option<(usize, usize)> {
    let local_oid = head.target()?;
    let name = head.name()?;
    let upstream = repo.branch_upstream_name(name).ok()?;
    let upstream_name = std::str::from_utf8(&upstream).ok()?;
    let upstream_ref = repo.find_reference(upstream_name).ok()?;
    let upstream_oid = upstream_ref.target()?;
    repo.graph_ahead_behind(local_oid, upstream_oid).ok()
}

fn detect_platform(url: &str) -> Platform {
    if url.contains("github.com") {
        Platform::Github
    } else if url.contains("gitlab.com") {
        Platform::Gitlab
    } else if url.contains("bitbucket.org") {
        Platform::Bitbucket
    } else {
        Platform::Other
    }
}

fn collect_languages(repo_path: &Path) -> Vec<String> {
    let mut counts: HashMap<&'static str, usize> = HashMap::new();
    let mut walker = WalkDir::new(repo_path).max_depth(4).into_iter();
    while let Some(entry) = walker.next() {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if entry.file_type().is_dir() {
            let name = entry.file_name().to_string_lossy().to_string();
            if is_excluded_dir(&name) {
                walker.skip_current_dir();
                continue;
            }
        } else if entry.file_type().is_file() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if let Some(lang) = ext_to_lang(ext) {
                    *counts.entry(lang).or_insert(0) += 1;
                }
            }
        }
    }
    let mut entries: Vec<(&'static str, usize)> = counts.into_iter().collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1));
    entries.into_iter().take(5).map(|(k, _)| k.to_string()).collect()
}

fn ext_to_lang(ext: &str) -> Option<&'static str> {
    Some(match ext.to_ascii_lowercase().as_str() {
        "ts" => "TypeScript",
        "tsx" => "TSX",
        "js" => "JavaScript",
        "jsx" => "JSX",
        "rs" => "Rust",
        "go" => "Go",
        "py" => "Python",
        "rb" => "Ruby",
        "java" => "Java",
        "kt" | "kts" => "Kotlin",
        "swift" => "Swift",
        "c" => "C",
        "h" => "C/C++ Header",
        "cpp" | "cc" | "cxx" => "C++",
        "cs" => "C#",
        "php" => "PHP",
        "sh" | "bash" | "zsh" => "Shell",
        "md" => "Markdown",
        "json" => "JSON",
        "yml" | "yaml" => "YAML",
        "html" => "HTML",
        "css" => "CSS",
        "scss" => "Sass",
        "vue" => "Vue",
        "svelte" => "Svelte",
        "toml" => "TOML",
        "sql" => "SQL",
        _ => return None,
    })
}

