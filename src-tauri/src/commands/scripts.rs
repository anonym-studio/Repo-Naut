use crate::command_path;
use crate::models::{GitCommandResult, ScriptConfig};
use crate::store;
use serde::Deserialize;
use tauri::AppHandle;
use uuid::Uuid;

/// `add_script` のフロント側ペイロード（`id` を含まない）。
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewScriptPayload {
    pub name: String,
    pub command: String,
    #[serde(default)]
    pub description: Option<String>,
}

/// 登録済みスクリプト一覧を返す。
#[tauri::command]
pub async fn list_scripts(app: AppHandle) -> Result<Vec<ScriptConfig>, String> {
    Ok(store::load_settings(&app)?.scripts)
}

#[tauri::command]
pub async fn add_script(app: AppHandle, script: NewScriptPayload) -> Result<ScriptConfig, String> {
    if script.name.trim().is_empty() {
        return Err("スクリプト名が空です".to_string());
    }
    if script.command.trim().is_empty() {
        return Err("コマンドが空です".to_string());
    }

    let mut settings = store::load_settings(&app)?;
    let new = ScriptConfig {
        id: Uuid::new_v4().to_string(),
        name: script.name.trim().to_string(),
        command: script.command.trim().to_string(),
        description: script
            .description
            .as_deref()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
    };
    settings.scripts.push(new.clone());
    store::save_settings(&app, &settings)?;
    Ok(new)
}

#[tauri::command]
pub async fn remove_script(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    let before = settings.scripts.len();
    settings.scripts.retain(|s| s.id != id);
    if settings.scripts.len() == before {
        return Err(format!("script not found: {}", id));
    }
    store::save_settings(&app, &settings)
}

/// スクリプトを更新する。
///
/// - 各フィールドはキーが省略されていれば「変更なし」扱い
/// - `description: ""`（空文字）が送られた場合は説明をクリア
#[tauri::command]
pub async fn update_script(
    app: AppHandle,
    id: String,
    name: Option<String>,
    command: Option<String>,
    description: Option<String>,
) -> Result<ScriptConfig, String> {
    let mut settings = store::load_settings(&app)?;
    let target = settings
        .scripts
        .iter_mut()
        .find(|s| s.id == id)
        .ok_or_else(|| format!("script not found: {}", id))?;

    if let Some(name) = name {
        let trimmed = name.trim().to_string();
        if trimmed.is_empty() {
            return Err("スクリプト名が空です".to_string());
        }
        target.name = trimmed;
    }
    if let Some(command) = command {
        let trimmed = command.trim().to_string();
        if trimmed.is_empty() {
            return Err("コマンドが空です".to_string());
        }
        target.command = trimmed;
    }
    if let Some(description) = description {
        // 空文字なら説明をクリア、非空なら更新
        let trimmed = description.trim().to_string();
        target.description = if trimmed.is_empty() { None } else { Some(trimmed) };
    }
    let updated = target.clone();
    store::save_settings(&app, &settings)?;
    Ok(updated)
}

/// 登録済みスクリプトをリポジトリのパスで実行し、stdout/stderr/exit code を返す。
///
/// `command` は空白で分割し、program + args として渡す。
/// `{path}` プレースホルダがあれば repo の絶対パスに置換、無ければ cwd として渡す。
#[tauri::command]
pub async fn run_script(
    app: AppHandle,
    script_id: String,
    repo_path: String,
) -> Result<GitCommandResult, String> {
    let settings = store::load_settings(&app)?;
    let script = settings
        .scripts
        .iter()
        .find(|s| s.id == script_id)
        .ok_or_else(|| format!("script not found: {}", script_id))?;

    let mut parts = script.command.split_whitespace();
    let program = parts
        .next()
        .ok_or_else(|| "empty command".to_string())?
        .to_string();
    let args: Vec<String> = parts
        .map(|a| a.replace("{path}", &repo_path))
        .collect();
    let has_placeholder = script.command.contains("{path}");

    let program = command_path::resolve_executable(&program);
    let mut cmd = std::process::Command::new(&program);
    cmd.args(&args);
    if !has_placeholder {
        cmd.current_dir(&repo_path);
    }

    let output = cmd
        .output()
        .map_err(|e| format!("failed to execute {}: {}", program, e))?;

    Ok(GitCommandResult {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}
