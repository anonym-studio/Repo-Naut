use crate::command_path;
use crate::models::{EditorConfig, Settings, TerminalPreset};
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

    let program = command_path::resolve_executable(&editor.command);
    std::process::Command::new(&program)
        .args(&editor.args)
        .arg(&path)
        .spawn()
        .map_err(|e| format!("failed to launch {}: {}", program, e))?;
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

/// ターミナルでディレクトリを開く。
///
/// 優先順:
///  1. `preset` が `Custom` で `command` が設定されていればそれを実行
///  2. それ以外のプリセットはプリセットに従う（古い `command` 値は無視）
///  3. `Auto` の場合は OS ごとに最適な端末を起動
#[tauri::command]
pub async fn open_in_terminal(app: AppHandle, path: String) -> Result<(), String> {
    let settings = store::load_settings(&app)?;

    match settings.terminal.preset {
        TerminalPreset::Iterm2 => open_macos_app("iTerm", &path),
        TerminalPreset::TerminalApp => open_macos_app("Terminal", &path),
        TerminalPreset::Ghostty => open_ghostty(&path),
        TerminalPreset::WindowsTerminal => run_custom_command("wt", &path),
        TerminalPreset::Cmd => run_custom_command("cmd", &path),
        TerminalPreset::Custom => {
            let cmd = settings
                .terminal
                .command
                .as_deref()
                .map(|s| s.trim())
                .filter(|s| !s.is_empty())
                .ok_or("カスタムコマンドが空です。Settings で指定してください。")?;
            run_custom_command(cmd, &path)
        }
        TerminalPreset::Auto => auto_open_terminal(&path),
    }
}

/// Ghostty を指定ディレクトリで開く。
///
/// `open -na Ghostty --args --working-directory=<path>` を使う。
/// `-n` を付けることで既に起動済みでも新規ウィンドウを開き、`--working-directory` で
/// ワーキングディレクトリを確実に指定できる（Ghostty 公式の推奨方法）。
#[cfg(target_os = "macos")]
fn open_ghostty(path: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .args([
            "-na",
            "Ghostty",
            "--args",
            &format!("--working-directory={}", path),
        ])
        .spawn()
        .map_err(|e| format!("failed to open Ghostty: {}", e))?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn open_ghostty(path: &str) -> Result<(), String> {
    // 非 macOS では Ghostty はバイナリ名 `ghostty` で起動できる
    run_custom_command("ghostty", path)
}

#[cfg(target_os = "macos")]
fn auto_open_terminal(path: &str) -> Result<(), String> {
    // iTerm が入っていればそちらを優先
    if open_macos_app("iTerm", path).is_ok() {
        return Ok(());
    }
    open_macos_app("Terminal", path)
}

#[cfg(target_os = "windows")]
fn auto_open_terminal(path: &str) -> Result<(), String> {
    // Windows Terminal が入っていればそれを優先、無ければ cmd
    if spawn_with_cwd("wt", path).is_ok() {
        return Ok(());
    }
    spawn_with_cwd("cmd", path)
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn auto_open_terminal(path: &str) -> Result<(), String> {
    open::that(path).map_err(|e| e.to_string())
}

#[cfg(target_os = "macos")]
fn open_macos_app(app_name: &str, path: &str) -> Result<(), String> {
    std::process::Command::new("open")
        .args(["-a", app_name, path])
        .spawn()
        .map_err(|e| format!("failed to open {}: {}", app_name, e))?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn open_macos_app(_app_name: &str, path: &str) -> Result<(), String> {
    open::that(path).map_err(|e| e.to_string())
}

/// ユーザー指定のコマンド文字列（`open -a Ghostty` のように引数を含むことがある）を
/// プログラム名と引数に分割して起動する。
///
/// `{path}` プレースホルダが含まれていれば対象パスに置換、無ければ `current_dir(path)` で
/// cwd を渡す（cwd を尊重するターミナルなら自動でそのディレクトリに移動する）。
fn run_custom_command(command: &str, path: &str) -> Result<(), String> {
    let mut parts = command.split_whitespace();
    let program = parts
        .next()
        .ok_or_else(|| "empty terminal command".to_string())?;
    let args: Vec<String> = parts
        .map(|a| a.replace("{path}", path))
        .collect();
    let has_placeholder = command.contains("{path}");

    let program = command_path::resolve_executable(program);
    let mut cmd = std::process::Command::new(&program);
    cmd.args(&args);
    if !has_placeholder {
        cmd.current_dir(path);
    }
    cmd.spawn()
        .map_err(|e| format!("failed to launch {}: {}", command, e))?;
    Ok(())
}

#[tauri::command]
pub async fn open_url(_app: AppHandle, url: String) -> Result<(), String> {
    open::that(url).map_err(|e| e.to_string())
}
