import { Link, useParams } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRepos, useRepoDetail } from '../hooks/useRepos'
import { useGitPull, useGitFetch, useGitCheckout } from '../hooks/useGitOps'
import { useTasks } from '../hooks/useTasks'
import { EditorButton } from '../components/repo/EditorButton'
import type { Repository } from '../types'

export function RepoDetail() {
  const { id } = useParams<{ id: string }>()
  const { repos } = useRepos()
  const repo = repos.find((r) => r.id === id)
  const detail = useRepoDetail(repo?.path ?? '')
  const { tasks } = useTasks()
  const linkedTasks = tasks.filter((t) => t.repoId === id)

  const pull = useGitPull()
  const fetch = useGitFetch()
  const checkout = useGitCheckout()

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
        <button
          type="button"
          onClick={() => pull.mutate(repo.path)}
          disabled={pull.isPending}
          className={btnCls}
        >
          git pull
        </button>
        <button
          type="button"
          onClick={() => fetch.mutate(repo.path)}
          disabled={fetch.isPending}
          className={btnCls}
        >
          git fetch
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
      </section>

      {(pull.data || fetch.data) && (
        <section className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs font-mono whitespace-pre-wrap">
          {[pull.data, fetch.data]
            .filter(Boolean)
            .map((res, i) => (
              <pre key={i}>
                {res!.stdout}
                {res!.stderr}
              </pre>
            ))}
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold mb-2">ブランチ</h2>
        <div className="flex flex-wrap gap-2">
          {(detail.data?.branches ?? repo.branches ?? []).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => checkout.mutate({ path: repo.path, branch: b })}
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
        <h2 className="text-sm font-semibold mb-2">紐付きタスク</h2>
        {linkedTasks.length === 0 ? (
          <p className="text-xs text-gray-500">紐付いているタスクはありません</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {linkedTasks.map((t) => (
              <li key={t.id}>
                <span className="text-xs text-gray-500 mr-2">[{t.column}]</span>
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      <RepoMetaSection repo={repo} />
    </div>
  )
}

function RepoMetaSection({ repo }: { repo: Repository }) {
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2">タグ・メモ</h2>
      {repo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {repo.tags.map((t) => (
            <span
              key={t}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      {repo.note ? (
        <pre className="text-xs whitespace-pre-wrap text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700">
          {repo.note}
        </pre>
      ) : (
        <p className="text-xs text-gray-500">メモはまだありません</p>
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
