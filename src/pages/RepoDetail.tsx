import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRepos, useRepoDetail, useUpdateRepoMeta } from '../hooks/useRepos'
import { useGitPull, useGitFetch, useGitCheckout } from '../hooks/useGitOps'
import { useTasks } from '../hooks/useTasks'
import { EditorButton } from '../components/repo/EditorButton'
import { ReadmeModal } from '../components/repo/ReadmeModal'
import { ScriptRunButton } from '../components/repo/ScriptRunButton'
import { MarkdownPreview } from '../components/common/MarkdownPreview'
import { GitResultModal, type GitResult } from '../components/common/GitResultModal'
import { TaskFormModal } from '../components/kanban/TaskFormModal'
import { toast } from '../store/useToast'
import { useAppStore } from '../store/useAppStore'
import type { Repository, Task } from '../types'

export function RepoDetail() {
  const { id } = useParams<{ id: string }>()
  const { repos } = useRepos()
  const repo = repos.find((r) => r.id === id)
  const detail = useRepoDetail(repo?.path ?? '')
  const { tasks } = useTasks()
  const linkedTasks = tasks.filter((t) => t.repoId === id)
  const pushRecent = useAppStore((s) => s.pushRecentRepo)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const [gitResult, setGitResult] = useState<GitResult | null>(null)
  // GitResultModal の「もう一度実行」用に最後の操作を覚えておく
  const [lastGitOp, setLastGitOp] = useState<(() => void) | null>(null)

  useEffect(() => {
    if (repo?.id) pushRecent(repo.id)
  }, [repo?.id, pushRecent])

  const pull = useGitPull()
  const fetch = useGitFetch()
  const checkout = useGitCheckout()

  const runPull = () => {
    if (!repo) return
    setLastGitOp(() => runPull)
    pull.mutate(repo.path, {
      onSuccess: (result) => setGitResult({ command: 'pull', result }),
      onError: (e) => toast.error(`git pull に失敗: ${(e as Error).message}`),
    })
  }
  const runFetch = () => {
    if (!repo) return
    setLastGitOp(() => runFetch)
    fetch.mutate(repo.path, {
      onSuccess: (result) => setGitResult({ command: 'fetch', result }),
      onError: (e) => toast.error(`git fetch に失敗: ${(e as Error).message}`),
    })
  }
  const runCheckout = (branch: string) => {
    if (!repo) return
    const op = () => runCheckout(branch)
    setLastGitOp(() => op)
    checkout.mutate(
      { path: repo.path, branch },
      {
        onSuccess: (result) =>
          setGitResult({ command: 'checkout', context: branch, result }),
        onError: (e) => toast.error(`git checkout に失敗: ${(e as Error).message}`),
      },
    )
  }

  if (!repo) {
    return (
      <div>
        <Link to="/repos" className="text-sm text-blue-600 hover:underline">
          ← Repos
        </Link>
        <p className="mt-4 text-sm text-gray-500">リポジトリが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/repos" className="text-sm text-blue-600 hover:underline">
          ← Repos
        </Link>
        <h1 className="text-2xl font-bold mt-2">{repo.name}</h1>
        <p className="text-xs text-gray-500" title={repo.path}>
          {repo.path}
        </p>
      </div>

      <section className="flex flex-wrap items-center gap-2">
        <EditorButton repoPath={repo.path} />
        <button
          type="button"
          onClick={() => invoke('open_in_terminal', { path: repo.path }).catch(console.error)}
          className={btnCls}
        >
          Terminal
        </button>
        {repo.hasReadme && (
          <button
            type="button"
            onClick={() => setReadmeOpen(true)}
            className="text-xs border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            README
          </button>
        )}
        <button
          type="button"
          onClick={runPull}
          disabled={pull.isPending}
          className={btnCls}
        >
          {pull.isPending ? 'pull 中...' : 'git pull'}
        </button>
        <button
          type="button"
          onClick={runFetch}
          disabled={fetch.isPending}
          className={btnCls}
        >
          {fetch.isPending ? 'fetch 中...' : 'git fetch'}
        </button>
        {repo.remoteUrl && (
          <button
            type="button"
            onClick={() =>
              invoke('open_url', { url: remoteWebUrl(repo.remoteUrl!) }).catch(console.error)
            }
            className={btnCls}
          >
            Remote ↗
          </button>
        )}
        <ScriptRunButton repoPath={repo.path} />
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">ブランチ</h2>
        <div className="flex flex-wrap gap-2">
          {(detail.data?.branches ?? repo.branches ?? []).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => runCheckout(b)}
              disabled={checkout.isPending}
              className={`text-xs font-mono px-2 py-1 rounded border ${
                b === repo.currentBranch
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-2">最新コミット履歴</h2>
        {detail.isLoading && <p className="text-xs text-gray-500">読み込み中...</p>}
        {detail.isError && (
          <p className="text-xs text-red-600">{(detail.error as Error).message}</p>
        )}
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {(detail.data?.commits ?? []).map((c) => {
            const commitUrl =
              repo.remoteUrl && `${remoteWebUrl(repo.remoteUrl)}/commit/${c.sha}`
            return (
              <li key={c.sha} className="py-2 flex items-baseline gap-3">
                <button
                  type="button"
                  onClick={() => commitUrl && invoke('open_url', { url: commitUrl })}
                  className="font-mono text-xs px-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={!commitUrl}
                >
                  {c.shortSha}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" title={c.message}>
                    {c.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    @{c.author} ·{' '}
                    {safeRelative(c.date)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <header className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">紐付きタスク</h2>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null)
              setTaskFormOpen(true)
            }}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-0.5"
          >
            + タスク追加
          </button>
        </header>
        {linkedTasks.length === 0 ? (
          <p className="text-xs text-gray-500">紐付いているタスクはありません</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {linkedTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">[{t.column}]</span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(t)
                    setTaskFormOpen(true)
                  }}
                  className="text-left hover:underline truncate"
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <RepoMetaSection repo={repo} />

      <TaskFormModal
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        task={editingTask}
        defaultColumn="todo"
        defaultRepoId={repo.id}
      />

      <ReadmeModal
        open={readmeOpen}
        onClose={() => setReadmeOpen(false)}
        repoName={repo.name}
        repoPath={repo.path}
      />

      <GitResultModal
        open={!!gitResult}
        onClose={() => setGitResult(null)}
        result={gitResult}
        onRetry={lastGitOp ?? undefined}
        retrying={pull.isPending || fetch.isPending || checkout.isPending}
      />
    </div>
  )
}

interface MetaDraft {
  tagsInput: string
  note: string
  savedAt: number
}

const draftKey = (repoId: string) => `reponaut.metaDraft.${repoId}`

function loadDraft(repoId: string): MetaDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(repoId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as MetaDraft
    if (typeof parsed.tagsInput !== 'string' || typeof parsed.note !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function saveDraft(repoId: string, draft: MetaDraft) {
  try {
    localStorage.setItem(draftKey(repoId), JSON.stringify(draft))
  } catch {
    /* ignore quota errors */
  }
}

function clearDraft(repoId: string) {
  try {
    localStorage.removeItem(draftKey(repoId))
  } catch {
    /* noop */
  }
}

function RepoMetaSection({ repo }: { repo: Repository }) {
  const [editing, setEditing] = useState(false)
  const [tagsInput, setTagsInput] = useState(repo.tags.join(', '))
  const [note, setNote] = useState(repo.note ?? '')
  const [draftInfo, setDraftInfo] = useState<MetaDraft | null>(null)
  const update = useUpdateRepoMeta()

  // リポジトリ切替時、サーバーの値をベースに reset しつつ、未保存下書きがあれば通知する
  useEffect(() => {
    setTagsInput(repo.tags.join(', '))
    setNote(repo.note ?? '')
    setEditing(false)

    const draft = loadDraft(repo.id)
    const serverTags = repo.tags.join(', ')
    const serverNote = repo.note ?? ''
    // サーバー値と一致している下書きは無効化（古い残骸を消す）
    if (draft && draft.tagsInput === serverTags && draft.note === serverNote) {
      clearDraft(repo.id)
      setDraftInfo(null)
    } else {
      setDraftInfo(draft)
    }
  }, [repo.id, repo.tags, repo.note])

  // 編集中は 800ms debounce で localStorage に下書きを書き込む
  useEffect(() => {
    if (!editing) return
    const handle = setTimeout(() => {
      saveDraft(repo.id, { tagsInput, note, savedAt: Date.now() })
    }, 800)
    return () => clearTimeout(handle)
  }, [editing, tagsInput, note, repo.id])

  const handleSave = () => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    update.mutate(
      { id: repo.id, meta: { tags, note: note || undefined } },
      {
        onSuccess: () => {
          setEditing(false)
          clearDraft(repo.id)
          setDraftInfo(null)
          toast.success('タグ・メモを保存しました')
        },
        onError: (e) => toast.error(`保存に失敗: ${(e as Error).message}`),
      },
    )
  }

  const handleCancel = () => {
    setTagsInput(repo.tags.join(', '))
    setNote(repo.note ?? '')
    setEditing(false)
  }

  const handleRestoreDraft = () => {
    if (!draftInfo) return
    setTagsInput(draftInfo.tagsInput)
    setNote(draftInfo.note)
    setEditing(true)
    setDraftInfo(null)
    toast.info('未保存の下書きを復元しました')
  }

  const handleDiscardDraft = () => {
    clearDraft(repo.id)
    setDraftInfo(null)
  }

  return (
    <section>
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">タグ・メモ</h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={update.isPending}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={update.isPending}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-1"
            >
              {update.isPending ? '保存中...' : '保存'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline"
          >
            編集
          </button>
        )}
      </header>

      {draftInfo && !editing && (
        <div className="mb-3 flex items-center gap-3 px-3 py-2 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-xs">
          <span className="flex-1">
            未保存の下書きがあります（
            {new Date(draftInfo.savedAt).toLocaleString()}
            ）
          </span>
          <button
            type="button"
            onClick={handleRestoreDraft}
            className="text-amber-700 dark:text-amber-200 hover:underline font-medium"
          >
            復元
          </button>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            破棄
          </button>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <label className="text-xs text-gray-500 block">
            <span className="block mb-1 font-medium">タグ（カンマ区切り）</span>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="frontend, side-project"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900"
            />
          </label>
          <label className="text-xs text-gray-500 block">
            <span className="block mb-1 font-medium">メモ（Markdown 対応）</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={8}
              placeholder="このリポジトリの目的、TODO、メモなどを記入..."
              className="w-full text-sm font-mono border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-900"
            />
          </label>
          {note.trim() && (
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800">
              <p className="text-[10px] text-gray-500 mb-1">プレビュー</p>
              <MarkdownPreview source={note} />
            </div>
          )}
        </div>
      ) : (
        <>
          {repo.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {repo.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3">タグなし</p>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
            <MarkdownPreview source={repo.note ?? ''} />
          </div>
        </>
      )}
    </section>
  )
}

const btnCls =
  'text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50'

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ja })
  } catch {
    return iso
  }
}

function remoteWebUrl(remote: string): string {
  const ssh = remote.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`
  return remote.replace(/\.git$/, '')
}
