# Repo-Naut

ローカルにある複数の Git リポジトリを一元管理するデスクトップアプリ。

[Tauri v2](https://tauri.app/) + React 18 + TypeScript + Rust で実装。個人開発者・フリーランスエンジニアが、workspace ディレクトリ配下に散らばるプロジェクトを「カード一覧 → 即起動 → タスク管理 → アーカイブ」までシームレスに扱えることを目指す。

> **Status**: Phase 2 (v1.0) 相当の機能を一通り実装済み。Phase 3 以降は `docs/tasks.md` 参照。

---

## 主な機能

- **Workspace 単位のリポジトリスキャン** — 登録した複数のルートディレクトリ配下を `git2` で再帰スキャン。最新コミット・ブランチ・ahead/behind・unstaged 数を一覧表示
- **ファイル監視による自動再スキャン** — `notify` クレートで `.git/HEAD` / `refs/heads/` の変更を 800ms debounce で検知 → クエリ無効化 → 自動再スキャン
- **アーカイブ機能** — 古いリポジトリを `_archive` ディレクトリへ移動して整理。復元時は元の場所に戻す
- **カンバン式タスク管理** — リポジトリ横断でタスクを管理（todo / in_progress / review / done）。タスクにリポジトリをひも付け、タスクからリポジトリカードへワンクリックで遷移
- **エディタ・ターミナル起動** — VS Code / Cursor / Windsurf / Zed のプリセット + カスタム登録。macOS は iTerm2 → Terminal.app、Windows は Windows Terminal → cmd の優先順で自動起動
- **GitHub リポジトリ作成** — `gh` CLI と連携してアプリ内から `gh repo create` を実行。出力はストリームで表示
- **README.md プレビュー** — カード／リスト／詳細ページからスライドパネルで開ける（Esc・背景クリックで閉じる）
- **タグ・メモ** — リポジトリごとに自由にタグとメモ（Markdown）を付けられる。タスクの説明も Markdown 対応
- **ダッシュボード** — 言語分布・直近アクティブ Top5・アーカイブ候補を集計
- **グローバル検索（Cmd/Ctrl + K）** — リポジトリ・タスク・最新コミットメッセージ・ナビ項目を横断検索。「最近開いたリポジトリ」も即座に呼び出せる
- **ダーク / ライト / システム追従テーマ**
- **オンボーディング** — Workspace 未登録時は全画面ガイドを表示し、ディレクトリピッカーで簡単登録

---

## 技術スタック

| レイヤー | ライブラリ・ツール |
|---|---|
| **フレームワーク** | Tauri v2 |
| **フロントエンド** | React 18 + TypeScript / Vite / Tailwind CSS v4 |
| **状態管理** | `@tanstack/react-query`（サーバー状態）/ `zustand` + persist（UI 状態） |
| **DnD** | `@dnd-kit/core` |
| **Markdown** | `react-markdown` |
| **ルーティング** | `react-router-dom` v6（`createHashRouter`） |
| **ネイティブ連携** | `@tauri-apps/plugin-dialog`（ダイアログ / ファイル選択） |
| **バックエンド** | Rust（`git2` / `notify` / `serde` / `tokio` / `keyring` / `reqwest` / `uuid` / `chrono`） |
| **データ永続化** | JSON ファイル 3 本（settings / repos-meta / kanban）、PAT は OS Keychain |
| **パッケージマネージャー** | **pnpm**（npm は使わない） |

---

## クイックスタート

### 前提

- Node.js 18+
- pnpm 8+
- Rust（stable）— `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- macOS 12+ または Windows 10+
- 任意: `gh` CLI（リポジトリ作成機能を使う場合）

詳しい初期セットアップ手順は [`docs/development-setup.md`](docs/development-setup.md) を参照。

### インストール & 起動

```bash
pnpm install
pnpm tauri dev   # 開発サーバー（HMR 有効、初回ビルドは 5〜10 分）
```

### よく使うコマンド

```bash
pnpm tauri dev      # 開発起動
pnpm tauri build    # 本番ビルド（インストーラー生成）
pnpm dev            # フロントエンドのみ（Tauri なし）
pnpm type-check     # TypeScript 型チェック
pnpm lint           # ESLint

cargo check --manifest-path src-tauri/Cargo.toml         # Rust 型チェック（高速）
cargo test  --manifest-path src-tauri/Cargo.toml         # Rust テスト
```

### コミット前の検証

```bash
pnpm type-check && pnpm lint && cargo check --manifest-path src-tauri/Cargo.toml
```

---

## データ保存先

JSON ファイル 3 本を Tauri の `app_config_dir()`（`identifier = dev.repohub.app` ※後方互換のため維持）配下に保存する。ウィンドウ・インストーラ上の表示名は **Repo-Naut**。

| プラットフォーム | パス |
|---|---|
| macOS | `~/Library/Application Support/dev.repohub.app/` |
| Windows | `%APPDATA%\dev.repohub.app\` |

| ファイル | 内容 |
|---|---|
| `settings.json` | Workspace 登録 / エディタ設定 / ターミナル / テーマ / スキャン除外 / `commitHistoryLimit` |
| `repos-meta.json` | リポジトリ単位のタグ・メモ・アーカイブ状態（キー = パスの SHA256 先頭 16 文字） |
| `kanban.json` | カンバンの全タスク |

- 書き込みは必ず一時ファイル → リネームで atomic
- Git 由来のデータ（コミット情報・ブランチ・ahead/behind・unstaged）は **メモリのみ**、永続化しない
- **GitHub PAT は JSON に書かず**、`keyring` クレートで OS Keychain に保存

---

## アーキテクチャ概要

```
React Component
   ↓ uses
src/hooks/useXxx.ts            (react-query でラップ)
   ↓ invoke()
src-tauri/src/commands/xxx.rs  (#[tauri::command])
   ↓
src-tauri/src/store.rs         (JSON 読み書き、atomic write)
   ↓
~/.../dev.repohub.app/*.json
```

**重要な制約:**

- コンポーネントから直接 `invoke()` を呼ばない（必ず `src/hooks/` 経由）
- 新しい Tauri コマンドは `src-tauri/src/lib.rs` の `generate_handler![]` に登録する（忘れると実行時 "command not found" エラー）
- Rust 型（`models.rs`）と TypeScript 型（`src/types/index.ts`）は常に同期
- Rust 側の全 struct に `#[serde(rename_all = "camelCase")]`、`Option` フィールドには `#[serde(skip_serializing_if = "Option::is_none")]`

詳細は [`AGENTS.md`](AGENTS.md) と [`CLAUDE.md`](CLAUDE.md) を参照。

### ディレクトリ構成（要約）

```
src-tauri/src/
├── lib.rs              # Tauri ビルダー / コマンド登録 / watcher 起動
├── models.rs           # 全 Rust 型定義
├── store.rs            # JSON 読み書きユーティリティ
├── watcher.rs          # notify による workspace 監視
└── commands/
    ├── workspace.rs    # scan_workspace, add/remove/set_active_workspace
    ├── git.rs          # get_repo_detail, update_repo_meta, git_pull/fetch/checkout, read_readme
    ├── archive.rs      # archive_repo, restore_repo
    ├── kanban.rs       # get/create/update/delete/move_task
    ├── github.rs       # get_github_stats, validate/save/delete_pat
    ├── repo_create.rs  # check_gh_auth, create_repo (gh CLI)
    └── settings.rs     # get/update_settings, open_in_editor/terminal, editor CRUD, open_url

src/
├── types/index.ts      # 全 TypeScript 型定義（Rust 型と 1 対 1 対応）
├── pages/              # Dashboard / Repos / RepoDetail / Kanban / Archive / Settings
├── components/
│   ├── layout/         # AppShell / TopNav / WorkspaceSelector / GhStatusBanner / Onboarding
│   ├── repo/           # RepoCard / RepoList / RepoFilter / EditorButton / CreateRepoModal / ReadmeModal
│   ├── kanban/         # KanbanBoard / KanbanColumn / TaskCard / TaskFormModal
│   └── common/         # Spinner / Toaster / CommandPalette / MarkdownPreview
├── hooks/              # useRepos / useWorkspaces / useArchive / useTasks / useGitOps /
│                       #   useEditor / useRepoCreate / useSettings / useThemeSync /
│                       #   useWorkspaceWatcher
└── store/
    ├── useAppStore.ts  # zustand + persist（UI 状態 + 最近開いたリポジトリ）
    └── useToast.ts     # トースト通知
```

---

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`spec/RepoHub — 仕様・設計書.md`](spec/RepoHub%20—%20仕様・設計書.md) | 機能要件 / データモデル / Tauri コマンド仕様 |
| [`docs/development-setup.md`](docs/development-setup.md) | 初期セットアップ手順 / Rust インストール / よくあるエラー |
| [`docs/development-workflow.md`](docs/development-workflow.md) | 日々のワークフロー / コードパターン集 / デバッグ方法 |
| [`docs/tasks.md`](docs/tasks.md) | 残タスクリスト（随時更新） |
| [`AGENTS.md`](AGENTS.md) | AI エージェント向けの作業ガイド |
| [`CLAUDE.md`](CLAUDE.md) | Claude Code 向けのアーキテクチャ詳細 |

---

## キーボードショートカット

`?` を押すといつでもアプリ内でショートカット一覧モーダルを開けます。

| キー | 動作 |
|---|---|
| `?` | ショートカット一覧モーダル |
| `Cmd/Ctrl + K` | コマンドパレットを開く |
| `g` → `d` / `r` / `k` / `a` / `s` | Dashboard / Repos / Kanban / Archive / Settings に遷移 |
| `↑` / `↓` | コマンドパレット内で選択を移動 |
| `Enter` | 選択中の項目を開く |
| `Esc` | モーダル・パレットを閉じる |

---

## ライセンス

未定（プライベートプロジェクト）。

---

## 貢献ガイドライン

開発に参加する場合は、以下の順番でドキュメントを読むと迷子になりません。

1. このファイル（README.md）— 全体像
2. [`docs/development-setup.md`](docs/development-setup.md) — 環境構築
3. [`AGENTS.md`](AGENTS.md) — 機能追加のテンプレ・絶対ルール
4. [`docs/development-workflow.md`](docs/development-workflow.md) — コードパターン集
5. [`spec/RepoHub — 仕様・設計書.md`](spec/RepoHub%20—%20仕様・設計書.md) — 仕様の正

実装前に必ず確認:

- [ ] Tauri コマンドを追加するときは `lib.rs` の `generate_handler![]` に登録したか
- [ ] Rust 型と TypeScript 型を両方更新したか
- [ ] JSON 書き込みで `write_atomic()` を使っているか
- [ ] PAT を JSON に書いていないか（必ず `keyring` 経由）
- [ ] `pnpm type-check && pnpm lint && cargo check` がすべて通っているか
