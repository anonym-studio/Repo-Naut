use crate::models::{KanbanStore, ReposMeta, Settings};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| e.to_string())
}

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("settings.json"))
}

fn repos_meta_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("repos-meta.json"))
}

fn kanban_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(config_dir(app)?.join("kanban.json"))
}

/// 一時ファイルへ書き込み後にリネームする atomic write
fn write_atomic(path: &Path, data: &str) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}

fn read_json<T: serde::de::DeserializeOwned + Default>(path: &Path) -> T {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

// ---- Settings ----

pub fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        // 初回起動時はデフォルト設定を保存して返す
        let defaults = Settings::default();
        save_settings(app, &defaults)?;
        return Ok(defaults);
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    write_atomic(&path, &data)
}

// ---- ReposMeta ----

pub fn load_repos_meta(app: &AppHandle) -> Result<ReposMeta, String> {
    let path = repos_meta_path(app)?;
    Ok(read_json(&path))
}

pub fn save_repos_meta(app: &AppHandle, meta: &ReposMeta) -> Result<(), String> {
    let path = repos_meta_path(app)?;
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    write_atomic(&path, &data)
}

// ---- KanbanStore ----

pub fn load_kanban(app: &AppHandle) -> Result<KanbanStore, String> {
    let path = kanban_path(app)?;
    Ok(read_json(&path))
}

pub fn save_kanban(app: &AppHandle, store: &KanbanStore) -> Result<(), String> {
    let path = kanban_path(app)?;
    fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
    let data = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    write_atomic(&path, &data)
}

/// リポジトリIDの生成（パスのSHA256先頭16文字）
pub fn repo_id_from_path(path: &str) -> String {
    use sha2::{Digest, Sha256};
    let hash = Sha256::digest(path.as_bytes());
    hex::encode(&hash[..8])
}

/// 現在時刻を ISO 8601 (UTC, 秒精度) 文字列で返す
pub fn iso_now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}
