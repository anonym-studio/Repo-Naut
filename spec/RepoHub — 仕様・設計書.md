**バージョン**: 1.2.0  
**作成日**: 2026-05-13  
**更新日**: 2026-05-13  
**ステータス**: Draft

### 変更履歴

|バージョン|内容|
|---|---|
|1.0.0|初版作成|
|1.1.0|リポジトリ作成機能（`gh` CLI連携）・エディタ起動機能（複数エディタ登録・プリセット）を追加|
|1.2.0|アプリ表示名を Repo-Naut に変更（`identifier`・データディレクトリは後方互換のため従来どおり）|

---

## 目次

1. [プロジェクト概要](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#1-%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E6%A6%82%E8%A6%81)
2. [技術スタック](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#2-%E6%8A%80%E8%A1%93%E3%82%B9%E3%82%BF%E3%83%83%E3%82%AF)
3. [機能要件](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#3-%E6%A9%9F%E8%83%BD%E8%A6%81%E4%BB%B6)
    - 3-11. [リポジトリ作成（gh CLI連携）](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#3-11-%E3%83%AA%E3%83%9D%E3%82%B8%E3%83%88%E3%83%AA%E4%BD%9C%E6%88%90gh-cli%E9%80%A3%E6%90%BA)
    - 3-9. [エディタ起動（複数エディタ対応）](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#3-9-%E5%A4%96%E9%83%A8%E3%82%A2%E3%83%97%E3%83%AA%E9%80%A3%E6%90%BA)
4. [画面設計](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#4-%E7%94%BB%E9%9D%A2%E8%A8%AD%E8%A8%88)
5. [データモデル](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#5-%E3%83%87%E3%83%BC%E3%82%BF%E3%83%A2%E3%83%87%E3%83%AB)
6. [データ永続化設計](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#6-%E3%83%87%E3%83%BC%E3%82%BF%E6%B0%B8%E7%B6%9A%E5%8C%96%E8%A8%AD%E8%A8%88)
7. [Tauriコマンド設計](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#7-tauri%E3%82%B3%E3%83%9E%E3%83%B3%E3%83%89%E8%A8%AD%E8%A8%88)
8. [ディレクトリ構成](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#8-%E3%83%87%E3%82%A3%E3%83%AC%E3%82%AF%E3%83%88%E3%83%AA%E6%A7%8B%E6%88%90)
9. [開発フェーズ](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#9-%E9%96%8B%E7%99%BA%E3%83%95%E3%82%A7%E3%83%BC%E3%82%BA)
10. [未決定事項・拡張候補](https://claude.ai/chat/f34d1b38-daf4-4128-9732-ff51e5f146e1#10-%E6%9C%AA%E6%B1%BA%E5%AE%9A%E4%BA%8B%E9%A0%85%E6%8B%A1%E5%BC%B5%E5%80%99%E8%A3%9C)

---

## 1. プロジェクト概要

### 1-1. サマリー

|項目|内容|
|---|---|
|アプリ名|**Repo-Naut**|
|目的|ローカルの複数リポジトリを格納するworkspaceディレクトリを一元管理するデスクトップアプリ|
|ターゲット|個人開発者・フリーランスエンジニア|
|対応OS|Windows 10+、macOS 12+|
|フレームワーク|Tauri v2 + React + TypeScript|

### 1-2. ユースケース概要

- 複数のローカルリポジトリをカード形式で一覧把握する
- リモートリポジトリ（GitHub等）へのリンクをワンクリックで開く
- 最新コミット情報をアプリ内で確認し、該当コミットページへ直接ジャンプする
- 開発タスクをカンバンボードで管理する（リポジトリ横断）
- 古いリポジトリをアーカイブディレクトリへ移動して整理する
- `gh` CLIを通じてGitHubリポジトリを新規作成し、指定workspaceへ自動クローンする
- カードから登録済みエディタ（VS Code / Cursor 等）を直接起動する

---

## 2. 技術スタック

### 2-1. フロントエンド

|ライブラリ|用途|
|---|---|
|React 18 + TypeScript|UIフレームワーク|
|Vite|ビルドツール|
|Tailwind CSS v4|スタイリング|
|`@dnd-kit/core`|カンバンのドラッグ&ドロップ|
|`@tanstack/react-query`|Tauriコマンド呼び出しのキャッシュ管理|
|`zustand`|グローバルUIステート管理|
|`date-fns`|日時処理・相対時刻表示|
|`react-router-dom`|ページ遷移|

### 2-2. バックエンド (Rust / Tauri)

|クレート|用途|
|---|---|
|`git2`|libgit2バインディング（コミット・ブランチ・ahead/behind取得）|
|`serde` / `serde_json`|JSONシリアライズ・デシリアライズ|
|`notify`|ファイルシステムウォッチ（ディレクトリ変化をリアルタイム検知）|
|`reqwest`|GitHub API呼び出し（PAT連携有効時のみ）|
|`keyring`|OSキーチェーンへのPAT保存|
|`open`|ブラウザURL・外部エディタの起動|
|`tokio`|非同期ランタイム|
|`uuid`|リポジトリID生成|

### 2-3. データ保存

- **形式**: JSONファイル（SQLite不使用）
- **理由**: 想定データ量が合計300KB以下であり、外部DBは不要
    - リポジトリメタ: 最大200件 × 500B ≒ 100KB
    - カンバンタスク: 最大500件 × 300B ≒ 150KB
    - 設定: 〜5KB
- **保存先**: Tauri の `app_config_dir()` 配下（`tauri.conf.json` の `identifier` = `dev.repohub.app` を使用 ※表示名を Repo-Naut に変更しても識別子は互換のため維持）
    - macOS: `~/Library/Application Support/dev.repohub.app/`
    - Windows: `%APPDATA%\dev.repohub.app\`

---

## 3. 機能要件

### 3-1. Workspace管理

- 複数のルートディレクトリ（workspace）を登録・切替・削除できる
- 登録されたworkspace配下の `.git` ディレクトリを再帰検索し、リポジトリを自動検出する
- 起動時に自動スキャンし、`notify` crateでディレクトリ変化をリアルタイム反映する
- ネストされたリポジトリは除外オプションを設ける（例: `node_modules` 内のサブモジュール）

### 3-2. リポジトリカード一覧

各カードに表示する情報：

```
┌────────────────────────────────────────────┐
│ 🟢 my-app                     [React] [TS] │  ← ステータスバッジ + 言語タグ
│ feat: add login page                        │  ← 最新コミットメッセージ（クリックでGitHub該当ページへ）
│ @masataka · 2時間前                         │  ← author + 相対時刻
│ main  ↑2 ↓0  ●3 unstaged                  │  ← ブランチ名 + ahead/behind + 差分ファイル数
│ [GitHub ↗]      [Cursor ▾]  [+ 新規作成]  │  ← アクションボタン（▾でエディタ切替）
└────────────────────────────────────────────┘
```

- **ソート**: 最終コミット日時 / 名前 / 言語
- **フィルタ**: タグ / 言語 / ステータス（active / archived）/ アクティビティ（〇日以内）
- **表示切替**: カードビュー / コンパクトリストビュー
- **コミットSHA**: 先頭7文字を表示。クリックで `https://{host}/{user}/{repo}/commit/{SHA}` へ遷移

### 3-3. リモートリポジトリ連携

- `git remote get-url origin`相当の処理でURLを取得（`git2`経由）
- ホスト判別: `github.com` / `gitlab.com` / `bitbucket.org` / その他
- **GitHub PAT連携（選択式）**:
    - 設定画面でON/OFFを切替
    - PATはOSキーチェーン（`keyring` crate）に保存
    - 有効時: オープンPR数・Issue数をカードにバッジ表示
    - 無効時: リモートURLリンクのみ（git2で取得した情報のみ使用）

```
設定 > GitHub連携
  ┌────────────────────────────────────────────┐
  │ ● 連携しない（リモートURLリンクのみ）      │
  │ ○ GitHub PAT で連携する                   │
  │   [ghp_xxxxxxxxxxxx            ] [検証]    │
  │   ✓ 有効時: PR数・Issue数バッジを表示     │
  └────────────────────────────────────────────┘
```

### 3-4. カンバンボード

- **スコープ**: リポジトリ横断の一枚ボード
    
- **カラム構成（固定）**:
    
    |カラム|説明|
    |---|---|
    |`TODO`|未着手のタスク|
    |`In Progress`|作業中|
    |`Review`|レビュー待ち|
    |`Done`|完了|
    
- タスクカードのドラッグ&ドロップでカラム移動
    
- タスクには以下を設定可能:
    
    - タイトル / 説明（Markdown）
    - 紐付けリポジトリ（任意）
    - 優先度: `low` / `medium` / `high`
    - ラベル: `bug` / `feature` / `refactor` / `docs` / カスタム
    - 期日
    - コミットSHA / PRのURL

### 3-5. アーカイブ機能

- 指定リポジトリのディレクトリを workspace 内の `_archive/` サブディレクトリへ移動
- アーカイブ時に以下のメタデータをスナップショットとして保存:
    - 最終コミット SHA・メッセージ・日時
    - アーカイブ実行日時
    - 元のパス
- **復元**: アーカイブ一覧から元のパスへ移動。元パスが存在しない場合はダイアログで新パスを指定
- アーカイブ一覧は折り畳みセクションで表示（メインの一覧とは分離）

### 3-6. クイック操作

- カードのコンテキストメニューまたは詳細画面から以下を実行:
    - `git pull`
    - `git fetch`
    - ブランチ一覧表示・切替
- 実行結果（stdout / stderr）をポップアップで表示

### 3-7. タグ・メモ

- リポジトリに自由タグを複数付与（例: `client-A`, `OSS`, `archive-candidate`）
- メモ欄（Markdown対応、プレビュー表示）
- タグはフィルタリングに使用可能

### 3-8. グローバル検索

- `Cmd/Ctrl + K` でコマンドパレットを起動（トップバー右の「⌘K 検索」ボタンからも開ける）
- `Esc` で閉じる、`↑↓` で項目移動、`Enter` で選択
- 検索対象: リポジトリ名 / タグ / 現在ブランチ / タスク名・ラベル / 最新コミットメッセージ + SHA / 主要ナビゲーション項目
- 検索結果クリックで対応する画面へ遷移（コミットは該当リポジトリ詳細へ）

### 3-9. 外部アプリ連携

#### エディタ起動

カードのエディタボタンから、登録済みエディタでリポジトリを直接起動する。

**動作**:

- カードのエディタボタン（デフォルトエディタ名を表示）をクリック → 即時起動
- ボタン右の `▾` をクリック → 登録済みエディタ一覧をドロップダウン表示 → 選択して起動
- 起動コマンド: `{command} {repoPath}`（例: `cursor /Users/masataka/projects/my-app`）

**プリセットエディタ**（設定画面でワンクリック追加）:

|プリセット名|コマンド|備考|
|---|---|---|
|VS Code|`code`|デフォルト|
|Cursor|`cursor`||
|Windsurf|`windsurf`||
|Zed|`zed`||

**カスタムエディタ**:

- 名前・コマンド・引数を自由に登録可能
- 例: `{ name: "Antigravity", command: "antigravity", args: [] }`

**重複登録の扱い**:

- プリセット/カスタムを問わず、`command` が同一のエディタが既に登録されていれば追加せず既存を返す（プリセットボタン二度押しによる重複防止）
- 同じ `command` を別名で複数登録したい場合は、まず既存を削除してから追加する
- `defaultEditorId` が空の状態で初回追加された場合、そのエディタを自動的にデフォルトに設定する

**設定画面 UI**:

```
設定 > エディタ
  ┌────────────────────────────────────────────────┐
  │ 登録済みエディタ                               │
  │                                                │
  │  ● VS Code      code          [デフォルト]     │
  │  ○ Cursor       cursor        [デフォルトにする]│
  │  ○ Antigravity  antigravity   [デフォルトにする]│  ← カスタム登録
  │                                    [削除]       │
  │                                                │
  │  [+ プリセットから追加]  [+ カスタム追加]      │
  └────────────────────────────────────────────────┘
```

#### ターミナルで開く

- **macOS**: iTerm2（インストール済みの場合）/ デフォルトターミナル
- **Windows**: Windows Terminal / PowerShell / デフォルトシェル
- カスタムコマンドを設定可能

### 3-10. ダッシュボード

- 今週・今月のコミット数グラフ
- 言語分布（ファイル拡張子集計）
- 直近アクティブリポジトリランキング（Top 5）
- アーカイブ候補（90日以上コミットなし）のハイライト

### 3-11. リポジトリ作成（gh CLI連携）

`gh` CLI（GitHub CLI）を使用して、GitHubリポジトリの新規作成とローカルへのクローンをアプリ内から行う。

#### 前提条件

- `gh` CLIがシステムにインストール・認証済みであること
- 起動時に `gh auth status` で認証状態を確認し、未認証の場合はUI上に警告を表示
- `gh` のパスは自動検出（`PATH` 環境変数）、検出できない場合は設定画面で手動指定可能

#### 作成フロー

```
[Repos画面] → [+ 新規リポジトリ] ボタン
  ↓
┌────────────────────────────────────────────────┐
│ 新規リポジトリの作成                           │
│                                                │
│ リポジトリ名  [my-new-app              ]       │
│ 説明         [任意の説明文             ]       │
│ 公開設定      ● Public  ○ Private             │
│ クローン先    [/Users/masataka/projects ▾]    │  ← 登録済みworkspaceから選択
│                                                │
│ テンプレート  ○ なし  ○ README付き            │
│                                                │
│             [キャンセル]  [作成してクローン]   │
└────────────────────────────────────────────────┘
  ↓ 実行
  gh repo create {name} --{public|private} --clone --description "{desc}"
  cd {workspacePath} && gh repo clone {user}/{name}
  ↓
  カード一覧に即時反映（notify crateが検知）
```

#### 実行コマンド詳細

```bash
# Public リポジトリ作成 + クローン
gh repo create {name} --public --description "{desc}" --clone

# Private リポジトリ作成 + クローン  
gh repo create {name} --private --description "{desc}" --clone
```

実行は指定されたworkspaceディレクトリをカレントディレクトリとして行う（`Command::new("gh").current_dir(workspace_path)`）。

#### エラーハンドリング

|エラー|表示メッセージ|
|---|---|
|`gh` が見つからない|「GitHub CLI (gh) がインストールされていません。[インストール方法 ↗]」|
|未認証|「gh auth login が必要です。ターミナルで実行してください。」|
|リポジトリ名重複|ghのstderrをそのまま表示|
|ネットワークエラー|「通信エラーが発生しました。接続を確認してください。」|

---

### 4-1. 画面一覧

```
App
├── /                  ダッシュボード
├── /repos             リポジトリ一覧（カード / リスト）
│   └── [+ 新規リポジトリ] → 作成モーダル（gh CLI連携）
├── /repos/:id         リポジトリ詳細
│   ├── コミット履歴（最新50件）
│   ├── ブランチ一覧
│   └── 紐付きタスク
├── /kanban            カンバンボード
├── /archive           アーカイブ一覧
└── /settings          設定
    ├── Workspace登録
    ├── GitHub連携（PAT）
    ├── エディタ登録（プリセット / カスタム）
    ├── ターミナル設定
    ├── gh CLI パス設定
    └── テーマ設定
```

### 4-2. レイアウト

```
┌────────────────────────────────────────────────────────┐
│  [Repo-Naut]  [Dashboard] [Repos] [Kanban] [Archive] [⚙] │  ← トップナビゲーション
├────────────────────────────────────────────────────────┤
│  ⚠ gh が未認証 / 未インストール時の警告バナー（任意）  │  ← GhStatusBanner
├────────────┬───────────────────────────────────────────┤
│            │                                           │
│  Workspace │   メインコンテンツエリア                  │
│  セレクタ  │                                           │
│            │                                           │
│  [ws1 ▼]  │                                           │
│            │                                           │
└────────────┴───────────────────────────────────────────┘
```

### 4-3. 初回起動フロー（オンボーディング）

`settings.workspaces.length === 0` の状態で起動した場合、サイドバーとメインコンテンツの代わりに**オンボーディング画面**を全画面表示する：

```
┌────────────────────────────────────────────────────────┐
│  Repo-Naut へようこそ                                    │
│  まず Workspace を1つ登録してください。                │
│                                                        │
│  Workspace 名  [Personal                  ]            │
│  ルートパス    [/Users/you/projects       ]            │
│                                                        │
│              [登録してスキャン開始]                    │
└────────────────────────────────────────────────────────┘
```

- 登録成功後は `/repos` へ自動遷移し、即座にスキャン中のローディングを表示
- 1件目の Workspace は自動的に `activeWorkspaceId` に設定される
- 設定画面からの後追い追加も可能（同じ `add_workspace` コマンドを利用）

### 4-4. ローディングUIパターン

| シナリオ | 表示 |
|---|---|
| 起動時の `get_settings` 待ち | 画面中央に Spinner |
| `scan_workspace` 実行中 | Dashboard / Repos ページ内に Spinner + 説明文。トップバー右側に小さなインライン Spinner（`useIsFetching({ queryKey: ['repos'] })` で検知） |
| Workspace 追加中 | フォーム下に Spinner（"Workspaceを登録中..."） |
| gh CLI でのリポジトリ作成中 | モーダル内に進捗ログ（`create_repo_progress` イベント）と Spinner |
| カード上の Git 操作（pull/fetch） | 該当ボタン disabled + 完了後に GitResultModal |

Spinner は `src/components/common/Spinner.tsx` の単一コンポーネントを使用する。

### 4-5. テーマ適用方式

- Tailwind CSS v4 のクラスベース `dark:` バリアントを使用。`src/index.css` に `@custom-variant dark (&:where(.dark, .dark *))` を定義
- `useThemeSync` フック（`AppShell` でマウント）が `settings.theme` を購読し、`<html>` 要素の `dark` クラスを付け外す
    - `'light'`: `dark` クラスを除去
    - `'dark'`: `dark` クラスを付与
    - `'system'`: `prefers-color-scheme: dark` メディアクエリに追従。OS設定変更時も自動で切り替わる

---

## 5. データモデル

### 5-1. TypeScript型定義

```typescript
// ---- リポジトリ ----
type Repository = {
  id: string;                  // パスのハッシュ値
  name: string;                // ディレクトリ名
  path: string;                // ローカル絶対パス
  workspaceId: string;
  remoteUrl?: string;
  platform?: 'github' | 'gitlab' | 'bitbucket' | 'other';
  // git2から取得（メモリ保持、永続化しない）
  latestCommit?: Commit;
  currentBranch?: string;
  branches?: string[];
  ahead?: number;
  behind?: number;
  unstagedCount?: number;
  // ユーザー定義メタ（永続化）
  tags: string[];
  note?: string;
  language: string[];          // 拡張子から集計
  status: 'active' | 'archived';
  archivedAt?: string;         // ISO 8601
  archiveMeta?: ArchiveMeta;
};

type Commit = {
  sha: string;
  shortSha: string;            // 先頭7文字
  message: string;
  author: string;
  date: string;                // ISO 8601
};

type ArchiveMeta = {
  originalPath: string;
  lastCommitSha: string;
  lastCommitMessage: string;
  lastCommitDate: string;
  archivedAt: string;
};

// ---- Workspace ----
type Workspace = {
  id: string;
  name: string;
  path: string;
  archiveDirName: string;      // デフォルト: "_archive"
  createdAt: string;
};

// ---- タスク (カンバン) ----
type Task = {
  id: string;
  repoId?: string;             // null = グローバルタスク
  title: string;
  description?: string;        // Markdown
  column: 'todo' | 'in_progress' | 'review' | 'done';
  order: number;               // カラム内の表示順
  priority: 'low' | 'medium' | 'high';
  labels: string[];
  dueDate?: string;
  commitSha?: string;
  prUrl?: string;
  createdAt: string;
  updatedAt: string;
};

// ---- GitHub API (PAT有効時) ----
type GitHubStats = {
  openPrCount: number;
  openIssueCount: number;
  fetchedAt: string;
};

// ---- エディタ設定 ----
type EditorPreset = 'vscode' | 'cursor' | 'windsurf' | 'zed' | 'custom';

type EditorConfig = {
  id: string;
  name: string;                // 表示名（例: "Cursor"）
  command: string;             // 実行コマンド（例: "cursor"）
  args: string[];              // 追加引数（通常は空。パスは自動付与）
  preset?: EditorPreset;       // プリセット由来の場合に設定
};

// ---- 設定 ----
type Settings = {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  github: {
    enabled: boolean;
    // PATはOSキーチェーンに保存するため、ここには含まない
  };
  editors: EditorConfig[];     // 登録済みエディタ一覧
  defaultEditorId: string;     // デフォルトエディタのID
  gh: {
    path?: string;             // gh CLIパス（null = PATH自動検出）
  };
  terminal: {
    command?: string;          // 設定があれば最優先で使用される（cwd でリポジトリを開く）
    preset:
      | 'auto'                 // macOS: iTerm2→Terminal.app、Windows: wt→cmd を自動選択
      | 'iterm2'
      | 'terminal_app'
      | 'windows_terminal'
      | 'cmd'
      | 'custom';
  };
  theme: 'light' | 'dark' | 'system';
  commitHistoryLimit: number;  // デフォルト: 50
  excludedDirs: string[];      // ユーザー定義のスキャン除外ディレクトリ名（node_modules等は既定で除外）
};
```

---

## 6. データ永続化設計

### 6-1. ファイル構成

```
~/Library/Application Support/dev.repohub.app/   # macOS
%APPDATA%\dev.repohub.app\                       # Windows
├── settings.json           # Workspace登録・テーマ・エディタ設定等
├── repos-meta.json         # リポジトリのタグ・メモ・アーカイブ状態
└── kanban.json             # カンバンタスク全件
```

### 6-2. 各ファイルのスキーマ

**settings.json**

```json
{
  "workspaces": [
    {
      "id": "uuid-v4",
      "name": "Personal",
      "path": "/Users/masataka/projects",
      "archiveDirName": "_archive",
      "createdAt": "2026-05-13T00:00:00Z"
    }
  ],
  "activeWorkspaceId": "uuid-v4",
  "github": { "enabled": false },
  "editors": [
    {
      "id": "uuid-v4-1",
      "name": "VS Code",
      "command": "code",
      "args": [],
      "preset": "vscode"
    },
    {
      "id": "uuid-v4-2",
      "name": "Cursor",
      "command": "cursor",
      "args": [],
      "preset": "cursor"
    },
    {
      "id": "uuid-v4-3",
      "name": "Antigravity",
      "command": "antigravity",
      "args": []
    }
  ],
  "defaultEditorId": "uuid-v4-2",
  "gh": { "path": null },
  "terminal": { "command": null },
  "theme": "system",
  "commitHistoryLimit": 50
}
```

**repos-meta.json**

```json
{
  "repos": {
    "{repo-id}": {
      "tags": ["OSS", "active"],
      "note": "## メモ\nメインプロジェクト",
      "status": "active",
      "archivedAt": null,
      "archiveMeta": null
    }
  }
}
```

**kanban.json**

```json
{
  "tasks": [
    {
      "id": "uuid-v4",
      "repoId": "{repo-id}",
      "title": "ログイン画面の実装",
      "description": "## 概要\nJWT認証を実装する",
      "column": "in_progress",
      "order": 0,
      "priority": "high",
      "labels": ["feature"],
      "dueDate": "2026-05-20",
      "commitSha": null,
      "prUrl": null,
      "createdAt": "2026-05-13T00:00:00Z",
      "updatedAt": "2026-05-13T00:00:00Z"
    }
  ]
}
```

### 6-3. 書き込みポリシー

- **読み取り**: 起動時に全ファイルをメモリへロード
- **書き込み**: 変更発生時に該当ファイルのみ上書き保存（atomic write: 一時ファイル書き込み → リネーム）
- **バックアップ**: 起動時に `.bak` ファイルを生成（直近1世代）
- **競合**: シングルウィンドウのためロック不要

---

## 7. Tauriコマンド設計

### 7-1. Workspace

```typescript
// Workspace登録・スキャン
invoke('scan_workspace', { path: string }) → Repository[]
invoke('add_workspace', { name: string, path: string }) → Workspace
invoke('remove_workspace', { id: string }) → void
invoke('set_active_workspace', { id: string }) → void
```

### 7-2. Repository

```typescript
// リポジトリ情報取得
invoke('get_repo_detail', { path: string }) → RepoDetail  // commits[], branches[]
invoke('update_repo_meta', { id: string, meta: Partial<RepoMeta> }) → void
invoke('read_readme', { path: string }) → ReadmeContent  // README.md を 5MB まで読み込み

// 直近 N 日のコミット数集計（アクティブ workspace 内の全リポ。デフォルト 30 日）
invoke('get_commit_activity', { days?: number }) → CommitActivity
// type CommitActivity = { days: number; total: number; series: { date: 'YYYY-MM-DD'; count: number }[] }

// アーカイブ（path はカード側で既知のため一緒に渡す。サーバ側の再スキャンを省略）
invoke('archive_repo', { id: string, path: string }) → void   // ファイル移動 + meta更新
invoke('restore_repo', { id: string, path: string, targetPath?: string }) → void
```

### 7-3. Git操作

```typescript
invoke('git_pull', { path: string }) → GitCommandResult
invoke('git_fetch', { path: string }) → GitCommandResult
invoke('git_checkout', { path: string, branch: string }) → GitCommandResult

type GitCommandResult = {
  success: boolean;
  stdout: string;
  stderr: string;
};
```

### 7-4. Kanban

```typescript
invoke('get_tasks') → Task[]
invoke('create_task', { task: NewTask }) → Task
invoke('update_task', { id: string, patch: Partial<Task> }) → Task
invoke('delete_task', { id: string }) → void
invoke('move_task', { id: string, column: Column, order: number }) → void
```

### 7-5. GitHub API

```typescript
invoke('get_github_stats', { owner: string, repo: string }) → GitHubStats
// GitHubStats = { openPrCount: number; openIssueCount: number; fetchedAt: string }

invoke('has_pat') → boolean                       // keychain に PAT が保存されているか
invoke('validate_pat', { pat: string }) → PatValidation
invoke('validate_stored_pat') → PatValidation     // 保存済み PAT で接続テスト
// PatValidation = { valid: boolean; login?: string; scopes?: string; message?: string }
invoke('save_pat', { pat: string }) → void        // OSキーチェーンへ保存
invoke('delete_pat') → void                       // PAT を削除（存在しなくても成功）
invoke('delete_pat') → void
```

### 7-6. 設定・外部連携

```typescript
// 設定
invoke('get_settings') → Settings
invoke('update_settings', { patch: Partial<Settings> }) → void

// エディタ起動
invoke('open_in_editor', {
  path: string,
  editorId?: string   // 省略時はdefaultEditorIdを使用
}) → void

// エディタ管理
invoke('add_editor', { config: Omit<EditorConfig, 'id'> }) → EditorConfig
invoke('remove_editor', { id: string }) → void
invoke('set_default_editor', { id: string }) → void

// gh CLI
invoke('check_gh_auth') → GhAuthStatus   // 起動時チェック
invoke('create_repo', {
  name: string,
  description?: string,
  visibility: 'public' | 'private',
  workspaceId: string,
  withReadme: boolean
}) → CreateRepoResult

type GhAuthStatus = {
  installed: boolean;    // gh がPATHに存在するか
  authenticated: boolean;
  username?: string;
};

type CreateRepoResult = {
  success: boolean;
  repoUrl?: string;     // 成功時: https://github.com/user/repo
  localPath?: string;   // 成功時: クローン先パス
  error?: string;       // 失敗時: ghのstderr
};

// ターミナル・URL
invoke('open_in_terminal', { path: string }) → void
invoke('open_url', { url: string }) → void
```

### 7-7. Tauriイベント（Rust → React）

```typescript
// ファイルシステム変化検知（notify crate）
// payload は { workspaceId, workspacePath, reason } の camelCase オブジェクト
// Rust側で 800ms debounce、`.git/HEAD` と `.git/refs/heads/` の変更のみ通知
// （`.git/` 配下のオブジェクト書込みや node_modules / target / dist 等のノイズは無視）
// フロントエンドは受信したら `queryClient.invalidateQueries({ queryKey: ['repos'] })` で再スキャンする
listen('workspace_changed', handler: (event: {
  payload: { workspaceId: string; workspacePath: string; reason: string }
}) => void)

// git操作の進捗通知
listen('git_progress', handler: (msg: string) => void)

// リポジトリ作成進捗（gh clone中のストリーミング出力）
listen('create_repo_progress', handler: (line: string) => void)

// gh認証状態変化（ターミナルでgh auth loginした場合を想定した再チェック）
listen('gh_auth_changed', handler: (status: GhAuthStatus) => void)
```

---

## 8. ディレクトリ構成

```
repo-naut/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── src/
│       ├── main.rs
│       ├── models.rs              # 共通型定義（Rust側）
│       ├── store.rs               # JSONファイル読み書きユーティリティ
│       └── commands/
│           ├── mod.rs
│           ├── workspace.rs       # scan_workspace, add/remove_workspace
│           ├── git.rs             # get_repo_detail, git_pull/fetch/checkout
│           ├── archive.rs         # archive_repo, restore_repo
│           ├── kanban.rs          # get/create/update/delete/move task
│           ├── github.rs          # get_github_stats, validate_pat
│           ├── repo_create.rs     # check_gh_auth, create_repo（gh CLI実行）
│           └── settings.rs        # get/update_settings, open_in_editor/terminal 等
│       └── watcher.rs              # notify による workspace 監視（workspace_changed 発火）
│
└── src/
    ├── main.tsx
    ├── router.tsx                  # createHashRouter（Tauri用にhash必須）
    ├── index.css
    ├── pages/
    │   ├── Dashboard.tsx
    │   ├── Repos.tsx
    │   ├── RepoDetail.tsx
    │   ├── Kanban.tsx
    │   ├── Archive.tsx
    │   └── Settings.tsx
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx           # 起動時のオンボーディングガードを担当
    │   │   ├── TopNav.tsx             # グローバルスキャンインジケータ表示
    │   │   ├── WorkspaceSelector.tsx
    │   │   ├── GhStatusBanner.tsx     # gh CLI未認証時の警告バナー
    │   │   └── Onboarding.tsx         # 初回起動時の Workspace 登録画面
    │   ├── repo/
    │   │   ├── RepoCard.tsx
    │   │   ├── RepoList.tsx
    │   │   ├── RepoFilter.tsx
    │   │   ├── EditorButton.tsx       # デフォルトエディタ起動 + ▾ドロップダウン
    │   │   └── CreateRepoModal.tsx    # リポジトリ作成モーダル
    │   ├── kanban/
    │   │   ├── KanbanBoard.tsx
    │   │   ├── KanbanColumn.tsx
    │   │   ├── TaskCard.tsx
    │   │   └── TaskFormModal.tsx      # タスク作成・編集モーダル
│   └── common/
│       ├── Spinner.tsx            # 全画面共通のローディング表示
│       ├── Toaster.tsx            # 成功・エラー通知（ask() ダイアログの結果通知に使用）
│       ├── CommandPalette.tsx     # Cmd/Ctrl+K のグローバル検索（recent / nav / repo / commit / task）
│       └── MarkdownPreview.tsx    # react-markdown ベース。タスク説明・リポジトリメモで使用
├── hooks/
│   ├── useRepos.ts            # scan_workspace / get_repo_detail / update_repo_meta
│   ├── useWorkspaces.ts       # add_workspace / remove_workspace
│   ├── useArchive.ts          # archive_repo / restore_repo
│   ├── useTasks.ts
│   ├── useGitOps.ts
│   ├── useEditor.ts           # エディタ起動・登録管理
│   ├── useRepoCreate.ts       # gh CLI連携・進捗ストリーム
│   ├── useThemeSync.ts        # settings.theme を <html>.dark へ反映
│   ├── useWorkspaceWatcher.ts # workspace_changed イベント → repos クエリ無効化
│   └── useSettings.ts
    └── store/
        └── useAppStore.ts         # zustand（UI状態: フィルタ・選択中repo等）
```

---

## 9. 開発フェーズ

### Phase 1: MVP（2〜3週）

- [x] Tauri v2 + React + Tailwind のプロジェクトセットアップ
- [x] Workspace登録・`git2`によるリポジトリスキャン
- [x] リポジトリカード一覧表示（コミット情報・リモートURLリンク）
- [x] JSON store（settings / repos-meta）の読み書き
- [x] `notify` crate によるディレクトリ監視（`workspace_changed` イベント発火 + 自動再スキャン、800ms debounce、`.git/HEAD` と `.git/refs/heads/` のみリスニング）
- [x] 起動時 `gh auth status` チェック・ステータス表示
- [x] **オンボーディング画面**（Workspace未登録時に全画面表示）

### Phase 2: v1.0（+2〜3週）

- [x] カンバンボード（D&D、タスクCRUD）
- [x] コミットSHA → GitHubコミットページへのリンク
- [x] アーカイブ / 復元機能
- [x] **エディタ起動機能**（プリセット登録・デフォルト設定・カードの▾ドロップダウン）
- [x] **リポジトリ作成機能**（gh CLI連携・作成モーダル・クローン進捗表示）
- [x] ターミナル連携（macOS: iTerm2→Terminal.app、Windows: Windows Terminal→cmd の自動優先 + プリセット選択 + カスタムコマンド）
- [x] タグ・メモ編集UI（リポジトリ詳細から編集モード、Markdown プレビュー対応）
- [x] スキャン除外ディレクトリ設定UI（ユーザー定義の追加除外）
- [x] フィルタ / ソート / 表示切替

### Phase 3: v1.1（+2週）

- [x] GitHub PAT連携（選択式）/ PR数・Issue数バッジ
- [x] ダッシュボード（言語分布・直近アクティブTop5・アーカイブ候補・直近30日のコミット数ヒートマップ）
- [x] グローバル検索（`Cmd/Ctrl + K`）

### Phase 4: v1.2（+1〜2週）

- [x] `git pull` / `git fetch` / ブランチ切替のUI実行（成功/失敗を `GitResultModal` で表示）
- [ ] カスタムスクリプト登録・ワンクリック実行
- [ ] `tauri-plugin-updater` による自動アップデート
- [ ] データのエクスポート / インポート

---

## 10. 未決定事項・拡張候補

### 10-1. 未決定事項

|項目|選択肢|暫定方針|
|---|---|---|
|テーマカラー|ダーク系 / ライト系 / システム追従|システム追従 + 手動切替|
|コミット履歴件数|10 / 50 / 無制限|最新50件（設定変更可）|
|ウィンドウ構成|シングル / マルチ|シングルウィンドウ|
|`_archive` ディレクトリ名|固定 / 設定変更可|設定変更可（デフォルト: `_archive`）|

### 10-2. 拡張候補（v2以降）

- **SQLite移行**: タスク1000件超・全文検索が必要になった場合
- **GitLab / Bitbucket API対応**: GitHub以外のホスティングサービス連携
- **SSH / HTTPS認証管理**: プライベートリポジトリのpull/fetch対応
- **Gitフロー可視化**: ブランチグラフの表示
- **通知機能**: CI/CD結果・PRレビュー依頼の通知
- **チーム共有**: `kanban.json` をGit管理下に置いてチームで同期

---

_このドキュメントは Repo-Naut（旧称 RepoHub）の実装開始前の設計書です。実装を進める中で随時更新してください。_