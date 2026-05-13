use crate::commands::workspace::detect_readme;
use crate::models::{Commit, GitCommandResult, RepoDetail, RepoMetaEntry};
use crate::store;
use git2::{BranchType, Repository as GitRepo, Sort};
use serde_json::Value;
use std::path::PathBuf;
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

/// リポジトリ直下の README ファイルを読み込んで返す。
/// 5MB を超える場合は安全のため打ち切る。
#[tauri::command]
pub async fn read_readme(path: String) -> Result<ReadmeContent, String> {
    const MAX_SIZE: u64 = 5 * 1024 * 1024; // 5MB

    let repo_path = PathBuf::from(&path);
    let file_path = detect_readme(&repo_path).ok_or_else(|| "README not found".to_string())?;
    let meta = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let truncated = meta.len() > MAX_SIZE;

    let bytes = if truncated {
        use std::io::Read;
        let mut buf = vec![0u8; MAX_SIZE as usize];
        let mut f = std::fs::File::open(&file_path).map_err(|e| e.to_string())?;
        let _ = f.read(&mut buf).map_err(|e| e.to_string())?;
        buf
    } else {
        std::fs::read(&file_path).map_err(|e| e.to_string())?
    };

    let content = String::from_utf8_lossy(&bytes).into_owned();
    let file_name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "README".to_string());

    Ok(ReadmeContent {
        file_name,
        path: file_path.to_string_lossy().to_string(),
        content,
        truncated,
        size: meta.len(),
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadmeContent {
    pub file_name: String,
    pub path: String,
    pub content: String,
    pub truncated: bool,
    pub size: u64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitActivityDay {
    /// YYYY-MM-DD（UTC 基準）
    pub date: String,
    pub count: u32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitActivity {
    /// 集計対象に含まれた日数（リクエストされた `days` と同じ）
    pub days: u32,
    /// 期間内の合計コミット数
    pub total: u32,
    /// 日別のコミット数（古い→新しい順）
    pub series: Vec<CommitActivityDay>,
}

/// アクティブな workspace 内の全リポジトリ（アーカイブ除く）から
/// 直近 `days` 日のコミット数を日別に集計する。
///
/// パフォーマンス最適化として:
///  - 各リポジトリで `revwalk` を走査し、カットオフ時刻より古いコミットが現れたら break する
///  - 著者の email ベース等のフィルタは行わず、全コミットをカウント
#[tauri::command]
pub async fn get_commit_activity(
    app: AppHandle,
    days: Option<u32>,
) -> Result<CommitActivity, String> {
    use chrono::{Duration, NaiveDate, Utc};
    use std::collections::HashMap;

    let days = days.unwrap_or(30).clamp(1, 365);
    let today = Utc::now().date_naive();
    let cutoff_date = today - Duration::days((days as i64) - 1);
    let cutoff_ts = cutoff_date
        .and_hms_opt(0, 0, 0)
        .map(|dt| dt.and_utc().timestamp())
        .unwrap_or(0);

    let settings = store::load_settings(&app)?;
    let workspace = settings
        .workspaces
        .iter()
        .find(|w| w.id == settings.active_workspace_id)
        .ok_or_else(|| "active workspace not found".to_string())?;

    // workspace を walkdir で再走査するのは重いので、scan_workspace と同じ判定を簡略化:
    // 直下を 1 階層だけ覗き、`.git` を持つディレクトリを対象とする。
    let workspace_path = std::path::Path::new(&workspace.path);
    let mut buckets: HashMap<NaiveDate, u32> = HashMap::new();

    let entries = match std::fs::read_dir(workspace_path) {
        Ok(it) => it,
        Err(e) => return Err(format!("failed to read workspace: {}", e)),
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if !p.is_dir() {
            continue;
        }
        if !p.join(".git").exists() {
            continue;
        }

        let repo = match GitRepo::open(&p) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let mut revwalk = match repo.revwalk() {
            Ok(r) => r,
            Err(_) => continue,
        };
        if revwalk.set_sorting(Sort::TIME).is_err() {
            continue;
        }
        if revwalk.push_head().is_err() {
            continue;
        }

        for oid in revwalk {
            let oid = match oid {
                Ok(o) => o,
                Err(_) => continue,
            };
            let commit = match repo.find_commit(oid) {
                Ok(c) => c,
                Err(_) => continue,
            };
            let ts = commit.time().seconds();
            if ts < cutoff_ts {
                break;
            }
            let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(ts, 0)
                .unwrap_or_else(chrono::Utc::now);
            *buckets.entry(dt.date_naive()).or_insert(0) += 1;
        }
    }

    // days 分のシリーズを古い → 新しい順で埋める
    let mut series = Vec::with_capacity(days as usize);
    let mut total: u32 = 0;
    for i in 0..days as i64 {
        let d = cutoff_date + Duration::days(i);
        let count = *buckets.get(&d).unwrap_or(&0);
        total += count;
        series.push(CommitActivityDay {
            date: d.format("%Y-%m-%d").to_string(),
            count,
        });
    }

    Ok(CommitActivity {
        days,
        total,
        series,
    })
}
