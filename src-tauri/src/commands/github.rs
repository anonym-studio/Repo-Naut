use crate::models::GitHubStats;
use crate::store;
use tauri::AppHandle;

const KEYCHAIN_SERVICE: &str = "repohub-github-pat";
const KEYCHAIN_USER: &str = "github-pat";

#[tauri::command]
pub async fn get_github_stats(
    _app: AppHandle,
    owner: String,
    repo: String,
) -> Result<GitHubStats, String> {
    let pat = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .get_password()
        .map_err(|_| "PAT not found in keychain".to_string())?;

    let client = reqwest::Client::new();
    let url = format!("https://api.github.com/repos/{}/{}", owner, repo);
    let resp: serde_json::Value = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", pat))
        .header("User-Agent", "RepoHub/0.1")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    Ok(GitHubStats {
        open_pr_count: resp["open_issues_count"].as_u64().unwrap_or(0) as u32,
        open_issue_count: 0, // GitHub APIはPR+Issueを合算するため別途取得が必要
        fetched_at: store::iso_now(),
    })
}

#[tauri::command]
pub async fn validate_pat(_app: AppHandle, pat: String) -> Result<bool, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", pat))
        .header("User-Agent", "RepoHub/0.1")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(resp.status().is_success())
}

#[tauri::command]
pub async fn save_pat(_app: AppHandle, pat: String) -> Result<(), String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .set_password(&pat)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_pat(_app: AppHandle) -> Result<(), String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .delete_credential()
        .map_err(|e| e.to_string())
}
