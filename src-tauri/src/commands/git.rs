use crate::models::{Commit, GitCommandResult, RepoDetail, RepoMetaEntry};
use crate::store;
use git2::{BranchType, Repository as GitRepo, Sort};
use serde_json::Value;
use std::process::Command;
use tauri::AppHandle;

/// コミット履歴とブランチ一覧を返す（git2使用）
#[tauri::command]
pub async fn get_repo_detail(app: AppHandle, path: String) -> Result<RepoDetail, String> {
    let settings = store::load_settings(&app)?;
    let limit = settings.commit_history_limit.max(1) as usize;

    let repo = GitRepo::open(&path).map_err(|e| e.to_string())?;

    let mut revwalk = repo.revwalk().map_err(|e| e.to_string())?;
    revwalk
        .set_sorting(Sort::TIME)
        .map_err(|e| e.to_string())?;
    if revwalk.push_head().is_err() {
        return Ok(RepoDetail {
            commits: vec![],
            branches: vec![],
        });
    }

    let mut commits: Vec<Commit> = Vec::with_capacity(limit);
    for oid in revwalk.take(limit) {
        let oid = match oid {
            Ok(o) => o,
            Err(_) => continue,
        };
        if let Ok(c) = repo.find_commit(oid) {
            let sha = c.id().to_string();
            let short_sha = sha.chars().take(7).collect::<String>();
            let when = c.time();
            let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(when.seconds(), 0)
                .unwrap_or_else(chrono::Utc::now);
            commits.push(Commit {
                sha,
                short_sha,
                message: c.summary().unwrap_or("").to_string(),
                author: c.author().name().unwrap_or("").to_string(),
                date: dt.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            });
        }
    }

    let branches: Vec<String> = repo
        .branches(Some(BranchType::Local))
        .map(|iter| {
            iter.filter_map(|b| b.ok())
                .filter_map(|(branch, _)| branch.name().ok().flatten().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    Ok(RepoDetail { commits, branches })
}

/// タグ・メモ・アーカイブ状態などユーザー定義メタを部分更新する。
/// `meta` には更新したいフィールドのみを含める（Partial）。
#[tauri::command]
pub async fn update_repo_meta(app: AppHandle, id: String, meta: Value) -> Result<(), String> {
    let mut repos_meta = store::load_repos_meta(&app)?;
    let current = repos_meta
        .repos
        .get(&id)
        .cloned()
        .unwrap_or_else(RepoMetaEntry::default);
    let mut base = serde_json::to_value(&current).map_err(|e| e.to_string())?;
    if let (Value::Object(ref mut b), Value::Object(p)) = (&mut base, meta) {
        for (k, v) in p {
            b.insert(k, v);
        }
    }
    // statusが空の場合はデフォルトを設定（初回作成時の整合性確保）
    if let Value::Object(ref mut b) = base {
        if b.get("status").and_then(|v| v.as_str()).unwrap_or("").is_empty() {
            b.insert("status".to_string(), Value::String("active".to_string()));
        }
    }
    let merged: RepoMetaEntry = serde_json::from_value(base).map_err(|e| e.to_string())?;
    repos_meta.repos.insert(id, merged);
    store::save_repos_meta(&app, &repos_meta)
}

#[tauri::command]
pub async fn git_pull(app: AppHandle, path: String) -> Result<GitCommandResult, String> {
    let _ = app;
    run_git(&path, &["pull"])
}

#[tauri::command]
pub async fn git_fetch(app: AppHandle, path: String) -> Result<GitCommandResult, String> {
    let _ = app;
    run_git(&path, &["fetch"])
}

#[tauri::command]
pub async fn git_checkout(
    app: AppHandle,
    path: String,
    branch: String,
) -> Result<GitCommandResult, String> {
    let _ = app;
    run_git(&path, &["checkout", &branch])
}

fn run_git(path: &str, args: &[&str]) -> Result<GitCommandResult, String> {
    let output = Command::new("git")
        .current_dir(path)
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(GitCommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}
