use crate::models::{ArchiveMeta, RepoMetaEntry, Settings};
use crate::store;
use git2::Repository as GitRepo;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

/// リポジトリを workspace/_archive/ へ移動し、メタデータをスナップショット保存
#[tauri::command]
pub async fn archive_repo(app: AppHandle, id: String, path: String) -> Result<(), String> {
    let settings = store::load_settings(&app)?;
    let repo_path = PathBuf::from(&path);
    if !repo_path.exists() {
        return Err(format!("repository path not found: {}", path));
    }

    let (workspace_path, archive_dir_name) = find_workspace(&settings, &repo_path)?;

    // 最終コミット情報のスナップショット
    let snapshot = capture_last_commit(&repo_path);

    // 移動先 = workspace/<archive_dir>/<repo-name>
    let dest_root = workspace_path.join(&archive_dir_name);
    fs::create_dir_all(&dest_root).map_err(|e| e.to_string())?;

    let repo_name = repo_path
        .file_name()
        .map(|s| s.to_string_lossy().to_string())
        .ok_or_else(|| "invalid repo name".to_string())?;
    let dest = unique_dest(&dest_root, &repo_name);

    fs::rename(&repo_path, &dest).map_err(|e| format!("failed to move: {}", e))?;

    // メタ更新
    let mut repos_meta = store::load_repos_meta(&app)?;
    let now = store::iso_now();
    let archive_meta = ArchiveMeta {
        original_path: repo_path.to_string_lossy().to_string(),
        last_commit_sha: snapshot.0,
        last_commit_message: snapshot.1,
        last_commit_date: snapshot.2,
        archived_at: now.clone(),
    };

    let updated = {
        let entry = repos_meta
            .repos
            .entry(id.clone())
            .or_insert_with(RepoMetaEntry::default);
        entry.status = "archived".to_string();
        entry.archived_at = Some(now);
        entry.archive_meta = Some(archive_meta);
        entry.clone()
    };

    // パスが変わるためIDも変わる。新パスのIDにも同じエントリを複製しておく
    let new_id = store::repo_id_from_path(&dest.to_string_lossy());
    repos_meta.repos.insert(new_id, updated);

    store::save_repos_meta(&app, &repos_meta)
}

/// アーカイブ済みリポジトリを元のパス（または指定パス）へ復元
#[tauri::command]
pub async fn restore_repo(
    app: AppHandle,
    id: String,
    path: String,
    target_path: Option<String>,
) -> Result<(), String> {
    let mut repos_meta = store::load_repos_meta(&app)?;
    let entry = repos_meta
        .repos
        .get(&id)
        .cloned()
        .ok_or_else(|| format!("archive meta not found for id={}", id))?;
    let archive_meta = entry
        .archive_meta
        .clone()
        .ok_or_else(|| "this repo has no archive meta".to_string())?;

    let current_path = PathBuf::from(&path);
    if !current_path.exists() {
        return Err(format!(
            "archived repo not found at: {}",
            current_path.to_string_lossy()
        ));
    }

    let target = target_path
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(&archive_meta.original_path));

    if target.exists() {
        return Err(format!(
            "target path already exists: {}",
            target.to_string_lossy()
        ));
    }
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(&current_path, &target).map_err(|e| format!("failed to move: {}", e))?;

    // メタ更新: 新位置のエントリを active で書き戻し、旧位置のエントリは削除
    let active_entry = RepoMetaEntry {
        tags: entry.tags.clone(),
        note: entry.note.clone(),
        status: "active".to_string(),
        archived_at: None,
        archive_meta: None,
    };
    let new_id = store::repo_id_from_path(&target.to_string_lossy());
    repos_meta.repos.insert(new_id, active_entry);

    let archived_id = store::repo_id_from_path(&current_path.to_string_lossy());
    repos_meta.repos.remove(&archived_id);
    repos_meta.repos.remove(&id);

    store::save_repos_meta(&app, &repos_meta)
}

// ---- 内部ユーティリティ ----

fn find_workspace(
    settings: &Settings,
    repo_path: &Path,
) -> Result<(PathBuf, String), String> {
    settings
        .workspaces
        .iter()
        .find(|w| repo_path.starts_with(&w.path))
        .map(|w| (PathBuf::from(&w.path), w.archive_dir_name.clone()))
        .ok_or_else(|| {
            format!(
                "repo path is not under any registered workspace: {}",
                repo_path.to_string_lossy()
            )
        })
}

fn capture_last_commit(path: &Path) -> (String, String, String) {
    let empty = (String::new(), String::new(), String::new());
    let repo = match GitRepo::open(path) {
        Ok(r) => r,
        Err(_) => return empty,
    };
    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return empty,
    };
    let commit = match head.peel_to_commit() {
        Ok(c) => c,
        Err(_) => return empty,
    };
    let sha = commit.id().to_string();
    let message = commit.summary().unwrap_or("").to_string();
    let when = commit.time();
    let dt = chrono::DateTime::<chrono::Utc>::from_timestamp(when.seconds(), 0)
        .unwrap_or_else(chrono::Utc::now);
    let date = dt.format("%Y-%m-%dT%H:%M:%SZ").to_string();
    (sha, message, date)
}

fn unique_dest(root: &Path, name: &str) -> PathBuf {
    let mut dest = root.join(name);
    let mut i = 1;
    while dest.exists() {
        dest = root.join(format!("{}-{}", name, i));
        i += 1;
    }
    dest
}
