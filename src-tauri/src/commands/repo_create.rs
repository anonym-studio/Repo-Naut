use crate::models::{CreateRepoResult, GhAuthStatus};
use crate::store;
use std::process::Command;
use tauri::{AppHandle, Emitter};

/// gh auth status を実行して認証状態を確認
#[tauri::command]
pub async fn check_gh_auth(app: AppHandle) -> Result<GhAuthStatus, String> {
    let settings = store::load_settings(&app)?;
    let gh_cmd = settings.gh.path.as_deref().unwrap_or("gh");

    // ghバイナリの存在確認
    let installed = Command::new(gh_cmd).arg("--version").output().is_ok();
    if !installed {
        return Ok(GhAuthStatus {
            installed: false,
            authenticated: false,
            username: None,
        });
    }

    let output = Command::new(gh_cmd)
        .args(["auth", "status", "--hostname", "github.com"])
        .output()
        .map_err(|e| e.to_string())?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let authenticated = output.status.success();

    // "Logged in to github.com account {username}" を簡易パース
    let username = if authenticated {
        stderr
            .lines()
            .find(|l| l.contains("Logged in to github.com account"))
            .and_then(|l| l.split("account ").nth(1))
            .map(|s| s.split_whitespace().next().unwrap_or("").to_string())
    } else {
        None
    };

    Ok(GhAuthStatus {
        installed: true,
        authenticated,
        username,
    })
}

/// gh repo create を実行してGitHubリポジトリを作成しワークスペースへクローン
#[tauri::command]
pub async fn create_repo(
    app: AppHandle,
    name: String,
    description: Option<String>,
    visibility: String,
    workspace_id: String,
    with_readme: bool,
) -> Result<CreateRepoResult, String> {
    let settings = store::load_settings(&app)?;
    let gh_cmd = settings.gh.path.as_deref().unwrap_or("gh");

    let workspace = settings
        .workspaces
        .iter()
        .find(|w| w.id == workspace_id)
        .ok_or("workspace not found")?;

    let vis_flag = format!("--{}", visibility);
    let mut args = vec!["repo", "create", &name, &vis_flag, "--clone"];
    let desc_arg;
    if let Some(ref desc) = description {
        desc_arg = format!("--description={}", desc);
        args.push(&desc_arg);
    }
    if with_readme {
        args.push("--add-readme");
    }

    // 進捗をストリーミング送信するためspawn（簡易版: 完了後に一括送信）
    let output = Command::new(gh_cmd)
        .current_dir(&workspace.path)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    // 進捗イベントを送信
    let _ = app.emit("create_repo_progress", &stdout);

    if output.status.success() {
        let local_path = format!("{}/{}", workspace.path, name);
        let repo_url = stdout
            .lines()
            .find(|l| l.starts_with("https://"))
            .map(|s| s.trim().to_string());

        Ok(CreateRepoResult {
            success: true,
            repo_url,
            local_path: Some(local_path),
            error: None,
        })
    } else {
        Ok(CreateRepoResult {
            success: false,
            repo_url: None,
            local_path: None,
            error: Some(stderr),
        })
    }
}
