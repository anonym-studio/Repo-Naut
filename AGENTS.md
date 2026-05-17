# AGENTS.md

このファイルはCursor等のAIエージェントがこのリポジトリで作業する際のガイドです。

---

## プロジェクト概要

**Repo-Naut** — ローカルの複数Gitリポジトリを一元管理するTauriデスクトップアプリ。

- フロントエンド: React 18 + TypeScript + Tailwind CSS v4 + react-query + zustand(+persist) + `@dnd-kit/{core,sortable,utilities}`
- バックエンド: Rust + Tauri v2（コマンドは`invoke()`経由でフロントから呼ぶ）+ `rayon`（並列スキャン）
- データ: JSONファイル3本（settings / repos-meta / kanban、SQLiteなし）+ OS Keychain（PAT のみ）
- パッケージマネージャー: **pnpm**（npmは使わない）

---

## 変更後に必ず実行する検証コマンド

```bash
# デスクトップ TypeScript の変更後
pnpm type-check

# Rust の変更後
cargo check --manifest-path src-tauri/Cargo.toml

# LP（landing/）の変更後
pnpm landing:type-check && pnpm landing:build

# コミット前（デスクトップ）
pnpm type-check && cargo check --manifest-path src-tauri/Cargo.toml
```

これらがエラーなく通ることを確認してから作業完了とすること。

---

## 絶対に守るルール

| # | ルール | 理由 |
|---|--------|------|
| 1 | コンポーネントから直接`invoke()`を呼ばない | 必ず`src/hooks/`のカスタムHookを経由する |
| 2 | 新Rustコマンドを`lib.rs`の`generate_handler![]`に登録する | 忘れると実行時に"command not found"エラー |
| 3 | Rust型とTypeScript型を同時に変更する | `models.rs`と`src/types/index.ts`は常に同期 |
| 4 | JSON書き込みは`write_atomic()`を使う | 直接`fs::write()`すると起動中クラッシュ時に破損する |
| 5 | GitHub PATをJSONに書かない | `keyring`クレート（OSキーチェーン）に保存する |
| 6 | Git由来のデータ（commit情報等）を永続化しない | メモリのみ。`repos-meta.json`に含めない |
| 7 | `use tauri::Manager;`を忘れない | `app.path()`はこのトレイトがないと使えない |

---

## 改善検討ドキュメント（継続追記）

未実装の改善・調査結果は **`docs/improvement-considerations.md`** に蓄積する。

- バグ調査・UX・パフォーマンス・プラットフォーム制約などで **即実装しないが将来検討したい** 内容が出たら、作業の最後に **積極的に 1 トピック追記** する（既存トピックの更新でも可）。
- 書式は同ファイル先頭の「運用ルール」「トピックの書き方」に従う。実装完了時はステータスを `implemented` にし、PR 等へのリンクを残す。
- 確定した仕様は `spec/` へ、実行タスクは `docs/tasks.md` へ移す（本ファイルは検討メモ用）。

---

## 機能追加の手順

### パターンA: フロントエンドのみ

```
src/types/index.ts         型の追加・確認
src/hooks/useXxx.ts        Hook作成
src/components/xxx/Xxx.tsx コンポーネント実装
src/pages/Xxx.tsx          ページへ組み込み
```

### パターンB: Tauriコマンドを伴う機能（フルスタック）

```
1. src-tauri/src/models.rs          Rust型を定義
2. src-tauri/src/commands/xxx.rs    コマンドを実装
3. src-tauri/src/lib.rs             generate_handler![] に登録  ← 忘れやすい
4. src/types/index.ts               TypeScript型を追加
5. src/hooks/useXxx.ts              Hookを作成
```

---

## コピペ用テンプレート

### Rustコマンド

```rust
// src-tauri/src/commands/xxx.rs
use crate::models::SomeType;
use crate::store;
use tauri::AppHandle;

#[tauri::command]
pub async fn do_something(app: AppHandle, param: String) -> Result<SomeType, String> {
    let settings = store::load_settings(&app)?;
    // 実装
    Ok(result)
}
```

```rust
// src-tauri/src/lib.rs の generate_handler![] に追加
commands::xxx::do_something,
```

### データ取得Hook

```typescript
// src/hooks/useXxx.ts
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { SomeType } from '../types'

export function useXxx(param: string) {
  return useQuery({
    queryKey: ['xxx', param],
    queryFn: () => invoke<SomeType>('do_something', { param }),
    enabled: !!param,
  })
}
```

### データ更新Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export function useUpdateXxx() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SomeType) => invoke('update_xxx', { payload }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['xxx'] }),
  })
}
```

### Tauriイベントのリッスン（Rust→React）

```typescript
useEffect(() => {
  const unlisten = listen<SomeType>('event_name', (event) => {
    // event.payload を処理
  })
  return () => { unlisten.then((fn) => fn()) }
}, [])
```

### Rustからイベントを送信

```rust
use tauri::Emitter;
app.emit("event_name", &payload).ok();
```

---

## 型の対応関係

| Rust（`models.rs`） | TypeScript（`src/types/index.ts`） | 変換 |
|---------------------|-------------------------------------|------|
| `snake_case`フィールド | `camelCase`フィールド | `#[serde(rename_all = "camelCase")]`で自動 |
| `Option<T>` | `T \| undefined` または `T?` | |
| `Vec<T>` | `T[]` | |
| `Result<T, String>` | `Promise<T>`（エラーは`throw`) | |

全Rust型に必ず付けるアノテーション:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyType {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional_field: Option<String>,
}
```

---

## ファイル配置の原則

| 何を作るか | どこに置くか |
|-----------|-------------|
| TypeScript型 | `src/types/index.ts`（1ファイルに集約） |
| Rust型 | `src-tauri/src/models.rs`（1ファイルに集約） |
| データ取得・更新ロジック | `src/hooks/useXxx.ts` |
| UIのグローバル状態 | `src/store/useAppStore.ts`（zustand） |
| ページコンポーネント | `src/pages/Xxx.tsx` |
| 再利用可能コンポーネント | `src/components/<domain>/Xxx.tsx` |
| Tauriコマンド実装 | `src-tauri/src/commands/<domain>.rs` |

---

## 既存コマンドの責務（新コマンドの配置先判断に使う）

| ファイル | 担当するコマンド群 |
|---------|------------------|
| `workspace.rs` | scan_workspace, add/remove/set_active_workspace, **set_repo_order**（per-workspace カスタム並び） |
| `git.rs` | get_repo_detail, update_repo_meta, git_pull/fetch/checkout, **read_readme**, **get_commit_activity** |
| `archive.rs` | archive_repo, restore_repo |
| `kanban.rs` | get/create/update/delete/move_task（order は `f64` で中間挿入） |
| `github.rs` | get_github_stats, has_pat, validate_pat, validate_stored_pat, save_pat, delete_pat |
| `repo_create.rs` | check_gh_auth, create_repo（gh CLI + 進捗イベント） |
| **`scripts.rs`** | list/add/update/remove_script, run_script（GitCommandResult を返す） |
| **`backup.rs`** | export_data, preview_backup, import_data（単一 JSON 全置換） |
| `settings.rs` | get/update_settings, open_in_editor/terminal, editor CRUD, open_url |

---

## 詳細ドキュメント

- `spec/RepoHub — 仕様・設計書.md` — 全機能要件・型定義・コマンド仕様
- `docs/improvement-considerations.md` — 改善検討メモ（未実装・調査結果の継続追記）
- `docs/development-workflow.md` — コードパターン集・デバッグ方法
- `docs/development-setup.md` — 環境構築手順
- `README.md` — アーキテクチャ概要・ディレクトリ構成
