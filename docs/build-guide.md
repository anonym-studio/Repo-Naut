# ビルドガイド — OS別の本番ビルド手順

Repo-Naut は Tauri v2 を使用しているため、**ビルドは対象 OS 上でネイティブに実行する必要がある**。  
macOS 向けバイナリは macOS 上で、Windows 向けバイナリは Windows 上でビルドする（クロスコンパイル不可）。

---

## 現在のリリース方針

| 項目 | 方針 |
|---|---|
| 対象 OS | **macOS のみ**（Windows リリースは今後対応予定） |
| コード署名 | **未署名**（Apple Developer Program 未加入のため） |
| 配布形式 | `.dmg`（GitHub Releases へのアップロード） |
| リポジトリ | https://github.com/anonym-studio/Repo-Naut |
| CI リリース | `.github/workflows/release.yml`（`v*` タグ push で自動ビルド） |

> **未署名リリースについて**: Apple Developer Program（$99/年）未加入のため、配布する `.dmg` / `.app` はコード署名・公証なしの未署名となる。ダウンロードしたユーザーは初回起動時に Gatekeeper の警告が表示されるため、[後述の手順](#未署名アプリの初回起動方法ユーザー向け)で開く必要がある。

---

## 共通の前提

どの OS でも以下が必要。

| ツール | バージョン | 確認コマンド |
|---|---|---|
| Rust (stable) | 1.77 以上 | `rustc --version` |
| Node.js | 18 以上 | `node --version` |
| pnpm | 8 以上 | `pnpm --version` |

```bash
# Rust のインストール（未インストールの場合）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

---

## macOS

### 必要なツール

| ツール | 取得方法 |
|---|---|
| Xcode Command Line Tools | `xcode-select --install` |
| Rust | `rustup` 経由（上記） |

```bash
xcode-select --install
```

> Apple Silicon (M1/M2/M3) と Intel の両方でネイティブにビルド可能。

### ビルド手順

```bash
# 依存関係のインストール
pnpm install

# ビルド（実行している Mac のアーキテクチャ向け）
pnpm tauri build
```

出力先: `src-tauri/target/release/bundle/`

```
bundle/
├── dmg/
│   └── Repo-Naut_0.1.0_aarch64.dmg   # Apple Silicon
│   └── Repo-Naut_0.1.0_x64.dmg        # Intel
└── macos/
    └── Repo-Naut.app
```

### ユニバーサルバイナリ（Intel + Apple Silicon 両対応・推奨）

単一の `.dmg` で両アーキテクチャをカバーできるため、**配布時はユニバーサルバイナリを推奨**する。  
ファイルサイズは約2倍になる。

```bash
# ユニバーサルターゲットの追加（初回のみ）
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# ユニバーサルバイナリのビルド
pnpm tauri build --target universal-apple-darwin
```

出力先: `src-tauri/target/universal-apple-darwin/release/bundle/`

> **クロスコンパイル（Apple Silicon → Intel）**: `git2` は `vendored-openssl`、`reqwest` は `rustls-tls` を使用しており、システム OpenSSL なしで `universal-apple-darwin` をビルドできる。

### GitHub Releases（CI）

GitHub Actions（`Release` ワークフロー）が macOS ランナー上でユニバーサル `.dmg` をビルドし、[Releases](https://github.com/anonym-studio/Repo-Naut/releases) にアップロードする。

**初回のみ**: リポジトリの **Settings → Actions → General → Workflow permissions** で **Read and write permissions** を有効にする（`GITHUB_TOKEN` で Release 作成に必要）。

#### タグ push でリリース（推奨）

1. `package.json` と `src-tauri/tauri.conf.json` の `version` を揃える（例: `0.1.0`）
2. 変更をコミットし、タグを作成して push する

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. Actions タブで `Release` ワークフローの完了を確認する
4. Releases ページに `Repo-Naut_0.1.0_universal.dmg` が添付される

タグ名は **`v` + セマンティックバージョン**（`v0.1.0`）とし、`tauri.conf.json` の `version` と一致させる。

#### 手動実行

GitHub の **Actions → Release → Run workflow** から実行できる。入力の `tag` は上記と同じ形式（例: `v0.1.0`）。

### コード署名について（現状）

現在は **Apple Developer Program 未加入のため、コード署名・公証（Notarization）は行わない**。  
将来 Developer ID を取得した場合の署名コマンドは以下を参照:

```bash
# 環境変数でサイナーを指定してビルド
APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)" \
pnpm tauri build

# 公証 (Notarization)
xcrun notarytool submit \
  "src-tauri/target/universal-apple-darwin/release/bundle/dmg/Repo-Naut_0.1.0_universal.dmg" \
  --apple-id "your@email.com" \
  --password "app-specific-password" \
  --team-id "TEAMID" \
  --wait
```

詳細: [Tauri 公式 — Code Signing (macOS)](https://tauri.app/distribute/sign/macos/)

---

## 未署名アプリの初回起動方法（ユーザー向け）

未署名の `.dmg` / `.app` をダウンロードしたユーザーは、macOS の Gatekeeper によって初回起動時に警告が表示される。以下のいずれかの方法で開くことができる。

> **この手順が必要な理由**: Apple は野良配布のアプリに対してコード署名と公証を要求している。Repo-Naut は現在 Apple Developer Program 未加入のため、ユーザー側で一度だけ手動許可が必要になる。**2回目以降は通常通りダブルクリックで起動できる**。

---

### 方法 1: 右クリックから開く（最も簡単・推奨）

macOS の Gatekeeper は右クリックからの起動を「ユーザーが意図して開いた」とみなすため、警告ダイアログに「開く」ボタンが表示される。

1. `.dmg` ファイルをダブルクリックでマウント
2. `Repo-Naut.app` を `/Applications` フォルダへドラッグ
3. Finder で `/Applications/Repo-Naut.app` を **右クリック（または Control + クリック）**
4. メニューから **「開く」** を選択
5. 「"Repo-Naut" は開発元を確認できないアプリケーションです。」という警告ダイアログが表示される
6. ダイアログの **「開く」** ボタンをクリック

> **注意**: ダブルクリックでは「開く」ボタンが表示されず、強制的にブロックされる場合がある（特に macOS 13 Ventura 以降）。**必ず右クリック → 開く** の手順を使うこと。

---

### 方法 2: システム設定から許可する

ダブルクリックでブロックされた後、システム設定からまとめて許可する方法。

1. `Repo-Naut.app` をダブルクリックして起動を試みる（警告が出てブロックされる）
2. **「システム設定」→「プライバシーとセキュリティ」** を開く
3. 下部に「"Repo-Naut" はブロックされました」という表示が出る
4. **「このまま開く」**（macOS 13以降）または **「Open Anyway」** をクリック
5. Touch ID またはパスワードで認証する
6. 再度確認ダイアログが表示されるので **「開く」** をクリック

---

### 方法 3: ターミナルで検疫フラグを除去する

技術者向け。一度実行すれば以降は通常通り起動できる。

```bash
# Applications にインストール済みの場合
xattr -cr /Applications/Repo-Naut.app

# .dmg を展開した直後の .app に対して実行する場合
xattr -cr /path/to/Repo-Naut.app
```

実行後は通常どおりダブルクリックで起動できる。

---

### macOS バージョン別の挙動

| macOS バージョン | ダブルクリック時 | 推奨手順 |
|---|---|---|
| macOS 12 Monterey | 「開発元不明」ダイアログ（「開く」ボタンあり） | 方法 1 または方法 2 |
| macOS 13 Ventura | エラーダイアログのみ（「開く」ボタンなし） | 方法 1 または方法 2 |
| macOS 14 Sonoma | 同上 | 方法 1 または方法 2 |
| macOS 15 Sequoia | 同上 | 方法 1 または方法 2 |

---

## Windows（今後対応予定）

> **現バージョンでは Windows リリースは行わない。** 以下は将来の参考情報として残す。

### 必要なツール

| ツール | 取得方法 |
|---|---|
| Visual Studio Build Tools 2022 | [公式サイト](https://visualstudio.microsoft.com/visual-cpp-build-tools/)から「C++ によるデスクトップ開発」ワークロードを選択 |
| WebView2 Runtime | Windows 10/11 は通常プリインストール済み |
| Rust | `rustup` 経由（上記） |

### ビルド手順

```powershell
pnpm install
pnpm tauri build
```

出力先: `src-tauri\target\release\bundle\`

```
bundle\
├── msi\
│   └── Repo-Naut_0.1.0_x64_en-US.msi
└── nsis\
    └── Repo-Naut_0.1.0_x64-setup.exe
```

未署名の場合、Windows SmartScreen の警告が表示される（「詳細情報」→「実行」で許可可能）。

---

## ビルド成果物の一覧

| OS | ターゲット | 成果物 | 現在の配布 |
|---|---|---|---|
| macOS (ユニバーサル) | `universal-apple-darwin` | `.dmg`, `.app` | ✅ リリース対象 |
| macOS (Apple Silicon) | `aarch64-apple-darwin` | `.dmg`, `.app` | 必要に応じて追加 |
| macOS (Intel) | `x86_64-apple-darwin` | `.dmg`, `.app` | 必要に応じて追加 |
| Windows (64bit) | `x86_64-pc-windows-msvc` | `.msi`, `.exe` | 今後対応予定 |

---

## 開発ビルドとの違い

| 項目 | `pnpm tauri dev` | `pnpm tauri build` |
|---|---|---|
| ビルドプロファイル | `dev`（デバッグ情報付き） | `release`（LTO + strip 最適化） |
| ファイルサイズ | 大（数十 MB） | 小（最適化済み） |
| 起動速度 | 遅い | 速い |
| DevTools | 右クリック → 検証で開ける | 無効 |
| HMR | 有効 | なし |

`Cargo.toml` の release プロファイル設定:

```toml
[profile.release]
panic = "abort"
codegen-units = 1   # 最適化品質を優先
lto = true          # リンク時最適化
opt-level = "s"     # サイズ最適化
strip = true        # デバッグシンボルを除去
```

---

## よくあるエラー（ビルド時）

### macOS

| エラー | 原因 | 対処 |
|---|---|---|
| `xcrun: error: invalid active developer path` | Xcode CLT 未インストール | `xcode-select --install` |
| `could not find native static library 'resolv'` | Xcode CLT のバージョンが古い | `softwareupdate --all --install` |

### Windows

| エラー | 原因 | 対処 |
|---|---|---|
| `LINK : fatal error LNK1181` | MSVC ツールチェーンが見つからない | Visual Studio Build Tools を再インストール |
| `error: linker 'link.exe' not found` | Rust が MSVC ターゲットを使っていない | `rustup default stable-msvc` |
| WebView2 が起動しない | WebView2 Runtime 未インストール | Microsoft 公式からインストール |
| `WiX Toolset not found` | WiX が PATH にない | Tauri が自動でダウンロードするため通常不要。失敗する場合は [WiX 4](https://wixtoolset.org/) を手動インストール |

---

## 参照

- [Tauri v2 公式ドキュメント — Building](https://tauri.app/distribute/)
- [Tauri v2 — Prerequisites](https://tauri.app/start/prerequisites/)
- [`docs/development-setup.md`](development-setup.md) — 開発環境のセットアップ手順
