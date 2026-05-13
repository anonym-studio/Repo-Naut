//! Workspaceディレクトリのファイル監視。
//!
//! `notify` クレートを使い、現在の active workspace 配下に発生した
//! 「リポジトリ構成に影響する変更」（ディレクトリ作成・削除、`.git` の変更）を
//! debounce してから `workspace_changed` Tauri イベントとして発火する。
//!
//! フロントエンドはこのイベントを購読し、`scan_workspace` を再実行する。

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceChangedPayload {
    pub workspace_id: String,
    pub workspace_path: String,
    pub reason: String,
}

/// アプリ全体で1つだけ保持する watcher。`Mutex` で差し替え可能にしておく。
pub struct WatcherState {
    inner: Mutex<Option<RecommendedWatcher>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(None),
        }
    }
}

/// アクティブな workspace の監視を開始する。既存の監視があれば差し替える。
pub fn start_watching(
    app: &AppHandle,
    workspace_id: String,
    workspace_path: String,
) -> Result<(), String> {
    let state = app.state::<Arc<WatcherState>>();
    let mut guard = state.inner.lock().map_err(|e| e.to_string())?;
    *guard = None; // 既存 watcher を drop する（先に解放しないと FS イベントが重複する）

    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let mut watcher = RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
    let root = PathBuf::from(&workspace_path);
    if !root.exists() {
        return Err(format!("workspace path does not exist: {workspace_path}"));
    }
    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;
    *guard = Some(watcher);
    drop(guard);

    // 受信スレッドで debounce しつつイベント発火
    let app_clone = app.clone();
    thread::spawn(move || {
        let mut last_emit = Instant::now() - Duration::from_secs(10);
        let mut pending: Option<(String, Instant)> = None;
        let debounce = Duration::from_millis(800);

        loop {
            // recv_timeout で debounce の flush も実現
            let res = rx.recv_timeout(Duration::from_millis(300));
            match res {
                Ok(Ok(event)) => {
                    if !is_repo_relevant(&event) {
                        continue;
                    }
                    let reason = describe_reason(&event);
                    pending = Some((reason, Instant::now()));
                }
                Ok(Err(_)) | Err(mpsc::RecvTimeoutError::Timeout) => {
                    // pending を debounce 経過後に発火
                    if let Some((reason, occurred)) = pending.as_ref() {
                        if occurred.elapsed() >= debounce && last_emit.elapsed() >= debounce {
                            let payload = WorkspaceChangedPayload {
                                workspace_id: workspace_id.clone(),
                                workspace_path: workspace_path.clone(),
                                reason: reason.clone(),
                            };
                            let _ = app_clone.emit("workspace_changed", &payload);
                            last_emit = Instant::now();
                            pending = None;
                        }
                    }
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => break, // watcher dropped
            }
        }
    });

    Ok(())
}

/// 監視を停止する（settings から workspace が消えた場合などに呼ぶ）
pub fn stop_watching(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<WatcherState>>();
    let mut guard = state.inner.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}

fn is_repo_relevant(event: &Event) -> bool {
    if !matches!(
        event.kind,
        EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_)
    ) {
        return false;
    }
    event.paths.iter().any(|p| is_path_relevant(p))
}

fn is_path_relevant(path: &Path) -> bool {
    let str_path = path.to_string_lossy();

    // ノイズの多いキャッシュ系は無視
    if str_path.contains("/node_modules/")
        || str_path.contains("/target/")
        || str_path.contains("/.next/")
        || str_path.contains("/dist/")
        || str_path.contains("/build/")
        || str_path.contains("/.cache/")
    {
        return false;
    }

    // .git/HEAD などのコミット・ブランチ変化を検知したい
    if str_path.contains("/.git/HEAD") || str_path.contains("/.git/refs/heads/") {
        return true;
    }

    // .git 内のその他のファイル変化は対象外（オブジェクト書き込みなど大量発生する）
    if str_path.contains("/.git/") {
        return false;
    }

    // それ以外でディレクトリ階層が浅い変化 = リポジトリ追加・削除の可能性
    true
}

fn describe_reason(event: &Event) -> String {
    let first = event
        .paths
        .first()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    format!("{:?}: {}", event.kind, first)
}
