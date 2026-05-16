use std::path::Path;
use std::process::Command;

/// macOS の GUI アプリはターミナルより PATH が短い。Homebrew 等を先頭に足す。
pub fn ensure_gui_path() {
    #[cfg(target_os = "macos")]
    {
        const PREFIXES: &[&str] = &[
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
        ];
        let current = std::env::var("PATH").unwrap_or_default();
        let mut parts: Vec<String> = current
            .split(':')
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        for prefix in PREFIXES.iter().rev() {
            if !parts.iter().any(|p| p == *prefix) {
                parts.insert(0, (*prefix).to_string());
            }
        }
        std::env::set_var("PATH", parts.join(":"));
    }
}

#[cfg(unix)]
fn is_executable(path: &Path) -> bool {
    use std::os::unix::fs::PermissionsExt;
    path.metadata()
        .ok()
        .map(|m| m.permissions().mode() & 0o111 != 0)
        .unwrap_or(false)
}

#[cfg(not(unix))]
fn is_executable(path: &Path) -> bool {
    path.is_file()
}

/// コマンドが実行可能か（存在 + 実行権限、または `--version` が成功）
fn command_runnable(cmd: &str) -> bool {
    let path = Path::new(cmd);
    if cmd.contains('/') || cmd.contains('\\') {
        return path.is_file() && is_executable(path);
    }
    Command::new(cmd)
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
        || Command::new(cmd)
            .arg("-V")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
}

/// macOS: エディタ CLI の .app バンドル内パス（シェルコマンド未導入時）
#[cfg(target_os = "macos")]
fn editor_bundle_candidates(name: &str) -> Vec<String> {
    match name {
        "code" => vec![
            "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code".into(),
            "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code".into(),
        ],
        "cursor" => vec![
            "/Applications/Cursor.app/Contents/Resources/app/bin/cursor".into(),
        ],
        "windsurf" => vec![
            "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf".into(),
        ],
        "zed" => vec![
            "/Applications/Zed.app/Contents/MacOS/zed".into(),
            "/Applications/Zed.app/Contents/MacOS/cli".into(),
        ],
        _ => vec![],
    }
}

#[cfg(not(target_os = "macos"))]
fn editor_bundle_candidates(_name: &str) -> Vec<String> {
    vec![]
}

/// 外部コマンドの実行パスを解決する（エディタ CLI・カスタムスクリプト等）。
pub fn resolve_executable(name: &str) -> String {
    let name = name.trim();
    if name.is_empty() {
        return String::new();
    }
    if name.contains('/') || name.contains('\\') {
        return name.to_string();
    }

    let mut candidates = vec![
        name.to_string(),
        format!("/opt/homebrew/bin/{name}"),
        format!("/usr/local/bin/{name}"),
    ];
    candidates.extend(editor_bundle_candidates(name));

    for cmd in candidates {
        if command_runnable(&cmd) {
            return cmd;
        }
    }

    name.to_string()
}

/// `gh --version` が成功するか
fn gh_version_ok(cmd: &str) -> bool {
    Command::new(cmd)
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// gh CLI の実行パスを解決する。
pub fn resolve_gh_command(configured: Option<&str>) -> String {
    if let Some(p) = configured.map(str::trim).filter(|s| !s.is_empty()) {
        return p.to_string();
    }

    let resolved = resolve_executable("gh");
    if gh_version_ok(&resolved) {
        return resolved;
    }

    let extra: &[&str] = if cfg!(target_os = "macos") {
        &["gh", "/opt/homebrew/bin/gh", "/usr/local/bin/gh"]
    } else if cfg!(target_os = "windows") {
        &["gh"]
    } else {
        &["gh", "/usr/bin/gh", "/usr/local/bin/gh"]
    };

    extra
        .iter()
        .find(|cmd| gh_version_ok(cmd))
        .map(|s| (*s).to_string())
        .unwrap_or_else(|| "gh".to_string())
}
