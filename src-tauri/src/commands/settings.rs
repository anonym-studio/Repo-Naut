use crate::models::{EditorConfig, Settings};
use crate::store;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Settings, String> {
    store::load_settings(&app)
}

#[tauri::command]
pub async fn update_settings(app: AppHandle, patch: serde_json::Value) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    let mut base = serde_json::to_value(&settings).map_err(|e| e.to_string())?;
    if let (serde_json::Value::Object(ref mut b), serde_json::Value::Object(p)) =
        (&mut base, patch)
    {
        for (k, v) in p {
            b.insert(k, v);
        }
    }
    settings = serde_json::from_value(base).map_err(|e| e.to_string())?;
    store::save_settings(&app, &settings)
}

/// 登録済みエディタでリポジトリを開く
#[tauri::command]
pub async fn open_in_editor(
    app: AppHandle,
    path: String,
    editor_id: Option<String>,
) -> Result<(), String> {
    let settings = store::load_settings(&app)?;
    let id = editor_id.as_deref().unwrap_or(&settings.default_editor_id);
    let editor = settings
        .editors
        .iter()
        .find(|e| e.id == id)
        .ok_or("editor not found")?;

    std::process::Command::new(&editor.command)
        .args(&editor.args)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("failed to launch {}: {}", editor.command, e))?;
    Ok(())
}

#[tauri::command]
pub async fn add_editor(
    app: AppHandle,
    config: serde_json::Value,
) -> Result<EditorConfig, String> {
    let mut settings = store::load_settings(&app)?;
    // フロントは `id` を含めずに送ってくる。ここで採番してから deserialize する。
    let mut payload = match config {
        serde_json::Value::Object(map) => map,
        other => return Err(format!("invalid editor payload: {}", other)),
    };
    payload.insert(
        "id".to_string(),
        serde_json::Value::String(Uuid::new_v4().to_string()),
    );
    let editor: EditorConfig = serde_json::from_value(serde_json::Value::Object(payload))
        .map_err(|e| format!("invalid editor config: {}", e))?;
    // 同じ command が既に登録されていれば追加せず既存を返す（プリセット2度押し対策）
    if let Some(existing) = settings.editors.iter().find(|e| e.command == editor.command) {
        return Ok(existing.clone());
    }
    settings.editors.push(editor.clone());
    // デフォルトエディタが未設定なら最初に追加したものをデフォルトにする
    if settings.default_editor_id.is_empty() {
        settings.default_editor_id = editor.id.clone();
    }
    store::save_settings(&app, &settings)?;
    Ok(editor)
}

#[tauri::command]
pub async fn remove_editor(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    settings.editors.retain(|e| e.id != id);
    if settings.default_editor_id == id {
        settings.default_editor_id = settings
            .editors
            .first()
            .map(|e| e.id.clone())
            .unwrap_or_default();
    }
    store::save_settings(&app, &settings)
}

#[tauri::command]
pub async fn set_default_editor(app: AppHandle, id: String) -> Result<(), String> {
    let mut settings = store::load_settings(&app)?;
    settings.default_editor_id = id;
    store::save_settings(&app, &settings)
}

/// システムデフォルトのターミナルでディレクトリを開く
#[tauri::command]
pub async fn open_in_terminal(app: AppHandle, path: String) -> Result<(), String> {
    let settings = store::load_settings(&app)?;
    if let Some(cmd) = &settings.terminal.command {
        std::process::Command::new(cmd)
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    } else {
        // OSデフォルト（macOS: open -a Terminal, Windows: wt.exe）
        open::that(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn open_url(_app: AppHandle, url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}
