use crate::models::{KanbanStore, ReposMeta, Settings};
use crate::store;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;

/// バックアップファイルのスキーマバージョン。互換性のない変更時にインクリメントする。
const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupBundle {
    /// 互換性チェック用バージョン
    pub schema_version: u32,
    /// バックアップ作成時刻 (ISO 8601 / UTC)
    pub exported_at: String,
    /// バックアップを作成したアプリのバージョン（package.json + Cargo.toml の値）
    pub app_version: String,
    pub settings: Settings,
    pub repos_meta: ReposMeta,
    pub kanban: KanbanStore,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    /// 書き出したファイルサイズ (bytes)
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub schema_version: u32,
    pub exported_at: String,
    pub app_version: String,
    pub settings_workspaces: usize,
    pub repos_meta_count: usize,
    pub tasks_count: usize,
}

/// 全データ（settings / repos-meta / kanban）を 1 つの JSON ファイルにまとめて保存する。
///
/// 出力先パスはフロント側で `dialog.save()` を経由してユーザーが選択する想定。
/// 既存ファイルがある場合は OS のダイアログで上書き確認されているため、ここでは無条件に上書きする。
#[tauri::command]
pub async fn export_data(app: AppHandle, path: String) -> Result<ExportResult, String> {
    let settings = store::load_settings(&app)?;
    let repos_meta = store::load_repos_meta(&app)?;
    let kanban = store::load_kanban(&app)?;

    let bundle = BackupBundle {
        schema_version: SCHEMA_VERSION,
        exported_at: store::iso_now(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        settings,
        repos_meta,
        kanban,
    };

    let data = serde_json::to_string_pretty(&bundle).map_err(|e| e.to_string())?;
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    std::fs::write(&target, &data).map_err(|e| e.to_string())?;

    let size = std::fs::metadata(&target).map(|m| m.len()).unwrap_or(0);
    Ok(ExportResult { path, size })
}

/// バックアップファイルを読み込み、検証のみを行ってサマリを返す（プレビュー用）。
/// この時点ではディスクへの書き込みは発生しない。
#[tauri::command]
pub async fn preview_backup(path: String) -> Result<ImportSummary, String> {
    let bundle = read_and_validate_bundle(&path)?;
    Ok(make_summary(&bundle))
}

/// バックアップファイルを読み込み、現在のデータを **完全に置き換える**。
///
/// 安全策として:
///  1. バックアップを検証してから書き込む
///  2. 書き込みは settings → repos-meta → kanban の順
///  3. いずれかが失敗しても、後続の書き込みは試みない（部分的な更新で止まる可能性あり）
#[tauri::command]
pub async fn import_data(app: AppHandle, path: String) -> Result<ImportSummary, String> {
    let bundle = read_and_validate_bundle(&path)?;
    let summary = make_summary(&bundle);

    store::save_settings(&app, &bundle.settings)?;
    store::save_repos_meta(&app, &bundle.repos_meta)?;
    store::save_kanban(&app, &bundle.kanban)?;

    Ok(summary)
}

fn read_and_validate_bundle(path: &str) -> Result<BackupBundle, String> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| format!("ファイルを読み込めません: {}", e))?;
    let bundle: BackupBundle = serde_json::from_str(&raw)
        .map_err(|e| format!("バックアップ形式が不正です: {}", e))?;
    if bundle.schema_version > SCHEMA_VERSION {
        return Err(format!(
            "サポートされていないスキーマバージョンです (file: {}, app: {})。アプリを更新してください。",
            bundle.schema_version, SCHEMA_VERSION
        ));
    }
    Ok(bundle)
}

fn make_summary(bundle: &BackupBundle) -> ImportSummary {
    ImportSummary {
        schema_version: bundle.schema_version,
        exported_at: bundle.exported_at.clone(),
        app_version: bundle.app_version.clone(),
        settings_workspaces: bundle.settings.workspaces.len(),
        repos_meta_count: bundle.repos_meta.repos.len(),
        tasks_count: bundle.kanban.tasks.len(),
    }
}
