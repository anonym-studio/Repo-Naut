# 残タスクリスト

Repo-Naut の **これからやること** を一覧化したファイル。仕様書（`spec/RepoHub — 仕様・設計書.md`）の Phase 単位の進捗を、実装目線の小さい粒度に展開して管理する。

完了したタスクは消さずに `- [x]` のままにしておく（過去の実装履歴も残す）。

最終更新: 2026-05-13 (19:55)

---

## 凡例

- 優先度: 🔴 高 / 🟡 中 / 🟢 低
- カテゴリ: `[feat]` 機能 / `[fix]` 不具合修正 / `[ux]` UX 改善 / `[infra]` 基盤・テスト / `[docs]` ドキュメント

---

## 直近で着手したいもの（Top-of-mind）

> ここはユーザー体験に直結する優先度の高いタスクを置く。実装したら下のフェーズ別へ移動する。

- [x] 🔴 `[fix]` 大量リポジトリ時の `scan_workspace` パフォーマンス改善 — `rayon` で並列化 / `collect_languages` を `MAX_LANGUAGE_FILES=800` で打ち切り / `StatusOptions` を `no_refresh + update_index(false) + recurse_untracked_dirs(false)` に / 計測ログをサーバー側で出力
- [x] 🔴 `[feat]` リポジトリ詳細のメモ編集を「下書き自動保存」にする — localStorage に 800ms debounce で退避、再オープン時に復元プロンプト表示
- [x] 🟡 `[ux]` Kanban のドラッグ中に **同一カラム内の並び替え** を可能にする — `@dnd-kit/sortable` を採用し、`order` を `f64` 化して中間値で挿入
- [x] 🟡 `[ux]` カードの全体クリック領域を広げる — stretched link パターンでカード全体を詳細リンクに

---

## Phase 3: v1.1 残

- [x] 🟡 `[feat]` **GitHub PAT 連携** — OS Keychain 保存 / `validate_pat` の UI / 設定画面で接続テスト
  - [x] `useGithubStats` / `useHasPat` / `useSavePat` / `useDeletePat` / `useValidatePat` Hook 実装
  - [x] リポジトリカードに PR 数 / Issue 数バッジを表示（PAT 有効時のみ）
  - [x] Rate limit / 401 / 403 / 404 を区別したエラーハンドリング
  - [x] PR 数と Issue 数を別 API で個別集計（GitHub の `/issues` は PR を含むので減算）
- [x] 🟢 `[feat]` ダッシュボードにコミット数グラフ（直近 30 日 × 全リポジトリ集計）— Rust 側 `get_commit_activity` + GitHub 風ヒートマップで実装
- [x] グローバル検索（`Cmd/Ctrl + K`）— 実装済み
- [x] ダッシュボード言語分布・直近アクティブ Top5・アーカイブ候補 — 実装済み

---

## Phase 4: v1.2 残

- [x] `git pull` / `git fetch` / ブランチ切替の UI 実行 — **実装済み**（`RepoDetail` ページ）
- [x] 🟡 `[feat]` Git 操作の結果モーダル（`GitResultModal`）— 実装済み
  - [x] 成功 / 失敗のアイコン + 色分け
  - [x] stderr を折りたたみ表示
  - [x] 「もう一度実行」ボタン
- [x] 🟡 `[feat]` **カスタムスクリプト登録・ワンクリック実行**
  - [x] スクリプト名 + コマンド + 説明を登録（Settings → カスタムスクリプト）
  - [x] RepoCard / RepoDetail の「Run ▾」ドロップダウンから実行
  - [x] 実行結果は `GitResultModal` で表示（stdout / stderr / 「もう一度実行」）
  - [x] 直接プロセス実行（シェル非経由）。`{path}` プレースホルダ対応
  - 残: 実行ログのストリーミング表示は将来対応（現状はコマンド完了後の一括表示）
- [ ] 🟢 `[feat]` `tauri-plugin-updater` による自動アップデート
- [x] 🟢 `[feat]` データのエクスポート / インポート — `settings.json` + `repos-meta.json` + `kanban.json` を 1 つの JSON にまとめてバックアップ。`schemaVersion` + 作成元バージョンを埋め込み、インポート前にサマリプレビュー

---

## UX 改善（仕様外だが入れたい）

- [x] `tauri-plugin-dialog` によるディレクトリピッカー — 実装済み
- [x] `ask()` でのネイティブ確認ダイアログ — 実装済み
- [x] `MarkdownPreview` コンポーネント（メモ・タスク説明）— 実装済み
- [x] コマンドパレットの「最近開いた」履歴（zustand persist）— 実装済み
- [x] README.md プレビュー（カード・リスト・詳細から）— 実装済み
- [x] タスク → リポジトリへのリンクとハイライト遷移 — 実装済み
- [x] 🟡 `[ux]` キーボードショートカット集
  - [x] `?` で全ショートカット一覧モーダル
  - [x] `g r` / `g k` / `g d` などの Vim 風遷移（g + d/r/k/a/s）
- [x] 🟡 `[ux]` トーストを画面右下にスタック表示 + 個別 dismiss — ホバーで自動消去を一時停止、最大 5 件、種別アイコン、`aria-live`、`role="alert"`（error 限定）、「すべて閉じる」一括ボタン（>2 件時）
- [x] 🟢 `[ux]` Workspace 切替時に開いていたページの状態（フィルタ等）を保持 — `filtersByWorkspace` で per-workspace なフィルタ/ソート/ビュー/タグを zustand persist に保存し、`activeWorkspaceId` の変化を `AppShell` の `useEffect` で監視して切替時に即時ハイドレート
- [x] 🟢 `[ux]` リポジトリカードを D&D で並び替えてカスタム順序を保存 — `Settings.workspaceRepoOrder: Record<workspaceId, repoIds[]>` に per-workspace で保存、新 `set_repo_order` コマンド、`sortKey: 'custom'` で `@dnd-kit/sortable` ベースの並び替え（カード右上のハンドルからのみドラッグ）。フィルタ外のリポは順序維持、未登録 ID は末尾に自動追記

---

## 基盤・テスト

- [ ] 🔴 `[infra]` Rust 単体テスト
  - [ ] `store::write_atomic` のクラッシュセーフ性
  - [ ] `commands::workspace::detect_readme` のケース非依存判定
  - [ ] `commands::workspace::scan_workspace` の `.git` 検出ロジック
  - [ ] `commands::kanban::create_task` の order 自動採番
- [ ] 🟡 `[infra]` E2E テスト導入（候補: `tauri-driver` + Playwright / WebdriverIO）
- [ ] 🟡 `[infra]` GitHub Actions で `pnpm type-check` / `pnpm lint` / `cargo check` を PR 毎に実行
- [ ] 🟢 `[infra]` macOS / Windows の本番ビルド成果物を Release に自動アップロード
- [ ] 🟢 `[infra]` `tauri-plugin-log` でファイルログ出力（バグ報告時のデバッグに）

---

## 既知の改善点（低優先）

- [x] 🟢 `[fix]` `scan_workspace` が `_archive` 内の階層も再帰しているので、検出効率を上げる — archive 配下は WalkDir でスキップし、`std::fs::read_dir` で直下 1 階層だけ `.git` を確認するように変更
- [ ] 🟢 `[fix]` 大きな README（>1MB）の MarkdownPreview レンダリング負荷検証
- [x] 🟢 `[ux]` `RepoFilter` の選択中タグを `×` で個別解除できるように — 選択中チップを上段に表示、候補から除外、「フィルタをクリア」一括解除ボタン
- [x] 🟢 `[ux]` `RepoCard` の言語タグが多いと折り返しでレイアウトが崩れる場合がある — 表示を 2 件 + `+N` バッジに変更し、`max-w-[40%]` + `truncate` で名前列を圧迫しないように制約

---

## ドキュメント

- [x] 🟡 `[docs]` README / CLAUDE.md / AGENTS.md / 仕様書を v1.3 ベースに同期 — 主要機能・ディレクトリ構成・Tauri コマンド責務表を最新化、PAT/スクリプト/バックアップ/ヒートマップ/D&D 並び替えなどを反映
- [ ] 🟡 `[docs]` API リファレンス（Tauri コマンド一覧と引数 / 戻り値）を自動生成 or 仕様書から抜粋して `docs/api.md` に独立化
- [ ] 🟡 `[docs]` `docs/architecture.md` を新設してアーキ図 + データフロー図を載せる
- [ ] 🟢 `[docs]` ユーザーマニュアル（スクリーンショット付き）

---

## v2 以降（拡張候補）

仕様書 §10-2 と同期。

- SQLite 移行（タスク 1000 件超 / 全文検索）
- GitLab / Bitbucket API 対応
- SSH / HTTPS 認証管理（プライベートリポジトリの pull/fetch）
- Git フロー可視化（ブランチグラフ表示）
- CI/CD 結果・PR レビュー依頼の通知
- `kanban.json` を Git 管理してチーム共有

---

## 更新ルール

1. 新しいタスクは **「直近で着手したいもの」** の末尾に追加
2. 着手したら `🚧 (作業中)` を先頭に付ける
3. 完了したら `[x]` にする（行は消さない）
4. PR / コミットで関連するタスクには PR 番号やコミット SHA を末尾に追記する
   - 例: `- [x] 🟡 ... — #42 (2026-05-13)`
