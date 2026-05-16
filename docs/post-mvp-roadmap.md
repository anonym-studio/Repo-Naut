# Repo-Naut — ポストMVP ロードマップ

**作成日**: 2026-05-15  
**対象バージョン**: Phase 1〜4 完了後（v1.2相当）

MVPとして Phase 1〜4 の機能実装がほぼ完了した時点での、次フェーズのタスク整理。  
各タスクの優先度・規模・目的を明確にし、着手順の判断基準とする。

---

## 現在の完了状態

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 (MVP) | Workspace登録 / スキャン / カード一覧 / JSON store / ファイル監視 / オンボーディング | ✅ 完了 |
| Phase 2 (v1.0) | カンバン / アーカイブ / エディタ起動 / リポジトリ作成 / ターミナル連携 / フィルタ・ソート | ✅ 完了 |
| Phase 3 (v1.1) | GitHub PAT連携 / ダッシュボード / グローバル検索 | ✅ 完了 |
| Phase 4 (v1.2) | Git操作UI / カスタムスクリプト / データエクスポート・インポート | ✅ 完了（自動アップデートのみ未着手） |

---

## 残タスク一覧

### A. 機能 — `tauri-plugin-updater` による自動アップデート

**優先度**: 🟢 低  
**規模**: 中（2〜3日）  
**カテゴリ**: `[feat]`

アプリ内から新バージョンへの自動アップデートを可能にする。

実装ポイント:
- `tauri-plugin-updater` を `Cargo.toml` / `tauri.conf.json` に追加
- アップデートサーバー URL の設定（GitHub Releases JSON エンドポイントを使う方法が一般的）
- 起動時にバックグラウンドで更新チェック → トーストで通知 → ダウンロード & 再起動フロー
- Windows の場合はコード署名が必要になるため、配布形態が固まってから実装するのが現実的

---

### B. テスト基盤

**優先度**: 🔴 高（品質担保の観点から）  
**カテゴリ**: `[infra]`

#### B-1. Rust 単体テスト（規模: 小〜中、1〜2日）

テスト対象と検証内容:

| テスト対象 | 確認内容 |
|---|---|
| `store::write_atomic` | クラッシュセーフ性（書き込み中断でファイルが壊れないこと） |
| `commands::workspace::detect_readme` | `.readme` / `README` / `readme.md` 等のケース非依存判定 |
| `commands::workspace::scan_workspace` | `.git` ディレクトリの検出ロジック（ネスト除外・`_archive` 1階層のみ） |
| `commands::kanban::create_task` | `order` 値の自動採番（末尾挿入・中間挿入） |

```bash
# 実行方法
cargo test --manifest-path src-tauri/Cargo.toml
```

#### B-2. E2E テスト導入（規模: 大、3〜5日）

候補: `tauri-driver` + Playwright（またはWebdriverIO）

優先シナリオ:
1. Workspace を登録 → リポジトリがカード一覧に表示される
2. カンバンタスクを作成 → カラム間ドラッグ → データが永続化される
3. アーカイブ → 復元 → 元のパスに戻る

> 導入コストが高いため、CI整備（C-1）が先に安定してから着手するのが現実的。

---

### C. CI / CD 基盤

**優先度**: 🟡 中  
**カテゴリ**: `[infra]`

#### C-1. GitHub Actions — PR ごとの静的チェック（規模: 小、半日）

```yaml
# .github/workflows/ci.yml のイメージ
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - pnpm type-check
      - pnpm lint
      - cargo check --manifest-path src-tauri/Cargo.toml
      - cargo test  --manifest-path src-tauri/Cargo.toml  # B-1完了後
```

#### ~~C-2. macOS / Windows ビルド成果物の Release 自動アップロード~~（✅ 完了）

- `.github/workflows/release.yml` で macOS ユニバーサルバイナリ (`.dmg`) を自動ビルド・Release 公開
- トリガー: `v*` タグ push または手動実行（`workflow_dispatch`）
- 自動アップデート（A）を実装するなら、更新チェック用の JSON ファイルもここで追加する

---

### D. ログ出力

**優先度**: 🟢 低  
**規模**: 小（半日）  
**カテゴリ**: `[infra]`

`tauri-plugin-log` でファイルログを出力し、ユーザーがバグ報告する際のデバッグ情報を確保する。

- ログ保存先: `app_log_dir()` 配下（macOS: `~/Library/Logs/dev.repohub.app/`）
- ログレベル: `debug` (開発) / `info` (本番)
- Rust コマンドの主要な入出力をログに記録

---

### E. 既知の問題修正

**優先度**: 🟢 低  
**カテゴリ**: `[fix]`

| 項目 | 内容 | 規模 |
|---|---|---|
| 大きな README (>1MB) の負荷検証 | `read_readme` で 5MB 上限を設けているが、MarkdownPreview のレンダリング負荷を実機で検証。必要なら仮想スクロールを検討 | 小 |

---

### F. ドキュメント

**優先度**: 🟡 中  
**カテゴリ**: `[docs]`

#### F-1. API リファレンス (`docs/api.md`)（規模: 小〜中、1日）

仕様書の §7「Tauriコマンド設計」を独立したファイルに抜粋し、引数・戻り値・エラーケースを網羅。  
Claude Code 等のエージェントが参照しやすい形式に整理する。

#### F-2. アーキテクチャ図 (`docs/architecture.md`)（規模: 小、半日）

- コンポーネント間のデータフロー図（React → Hook → Tauri Command → JSON Store）
- ファイルシステム監視のシーケンス図（notify → workspace_changed → invalidateQueries）

#### F-3. ユーザーマニュアル（規模: 中、2〜3日）

スクリーンショット付きの操作ガイド。公開・配布を想定するなら必須。  
配布の目処が立ってから着手する。

---

## 推奨着手順

```
優先度・依存関係を考慮した推奨順（✅ は完了済み）:

✅ C-2 (Release自動アップロード) — .github/workflows/release.yml で完了
1. B-1 (Rust単体テスト)       — 小規模・品質リスクが最も高い
2. C-1 (GitHub Actions CI)    — B-1の恩恵をすぐに受けられる
3. F-1 (APIリファレンス)       — エージェント作業効率に直結
4. F-2 (アーキテクチャ図)      — F-1と同時進行可
5. A   (自動アップデート)       — C-2が整っているので着手可能
6. B-2 (E2Eテスト)            — C-1安定後
7. D   (ファイルログ)
8. E   (README負荷検証)
9. F-3 (ユーザーマニュアル)   — 配布直前
```

---

## v2 以降の拡張候補

仕様書 §10-2 より。現時点では着手しない。

| 機能 | トリガー条件 |
|---|---|
| SQLite 移行 | タスク 1000件超 / 全文検索が必要になった場合 |
| GitLab / Bitbucket API 対応 | GitHub 以外のユーザーからの需要が出た場合 |
| SSH / HTTPS 認証管理 | プライベートリポジトリの pull/fetch を頻繁に使うユーザーが出た場合 |
| Git フロー可視化（ブランチグラフ） | ブランチ管理の需要が高まった場合 |
| CI/CD 結果・PR レビュー通知 | チーム利用やヘビーな個人開発への移行時 |
| `kanban.json` を Git 管理してチーム共有 | チーム利用への拡張時 |

---

## 参照ドキュメント

- [`docs/tasks.md`](tasks.md) — 全タスクの詳細履歴（完了済み含む）
- [`spec/RepoHub — 仕様・設計書.md`](../spec/RepoHub%20—%20仕様・設計書.md) — 機能要件・型定義・コマンド仕様
- [`AGENTS.md`](../AGENTS.md) — 機能追加の手順と絶対ルール
