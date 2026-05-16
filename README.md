# Repo-Naut

ローカルにある複数の Git リポジトリを一元管理するデスクトップアプリ。

[Tauri v2](https://tauri.app/) + React 18 + TypeScript + Rust で実装。個人開発者・フリーランスエンジニアが、workspace ディレクトリ配下に散らばるプロジェクトを「カード一覧 → 即起動 → タスク管理 → アーカイブ」までシームレスに扱えることを目指す。

> **Status**: Phase 1〜4 をほぼ実装済み（`tauri-plugin-updater` のみ未着手）。残タスクは [`docs/tasks.md`](docs/tasks.md) 参照。

---

## 主な機能

- **Workspace 単位のリポジトリスキャン** — 登録した複数のルートディレクトリ配下を `git2` で再帰スキャン。`rayon` で並列処理し、`_archive` 配下は直下 1 階層だけ拾う軽量モード。最新コミット・ブランチ・ahead/behind・unstaged 数を一覧表示
- **ファイル監視による自動再スキャン** — `notify` クレートで `.git/HEAD` / `refs/heads/` の変更を 800ms debounce で検知 → クエリ無効化 → 自動再スキャン
- **アーカイブ機能** — 古いリポジトリを `_archive` ディレクトリへ移動して整理。復元時は元の場所に戻す
- **カンバン式タスク管理** — リポジトリ横断でタスクを管理（todo / in_progress / review / done）。`@dnd-kit/sortable` でカラム間 + 同一カラム内の並び替えに対応（order は `f64` 中間挿入）。タスクからリポジトリカードへワンクリックで遷移
- **リポジトリカードの D&D 並び替え** — 「並び順 = カスタム」を選ぶとカード右上のハンドルからドラッグ可能。並び順は per-workspace で保存される
- **エディタ・ターミナル起動** — VS Code / Cursor / Windsurf / Zed のプリセット + カスタム登録。macOS は iTerm2 / Terminal.app / Ghostty、Windows は Windows Terminal / cmd を選択
- **GitHub リポジトリ作成** — `gh` CLI と連携してアプリ内から `gh repo create` を実行。出力はストリームで表示
- **GitHub PAT 連携** — OS キーチェーンに保存した PAT で PR / Issue 数バッジをカードに表示。Rate limit / 401 / 403 / 404 を区別したエラーハンドリング
- **カスタムスクリプト** — `Settings` で名前 + コマンド + 説明を登録し、`{path}` プレースホルダで repoPath を渡せる。`RepoCard` / `RepoDetail` の `Run ▾` から実行、結果は `GitResultModal` で表示
- **データのエクスポート / インポート** — `settings.json` + `repos-meta.json` + `kanban.json` を単一 JSON にまとめてバックアップ。インポート時は事前サマリプレビュー（PAT は keychain 管理のためバックアップに含めない）
- **README.md プレビュー** — カード／リスト／詳細ページからスライドパネルで開ける
- **タグ・メモ** — リポジトリごとに自由にタグとメモ（Markdown）を付けられる。メモは localStorage に 800ms debounce で **下書き自動保存**、再オープン時に復元プロンプト
- **ダッシュボード** — 言語分布・直近アクティブ Top5・アーカイブ候補に加え、**直近 30 日のコミット数を GitHub 風ヒートマップで集計表示**
- **グローバル検索 + キーボード操作** — `Cmd/Ctrl + K` でコマンドパレット、`?` でショートカット一覧、`g + d/r/k/a/s` の Vim 風ナビゲーション、最近開いたリポジトリも即起動
- **トースト通知** — 種別アイコン、`aria-live`、`role="alert"`、ホバーで auto-dismiss 一時停止、個別 × / すべて閉じる
- **ダーク / ライト / システム追従テーマ**
- **オンボーディング** — Workspace 未登録時は全画面ガイドを表示し、ディレクトリピッカーで簡単登録

---

## 技術スタック

| レイヤー | ライブラリ・ツール |
|---|---|
| **フレームワーク** | Tauri v2 |
| **フロントエンド** | React 18 + TypeScript / Vite / Tailwind CSS v4 |
| **状態管理** | `@tanstack/react-query`（サーバー状態）/ `zustand` + persist（UI 状態 / per-workspace スナップショット） |
| **DnD** | `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`（Kanban / RepoCard 並び替え） |
| **Markdown** | `react-markdown` + `remark-gfm` |
| **ルーティング** | `react-router-dom` v6（`createHashRouter`） |
| **ネイティブ連携** | `@tauri-apps/plugin-dialog`（ダイアログ / ファイル選択 / バックアップ JSON の save/open） |
| **バックエンド** | Rust（`git2` / `notify` / `rayon` / `serde` / `tokio` / `keyring` / `reqwest` / `uuid` / `chrono` / `walkdir`） |
| **データ永続化** | JSON ファイル 3 本（settings / repos-meta / kanban）、PAT は OS Keychain（`keyring` クレート） |
| **パッケージマネージャー** | **pnpm** workspace（npm は使わない） |
| **公開用 LP** | `landing/` — Vite + React + Tailwind v4（[Cloudflare Pages](https://pages.cloudflare.com/) 向け） |

### リポジトリ構成（pnpm workspace）

ルートの `pnpm-workspace.yaml` で **2 パッケージ**を管理する。依存のインストールはリポジトリルートで `pnpm install` するだけで両方に反映される。

| パッケージ名 | パス | 役割 | ビルド出力 |
|---|---|---|---|
| `repo-naut` | `.`（ルート） | Tauri デスクトップアプリ | `dist/` → Tauri `frontendDist` |
| `repo-naut-landing` | `landing/` | 公開用ランディングページ | `landing/dist/` → Cloudflare Pages |

デスクトップ用の `pnpm build` と LP 用の `pnpm landing:build` は **別ディレクトリに出力**するため、互いに上書きしない。

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
pnpm install          # workspace 全体（デスクトップ + landing）
pnpm tauri dev        # デスクトップ開発（HMR、初回ビルドは 5〜10 分）
```

### よく使うコマンド（デスクトップアプリ）

```bash
pnpm tauri dev      # 開発起動（フロント :1420）
pnpm tauri build    # 本番ビルド（インストーラー生成）
pnpm dev            # フロントエンドのみ（Tauri なし）
pnpm type-check     # TypeScript 型チェック（ルート `src/`）
pnpm lint           # ESLint

cargo check --manifest-path src-tauri/Cargo.toml         # Rust 型チェック（高速）
cargo test  --manifest-path src-tauri/Cargo.toml         # Rust テスト
```

### ランディングページ（`landing/`）

公開用 LP はデスクトップアプリと **コード・ビルドを分離**している（Tauri API は使わない）。

```bash
pnpm landing:dev          # LP 開発サーバー http://localhost:1430
pnpm landing:build        # 本番ビルド → landing/dist/
pnpm landing:preview      # ビルド成果物のローカル確認
pnpm landing:type-check   # LP の TypeScript 型チェック
```

`pnpm tauri dev`（:1420）と `pnpm landing:dev`（:1430）は **同時起動可能**。

Cloudflare Pages では **Root directory = `landing`**、**Build output = `dist`** で接続する。詳細は [`spec/ランディングページ — 仕様・方針.md`](spec/ランディングページ%20—%20仕様・方針.md) を参照。

### コミット前の検証

**デスクトップのみ変更した場合:**

```bash
pnpm type-check && pnpm lint && cargo check --manifest-path src-tauri/Cargo.toml
```

**LP のみ変更した場合:**

```bash
pnpm landing:type-check && pnpm landing:build
```

**両方変更した場合:** 上記をそれぞれ実行する。

---

## 本番ビルド

**現在のリリース対象: macOS のみ**（Windows は今後対応予定）。  
Apple Developer Program 未加入のため、配布バイナリは**未署名**となる。

### macOS（リリース対象）

追加で必要なもの: Xcode Command Line Tools

```bash
xcode-select --install   # 初回のみ

# ネイティブ（実行している Mac のアーキテクチャ向け）
pnpm tauri build

# ユニバーサルバイナリ（Intel + Apple Silicon 両対応・配布時推奨）
rustup target add x86_64-apple-darwin aarch64-apple-darwin   # 初回のみ
pnpm tauri build --target universal-apple-darwin
```

出力先: `src-tauri/target/[universal-apple-darwin/]release/bundle/dmg/`

> **未署名アプリの初回起動**: ダウンロードしたユーザーは Gatekeeper の警告が表示される。Finder で右クリック →「開く」→ダイアログの「開く」をクリックすることで起動できる（2回目以降は通常通り）。詳細は [`docs/build-guide.md`](docs/build-guide.md) を参照。

### Windows（今後対応予定）

現バージョンでは Windows リリースは行わない。ビルド手順・必要ツールは [`docs/build-guide.md`](docs/build-guide.md) 参照。

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
landing/                  # 公開用 LP（repo-naut-landing / Cloudflare Pages）
├── src/                  # LP の React コンポーネント（デスクトップ src/ とは別）
├── public/               # 静的ファイル（_redirects 等）
└── dist/                 # pnpm landing:build の出力（git 管理外）

src-tauri/src/
├── lib.rs              # Tauri ビルダー / generate_handler! 登録 / watcher 起動
├── models.rs           # 全 Rust 型定義（Settings に workspaceRepoOrder / scripts を含む）
├── store.rs            # JSON 読み書きユーティリティ（atomic write / repo_id_from_path）
├── watcher.rs          # notify による workspace 監視
└── commands/
    ├── workspace.rs    # scan_workspace (rayon 並列) / add/remove/set_active_workspace / set_repo_order
    ├── git.rs          # get_repo_detail / update_repo_meta / git_pull/fetch/checkout /
    │                   #   read_readme / get_commit_activity
    ├── archive.rs      # archive_repo / restore_repo
    ├── kanban.rs       # get/create/update/delete/move_task（order: f64）
    ├── github.rs       # get_github_stats / has_pat / validate_pat / save_pat / delete_pat
    ├── repo_create.rs  # check_gh_auth / create_repo（gh CLI + 進捗ストリーム）
    ├── scripts.rs      # list/add/update/remove_script / run_script
    ├── backup.rs       # export_data / preview_backup / import_data
    └── settings.rs     # get/update_settings / open_in_editor/terminal / editor CRUD / open_url

src/
├── types/index.ts      # 全 TypeScript 型定義（Rust 型と 1 対 1 対応）
├── pages/              # Dashboard / Repos / RepoDetail / Kanban / Archive / Settings
├── components/
│   ├── layout/         # AppShell / TopNav / WorkspaceSelector / GhStatusBanner / Onboarding
│   ├── repo/           # RepoCard / SortableRepoCard / RepoList / RepoFilter /
│   │                   #   EditorButton / ScriptRunButton / ReadmeModal / CreateRepoModal
│   ├── kanban/         # KanbanBoard / KanbanColumn / TaskCard / TaskFormModal
│   └── common/         # Spinner / Toaster / CommandPalette / ShortcutsHelp /
│                       #   GitResultModal / CommitHeatmap / MarkdownPreview
├── hooks/              # useRepos (+ useSetRepoOrder / useReadme / useCommitActivity) /
│                       #   useWorkspaces / useArchive / useTasks / useGitOps /
│                       #   useEditor / useRepoCreate / useGithub / useScripts /
│                       #   useBackup / useSettings / useThemeSync / useWorkspaceWatcher
└── store/
    ├── useAppStore.ts  # zustand + persist（UI 状態 + per-workspace フィルタ/並び順スナップショット）
    └── useToast.ts     # トースト通知（個別 dismiss / hover pause / 最大スタック）
```

---

## ドキュメント

| ファイル | 内容 |
|---|---|
| [`spec/RepoHub — 仕様・設計書.md`](spec/RepoHub%20—%20仕様・設計書.md) | 機能要件 / データモデル / Tauri コマンド仕様 |
| [`spec/ランディングページ — 仕様・方針.md`](spec/ランディングページ%20—%20仕様・方針.md) | LP の構成・デプロイ方針 / Cloudflare Pages 設定 |
| [`docs/development-setup.md`](docs/development-setup.md) | 初期セットアップ手順 / Rust インストール / よくあるエラー |
| [`docs/build-guide.md`](docs/build-guide.md) | OS 別本番ビルド手順 / コード署名 / トラブルシューティング |
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
- [ ] `pnpm type-check && pnpm lint && cargo check` がすべて通っているか（LP のみ変更時は `pnpm landing:type-check && pnpm landing:build`）
