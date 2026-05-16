# Cloudflare Pages デプロイ（LP）

ランディングページ（`landing/`）は **Cloudflare Pages**（`*.pages.dev`）で公開する。  
**Workers Builds / `*.workers.dev` は使わない**（Tauri ルートの Vite と二重検出されやすく、`_redirects` も制約が異なる）。

---

## 正しい作成手順（初回）

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/) → **Workers & Pages**
2. **Create** → タブで **Pages** を選ぶ（**Workers ではない**）
3. **Connect to Git** → `anonym-studio/Repo-Naut`
4. ビルド設定:

| 項目 | 値 |
|------|-----|
| Production branch | `main` |
| Framework preset | **None** |
| Root directory | `landing` |
| Build command | `pnpm install && pnpm run build` |
| Build output directory | `dist` |

5. 環境変数（推奨）: `NODE_VERSION` = `20`、`PNPM_VERSION` = `10`
6. **Save and Deploy**

本番 URL の例: `https://<プロジェクト名>.pages.dev`

---

## Workers（`*.workers.dev`）から移行する場合

いま `https://reponaut.agenda23.workers.dev/` のように **Workers** で出ている場合:

### 1. Pages プロジェクトを新規作成

上記「正しい作成手順」どおり、**Pages** として別プロジェクトを作る（例: プロジェクト名 `reponaut` → `https://reponaut.pages.dev`）。

### 2. 動作確認

- `https://<project>.pages.dev` で LP が表示されること
- ダウンロードリンクが GitHub Releases に飛ぶこと

### 3. カスタムドメイン（任意）

- **Pages プロジェクト** → **Custom domains** でドメインを追加
- 以前 Workers に向けていた DNS / ルートは **Pages 側**に付け替える

### 4. 旧 Workers プロジェクトの整理

- **Workers & Pages** → 該当 Worker（`reponaut` 等）→ 設定
- Git 連携を切る、またはプロジェクトを削除（誤デプロイ防止）
- `*.workers.dev` は使わない旨をチームで共有

リポジトリ内に `wrangler.jsonc` をコミットしている場合は、LP 用に不要なら削除する（現状 Repo-Naut には含めない）。

---

## よくある失敗

| 症状 | 原因 | 対処 |
|------|------|------|
| `PNPM + Vite` が2つ検出 | Root がリポジトリ直下 | Root を `landing` に |
| `_redirects` infinite loop | Workers へデプロイ | Pages を使う、または `_redirects` を置かない（現状 LP は不要） |
| URL が `*.workers.dev` | Workers Builds で作成した | **Pages** プロジェクトを新規作成 |

---

## ローカル確認

```bash
pnpm landing:build
pnpm landing:preview
```

---

## 参照

- [Cloudflare Pages — Monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [`spec/ランディングページ — 仕様・設計書.md`](../spec/ランディングページ%20—%20仕様・設計書.md) セクション 12
