import { useState } from 'react'
import { Link } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { ask } from '@tauri-apps/plugin-dialog'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Repository } from '../../types'
import { EditorButton } from './EditorButton'
import { ReadmeModal } from './ReadmeModal'
import { useArchiveRepo } from '../../hooks/useArchive'
import { useGithubStats } from '../../hooks/useGithub'
import { toast } from '../../store/useToast'

interface Props {
  repo: Repository
}

export function RepoCard({ repo }: Props) {
  const archive = useArchiveRepo()
  const [readmeOpen, setReadmeOpen] = useState(false)
  const commitUrl = buildCommitUrl(repo)
  const relativeTime = repo.latestCommit?.date
    ? safeRelative(repo.latestCommit.date)
    : null
  // GitHub の PR/Issue 数（PAT 未保存・github 以外では fetch しない）
  const githubStats = useGithubStats(repo)
  const stats = githubStats.data

  const openTerminal = () => {
    invoke('open_in_terminal', { path: repo.path }).catch((e) => toast.error(`Terminal起動失敗: ${e}`))
  }
  const openUrl = (url: string) => {
    invoke('open_url', { url }).catch((e) => toast.error(`URL起動失敗: ${e}`))
  }

  const handleArchive = async () => {
    const ok = await ask(`「${repo.name}」をアーカイブしますか？\n\nリポジトリ本体は workspace 内の .archive/ に移動します。`, {
      title: 'リポジトリをアーカイブ',
      kind: 'warning',
    })
    if (!ok) return
    archive.mutate(
      { id: repo.id, path: repo.path },
      {
        onSuccess: () => toast.success(`「${repo.name}」をアーカイブしました`),
        onError: (e) => toast.error(`アーカイブに失敗: ${(e as Error).message}`),
      },
    )
  }

  return (
    <article className="group relative border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-4 hover:border-blue-400 transition-colors">
      {/* Stretched link: カード全体を詳細ページへのリンクとして機能させる。
          下のボタン類は relative z-10 を持つので、ボタン操作はリンクを乗り越えない。 */}
      <Link
        to={`/repos/${repo.id}`}
        aria-label={`${repo.name} の詳細を開く`}
        className="absolute inset-0 rounded-lg z-0 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      />
      <header className="flex items-start justify-between gap-2 mb-2 relative z-10 pointer-events-none">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {repo.name}
          </h3>
          <p className="text-xs text-gray-500 truncate" title={repo.path}>
            {repo.path}
          </p>
        </div>
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
        <div className="text-sm space-y-1 mb-3 relative z-10 pointer-events-none">
          <p className="truncate" title={repo.latestCommit.message}>
            <button
              type="button"
              onClick={() => commitUrl && openUrl(commitUrl)}
              className={`font-mono text-xs px-1 rounded pointer-events-auto ${
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
        <p className="text-xs text-gray-400 mb-3 relative z-10 pointer-events-none">
          コミット履歴がありません
        </p>
      )}

      <div className="text-xs text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-2 mb-3 relative z-10 pointer-events-none">
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
        {stats && (
          <>
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              title={`Open Pull Requests: ${stats.openPrCount}`}
            >
              <span aria-hidden>⇄</span>
              {stats.openPrCount} PR
            </span>
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              title={`Open Issues: ${stats.openIssueCount}`}
            >
              <span aria-hidden>!</span>
              {stats.openIssueCount} Issue
            </span>
          </>
        )}
        {githubStats.isError && (
          <span
            className="text-[10px] text-red-500"
            title={String((githubStats.error as Error)?.message ?? 'GitHub API エラー')}
          >
            GitHub: ⚠
          </span>
        )}
      </div>

      {repo.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 relative z-10 pointer-events-none">
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

      <footer className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 relative z-10">
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
        {repo.hasReadme ? (
          <button
            type="button"
            onClick={() => setReadmeOpen(true)}
            title="README.md をプレビュー"
            className="text-xs border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          >
            README
          </button>
        ) : (
          <span
            title="README.md が見つかりません"
            className="text-xs text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded px-2 py-1 cursor-not-allowed"
          >
            README なし
          </span>
        )}
        <button
          type="button"
          onClick={handleArchive}
          disabled={archive.isPending}
          className="ml-auto text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
        >
          {archive.isPending ? 'アーカイブ中...' : 'アーカイブ'}
        </button>
      </footer>

      <ReadmeModal
        open={readmeOpen}
        onClose={() => setReadmeOpen(false)}
        repoName={repo.name}
        repoPath={repo.path}
      />
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
