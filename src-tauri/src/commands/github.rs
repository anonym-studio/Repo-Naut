use crate::models::GitHubStats;
use crate::store;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

const KEYCHAIN_SERVICE: &str = "repohub-github-pat";
const KEYCHAIN_USER: &str = "github-pat";
const USER_AGENT: &str = "Repo-Naut/0.1";
const GITHUB_API: &str = "https://api.github.com";

/// PAT 検証結果。UI でユーザー名と scope を表示する。
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatValidation {
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login: Option<String>,
    /// `x-oauth-scopes` ヘッダの値（カンマ区切り）。fine-grained PAT の場合は空文字列になる。
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scopes: Option<String>,
    /// 失敗時の説明（401/403/network etc.）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

/// 現在 PAT が keychain に保存されているか確認する（値は返さない）。
#[tauri::command]
pub async fn has_pat(_app: AppHandle) -> Result<bool, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

/// 与えられた PAT が `GET /user` を通せるか確認する。保存はしない。
#[tauri::command]
pub async fn validate_pat(_app: AppHandle, pat: String) -> Result<PatValidation, String> {
    validate_with_token(&pat).await
}

/// 既に keychain に保存されている PAT を取り出して接続テストする。
#[tauri::command]
pub async fn validate_stored_pat(_app: AppHandle) -> Result<PatValidation, String> {
    let pat = load_pat()?;
    validate_with_token(&pat).await
}

async fn validate_with_token(pat: &str) -> Result<PatValidation, String> {
    let client = http_client()?;
    let resp = client
        .get(format!("{}/user", GITHUB_API))
        .header("Authorization", format!("Bearer {}", pat))
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("network error: {}", e))?;

    let status = resp.status();
    let scopes = resp
        .headers()
        .get("x-oauth-scopes")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if status.is_success() {
        let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let login = body
            .get("login")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        Ok(PatValidation {
            valid: true,
            login,
            scopes,
            message: None,
        })
    } else {
        let message = match status.as_u16() {
            401 => "PAT が無効です（401 Unauthorized）",
            403 => "アクセスが拒否されました（403 Forbidden）。Rate limit か scope を確認してください。",
            _ => "GitHub API への接続に失敗しました",
        };
        Ok(PatValidation {
            valid: false,
            login: None,
            scopes,
            message: Some(message.to_string()),
        })
    }
}

#[tauri::command]
pub async fn save_pat(_app: AppHandle, pat: String) -> Result<(), String> {
    if pat.trim().is_empty() {
        return Err("PAT が空です".to_string());
    }
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER)
        .map_err(|e| e.to_string())?
        .set_password(&pat)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_pat(_app: AppHandle) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // 既に存在しなければ成功扱い
        Err(e) => Err(e.to_string()),
    }
}

/// オーナー / repo 名から PR 数と Issue 数を別々に取得する。
///
/// GitHub の REST API では PR は Issue として扱われるため、
/// `/repos/{owner}/{repo}/pulls?state=open&per_page=1` と
/// `/repos/{owner}/{repo}/issues?state=open&per_page=1` をそれぞれ叩き、
/// レスポンスヘッダの `Link` を解析して `rel="last"` の page 番号を総数とする。
#[tauri::command]
pub async fn get_github_stats(
    _app: AppHandle,
    owner: String,
    repo: String,
) -> Result<GitHubStats, String> {
    let pat = load_pat()?;
    let client = http_client()?;

    let pr_count = count_open(&client, &pat, &owner, &repo, "pulls").await?;
    let issue_count_total = count_open(&client, &pat, &owner, &repo, "issues").await?;
    // /issues は PR を含むので、Issue 単独の件数は (total - PR) で算出
    let issue_count = issue_count_total.saturating_sub(pr_count);

    Ok(GitHubStats {
        open_pr_count: pr_count,
        open_issue_count: issue_count,
        fetched_at: store::iso_now(),
    })
}

async fn count_open(
    client: &reqwest::Client,
    pat: &str,
    owner: &str,
    repo: &str,
    endpoint: &str,
) -> Result<u32, String> {
    let url = format!(
        "{}/repos/{}/{}/{}?state=open&per_page=1",
        GITHUB_API, owner, repo, endpoint
    );
    let resp = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", pat))
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|e| format!("network error: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        return Err(match status.as_u16() {
            401 => "PAT が無効です（401）".to_string(),
            403 => "Rate limit または権限不足（403）".to_string(),
            404 => format!("{}/{} のリポジトリが見つかりません", owner, repo),
            other => format!("GitHub API エラー: HTTP {}", other),
        });
    }

    // Link ヘッダから rel="last" の page 番号を抽出。1 ページに収まる場合は body の配列長で判定。
    let link = resp
        .headers()
        .get("link")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    if let Some(link) = link {
        if let Some(last) = parse_link_last_page(&link) {
            return Ok(last);
        }
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(body.as_array().map(|a| a.len() as u32).unwrap_or(0))
}

fn parse_link_last_page(link: &str) -> Option<u32> {
    // 例: <https://api.github.com/...&page=2>; rel="next", <https://...&page=42>; rel="last"
    for part in link.split(',') {
        let part = part.trim();
        if !part.contains("rel=\"last\"") {
            continue;
        }
        let start = part.find('<')? + 1;
        let end = part.find('>')?;
        let url = &part[start..end];
        // page= の値を取り出す
        if let Some(idx) = url.find("page=") {
            let rest = &url[idx + 5..];
            let n: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
            if let Ok(n) = n.parse::<u32>() {
                return Some(n);
            }
        }
    }
    None
}

fn load_pat() -> Result<String, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_USER).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(p) => Ok(p),
        Err(keyring::Error::NoEntry) => {
            Err("PAT が保存されていません。Settings から登録してください。".to_string())
        }
        Err(e) => Err(e.to_string()),
    }
}

fn http_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())
}
