import { Link } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Repository } from '../../types'
import { EditorButton } from './EditorButton'
import { useArchiveRepo } from '../../hooks/useArchive'

interface Props {
  repo: Repository
}

export function RepoCard({ repo }: Props) {
  const archive = useArchiveRepo()
  const commitUrl = buildCommitUrl(repo)
  const relativeTime = repo.latestCommit?.date
    ? safeRelative(repo.latestCommit.date)
    : null

  const openTerminal = () => {
    invoke('open_in_terminal', { path: repo.path }).catch(console.error)
  }
  const openUrl = (url: string) => {
    invoke('open_url', { url }).catch(console.error)
  }

  return (
    <article className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 hover:border-blue-400 transition-colors">
      <header className="flex items-start justify-between gap-2 mb-2">
        <Link to={`/repos/${repo.id}`} className="min-w-0 flex-1">
          <h3 className="text-base font-semibold truncate">{repo.name}</h3>
          <p className="text-xs text-gray-500 truncate" title={repo.path}>
            {repo.path}
          </p>
        </Link>
        <div className="flex gap-1 flex-wrap justify-end">
          {repo.language.slice(0, 3).map((lang) => (
            <span
              key={lang}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              {lang}
            </span>
          ))}
        </div>
      </header>

      {repo.latestCommit ? (
        <div className="text-sm space-y-1 mb-3">
          <p className="truncate" title={repo.latestCommit.message}>
            <button
              type="button"
              onClick={() => commitUrl && openUrl(commitUrl)}
              className={`font-mono text-xs px-1 rounded ${
                commitUrl
                  ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
              disabled={!commitUrl}
              title={commitUrl ?? '最新コミット'}
            >
              {repo.latestCommit.shortSha}
            </button>{' '}
            <span className="text-gray-800 dark:text-gray-200">{repo.latestCommit.message}</span>
          </p>
          <p className="text-xs text-gray-500">
            @{repo.latestCommit.author}
            {relativeTime ? ` · ${relativeTime}` : null}
          </p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">コミット履歴がありません</p>
      )}

      <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2 mb-3">
        {repo.currentBranch && (
          <span className="font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
            {repo.currentBranch}
          </span>
        )}
        {(repo.ahead ?? 0) > 0 && <span className="text-green-600">↑{repo.ahead}</span>}
        {(repo.behind ?? 0) > 0 && <span className="text-amber-600">↓{repo.behind}</span>}
        {(repo.unstagedCount ?? 0) > 0 && (
          <span className="text-blue-600">●{repo.unstagedCount} unstaged</span>
        )}
      </div>

      {repo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {repo.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        {repo.remoteUrl && (
          <button
            type="button"
            onClick={() => openUrl(remoteWebUrl(repo.remoteUrl!))}
            className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {platformLabel(repo)} ↗
          </button>
        )}
        <EditorButton repoPath={repo.path} />
        <button
          type="button"
          onClick={openTerminal}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Terminal
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`「${repo.name}」をアーカイブしますか？`)) archive.mutate(repo.id)
          }}
          disabled={archive.isPending}
          className="ml-auto text-xs text-gray-500 hover:text-red-600"
        >
          アーカイブ
        </button>
      </footer>
    </article>
  )
}

function safeRelative(iso: string): string | null {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ja })
  } catch {
    return null
  }
}

function platformLabel(repo: Repository): string {
  switch (repo.platform) {
    case 'github':
      return 'GitHub'
    case 'gitlab':
      return 'GitLab'
    case 'bitbucket':
      return 'Bitbucket'
    default:
      return 'Remote'
  }
}

function remoteWebUrl(remote: string): string {
  // SSH形式（git@github.com:user/repo.git）をHTTPSに変換
  const sshMatch = remote.match(/^git@([^:]+):(.+?)(?:\.git)?$/)
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`
  }
  return remote.replace(/\.git$/, '')
}

function buildCommitUrl(repo: Repository): string | null {
  if (!repo.remoteUrl || !repo.latestCommit) return null
  const web = remoteWebUrl(repo.remoteUrl)
  if (!web.startsWith('http')) return null
  return `${web}/commit/${repo.latestCommit.sha}`
}
