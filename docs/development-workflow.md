# 開発ワークフロー

## 毎日の開発開始

```bash
pnpm tauri dev
```

初回以外は差分ビルドのため数秒で起動する。Rustファイルを変更すると自動で再ビルドが走る。フロントエンドの変更はHMRで即時反映される。

---

## 機能追加の手順

### フロントエンドのみの機能（UIコンポーネント等）

```
src/types/index.ts       ← 1. 型を追加・確認
src/hooks/useXxx.ts      ← 2. データ取得・更新Hookを作成
src/components/xxx/      ← 3. コンポーネントを実装
src/pages/Xxx.tsx        ← 4. ページに組み込む
```

### Tauriコマンドを伴う機能（フルスタック）

```
src-tauri/src/models.rs          ← 1. Rust型を定義
src-tauri/src/commands/xxx.rs    ← 2. コマンドを実装
src-tauri/src/lib.rs             ← 3. generate_handler![] に登録（忘れると "command not found"）
src/types/index.ts               ← 4. TypeScript型を追加（Rust型と同期）
src/hooks/useXxx.ts              ← 5. Hookを作成
```

**チェックリスト（新Tauriコマンド追加時）**
- [ ] `models.rs` に型を追加
- [ ] `commands/*.rs` にコマンド実装
- [ ] `lib.rs` の `generate_handler![]` に追加
- [ ] `src/types/index.ts` に対応するTypeScript型を追加
- [ ] `src/hooks/` にHookを作成

---

## 型の同期ルール

RustとTypeScriptで同じデータ構造を二重定義している。**どちらかを変更したら必ず両方更新する。**

| 場所 | ファイル | 命名規則 |
|------|----------|----------|
| Rust型定義 | `src-tauri/src/models.rs` | `snake_case` |
| TypeScript型定義 | `src/types/index.ts` | `camelCase` |

`#[serde(rename_all = "camelCase")]` により、Rustの `snake_case` フィールドはJSONシリアライズ時に `camelCase` に自動変換される。

---

## コードパターン集

### データ取得Hook

```typescript
// src/hooks/useXxx.ts
import { useQuery } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { SomeType } from '../types'

export function useXxx(param: string) {
  return useQuery({
    queryKey: ['xxx', param],
    queryFn: () => invoke<SomeType>('command_name', { param }),
    enabled: !!param,
  })
}
```

### データ更新Hook（Mutation）

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

### Tauriイベントのリッスン（Rust → React）

```typescript
import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

useEffect(() => {
  const unlisten = listen<SomeType>('event_name', (event) => {
    console.log(event.payload)
  })
  return () => { unlisten.then((fn) => fn()) }
}, [])
```

実装例: `useWorkspaceWatcher`（`AppShell` でマウント）が `workspace_changed` を受信し、500ms debounce で `['repos']` クエリを invalidate する。Rust 側は `src-tauri/src/watcher.rs` の `notify::RecommendedWatcher` を `WatcherState`（`Arc<Mutex<Option<RecommendedWatcher>>>`）として `app.manage()` 保管し、`add_workspace` / `set_active_workspace` / `remove_workspace` の都度差し替える。

### ネイティブダイアログ（確認・ディレクトリ選択）

```typescript
import { ask, open } from '@tauri-apps/plugin-dialog'

const ok = await ask('本当に削除しますか？', { title: '確認', kind: 'warning' })
if (!ok) return

const dir = await open({ directory: true, multiple: false, title: 'フォルダ選択' })
if (typeof dir === 'string') {
  // 選択された絶対パスを利用
}
```

`window.confirm()` は使わず `ask()` を使う（プラットフォーム標準のモーダル）。新しいダイアログ系API（`save` / `message` / `confirm`）を追加するときは `src-tauri/capabilities/default.json` の `permissions` に `dialog:*` を加える必要がある点に注意。

### Rustコマンドのパターン

```rust
// src-tauri/src/commands/xxx.rs
use crate::models::SomeType;
use crate::store;
use tauri::AppHandle;

#[tauri::command]
pub async fn do_something(app: AppHandle, param: String) -> Result<SomeType, String> {
    let settings = store::load_settings(&app)?;  // ? でString化されたエラーを伝播
    // ...実装...
    Ok(result)
}
```

エラーは `.map_err(|e| e.to_string())` または `?` 演算子（`Result<T, String>` の文脈）でString化して返す。

### 新しいページを追加する

```tsx
// 1. src/pages/NewPage.tsx を作成
export function NewPage() {
  return <div>...</div>
}

// 2. src/router.tsx に追加
import { NewPage } from './pages/NewPage'
{ path: 'new-page', element: <NewPage /> }
```

---

## デバッグ方法

### フロントエンド
- `Cmd + Option + I` でブラウザDevToolsを開く（Tauriウィンドウ上で有効）
- React Query DevTools（推奨）を追加するとキャッシュ状態が可視化できる:
  ```bash
  pnpm add -D @tanstack/react-query-devtools
  ```
  ```tsx
  // src/main.tsx の QueryClientProvider 内に追加
  import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
  <ReactQueryDevtools initialIsOpen={false} />
  ```

### Rust / Tauri バックエンド
- `println!` / `eprintln!` / `dbg!()` の出力は `pnpm tauri dev` を実行したターミナルに表示される
- Rustのエラーは `Err("message".to_string())` でフロントエンドに伝わり、react-queryの `error` オブジェクト（`Error` 型）として取得できる
- Rustのパニックはターミナルにスタックトレースが出力される

### invoke のエラー確認（フロントエンド）

```typescript
const { data, error, isError } = useQuery({
  queryKey: ['xxx'],
  queryFn: () => invoke<SomeType>('command_name'),
})

if (isError) console.error(error) // エラーメッセージ（Rustが返したString）
```

---

## 型チェック・Lint

コミット前に実行:

```bash
pnpm type-check                                    # TypeScript型チェック
pnpm lint                                          # ESLint
cargo check --manifest-path src-tauri/Cargo.toml  # Rust型チェック
```

---

## Git運用

```bash
# フィーチャーブランチで作業
git checkout -b feature/repo-card

# こまめにコミット（型チェック通過後）
pnpm type-check && git add -p && git commit -m "feat: リポジトリカードの基本表示"

# mainにマージ
git checkout main && git merge feature/repo-card
```
