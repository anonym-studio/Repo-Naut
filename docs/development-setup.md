# 開発環境セットアップ

## 前提条件

### 1. Rust のインストール（必須）

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# インストール完了後
source ~/.cargo/env
# 確認
rustc --version  # 1.77以上推奨
```

### 2. macOS 追加依存（初回のみ）

```bash
xcode-select --install
```

### 3. Node.js

v18 以上が必要。v21 推奨。

```bash
node --version
```

### 4. gh CLI（リポジトリ作成機能を使う場合）

```bash
brew install gh
gh auth login
```

---

## セットアップ

```bash
# 1. フロントエンド依存関係のインストール
pnpm install

# 2. Tauri アイコンの生成（初回のみ、1024x1024のPNGを用意してから実行）
# pnpm tauri icon path/to/icon.png

# 3. 開発サーバー起動（Rust のビルドに初回5〜10分かかる）
pnpm tauri dev
```

---

## よく使うコマンド

| コマンド | 用途 |
|---|---|
| `pnpm tauri dev` | 開発サーバー起動（HMR有効） |
| `pnpm tauri build` | 本番ビルド（インストーラー生成） |
| `pnpm dev` | フロントエンドのみ起動（Tauriなし） |
| `pnpm type-check` | TypeScript型チェック |
| `pnpm lint` | ESLint |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rustテスト全件 |
| `cargo test --manifest-path src-tauri/Cargo.toml <name>` | Rustテスト1件 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Rust型チェック（高速） |

---

## データファイルの場所

開発中のデータは以下に保存される（アプリ表示名は **Repo-Naut**、`identifier` は後方互換のため **`dev.repohub.app`** のまま）：

| OS | パス |
|---|---|
| macOS | `~/Library/Application Support/dev.repohub.app/` |
| Windows | `%APPDATA%\dev.repohub.app\` |

ファイル構成：
```
settings.json    # Workspace / エディタ / ターミナル / テーマ / スキャン除外 /
                 #   カスタムスクリプト / per-workspace カード並び順
repos-meta.json  # リポジトリのタグ・メモ・アーカイブ状態
kanban.json      # カンバンタスク（order は f64）
```

GitHub PAT は JSON には書き込まず OS キーチェーン（`keyring` クレート）に保存される。

---

## よくあるエラー

| エラー | 原因 | 対処 |
|---|---|---|
| `command not found: cargo` | Rust未インストール | 上記手順でインストール |
| `linker cc not found` | Xcode CLT未インストール | `xcode-select --install` |
| `error: failed to run custom build command for tauri-build` | Tauri依存が不足 | Rust/Xcodeを再確認 |
| アプリ起動時に白画面 | Viteのポート競合 | 別のプロセスが1420番を使用していないか確認 |
| `gh: command not found` | gh CLI未インストール | `brew install gh` |

---

## 仕様書

`spec/RepoHub — 仕様・設計書.md` に全機能の詳細、型定義、Tauriコマンドシグネチャが記載されている。
