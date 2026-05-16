# Changelog

All notable changes to Repo-Naut will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-16

Initial MVP release.

### Added

#### Core — ワークスペース・リポジトリ管理
- ワークスペース登録・切り替え（複数ディレクトリをフォルダ単位で管理）
- Rust の rayon による並列スキャンで配下の Git リポジトリを高速検出
- `notify` + 800ms debounce による `.git/HEAD` 監視・自動再スキャン (`src-tauri/src/watcher.rs`)
- リポジトリカード表示（最新コミット・現在ブランチ・未コミット数・未プッシュ数）
- リポジトリフィルタ・ソート（名前・最終コミット日・未コミット数）
- ドラッグ＆ドロップによるカード並び替え (`SortableRepoCard.tsx`)

#### Core — リポジトリ詳細・操作
- エディタ起動ボタン（VS Code / Cursor / Zed、設定画面で登録）
- ターミナル起動ボタン（設定画面で登録）
- スクリプト実行ボタン（プロジェクトごとにシェルスクリプトを登録・実行）
- README モーダルプレビュー（Markdown レンダリング）
- コミット履歴ヒートマップ表示 (`CommitHeatmap.tsx`)
- git pull / git fetch / git push コマンド実行と結果モーダル表示 (`GitResultModal.tsx`)

#### Core — カンバン
- リポジトリ横断カンバンボード（Todo / In Progress / Review / Done の 4 カラム）
- タスクのリポジトリ紐付け・ドラッグ＆ドロップによるカラム移動
- タスク作成・編集・削除モーダル

#### Core — アーカイブ
- リポジトリを `_archive/` ディレクトリへ移動してアーカイブ
- アーカイブ時のスナップショットメタ保存・元のパスへの復元

#### Core — GitHub 連携
- GitHub PAT を OS キーチェーンに安全保管
- PR 数・Issue 数をリポジトリカードにリアルタイム表示
- Rate limit・認証エラーのハンドリング

#### UX
- コマンドパレット（Cmd/Ctrl+K）— リポジトリ・タスク・コミットの横断検索
- キーボードショートカット（g+d: Dashboard, g+r: Repos, g+k: Kanban, g+s: Settings, ?: ヘルプ）
- ショートカット一覧モーダル (`ShortcutsHelp.tsx`)
- トースト通知 (`Toaster.tsx`, `useToast.ts`)
- オンボーディング画面（初回起動時のワークスペース登録ガイド）
- ダークテーマ（macOS のシステム設定に同期）

#### インフラ・ビルド
- Tauri v2 + Rust バックエンド（git2 / libgit2 で Git 操作）
- React 18 + TypeScript + Tailwind CSS v4 フロントエンド
- pnpm workspace 構成（ルート: デスクトップアプリ, `landing/`: ランディングページ）
- GitHub Actions による macOS universal binary (`universal-apple-darwin`) の自動ビルド・リリース
- ランディングページ（Cloudflare Pages 向け、`landing/` ディレクトリ）
- バックアップコマンド (`src-tauri/src/commands/backup.rs`)

[Unreleased]: https://github.com/mkoguchi/repo-naut/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mkoguchi/repo-naut/releases/tag/v0.1.0
