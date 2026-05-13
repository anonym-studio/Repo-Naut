import { MutableRefObject, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Repository } from '../../types'
import { ReadmeModal } from './ReadmeModal'

interface Props {
  repos: Repository[]
  highlightId?: string | null
  cardRefs?: MutableRefObject<Record<string, HTMLElement | null>>
}

export function RepoList({ repos, highlightId, cardRefs }: Props) {
  const [readmeFor, setReadmeFor] = useState<Repository | null>(null)

  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="py-2 pr-3">名前</th>
            <th className="py-2 pr-3">ブランチ</th>
            <th className="py-2 pr-3">最新コミット</th>
            <th className="py-2 pr-3">更新</th>
            <th className="py-2 pr-3">タグ</th>
            <th className="py-2 pr-3">README</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((r) => (
            <tr
              key={r.id}
              ref={(el) => {
                if (cardRefs) cardRefs.current[r.id] = el
              }}
              className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-500 ${
                highlightId === r.id
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : ''
              }`}
            >
              <td className="py-2 pr-3">
                <Link to={`/repos/${r.id}`} className="text-blue-600 hover:underline">
                  {r.name}
                </Link>
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{r.currentBranch ?? '-'}</td>
              <td className="py-2 pr-3 truncate max-w-[260px]" title={r.latestCommit?.message}>
                {r.latestCommit?.message ?? '-'}
              </td>
              <td className="py-2 pr-3 text-xs text-gray-500">
                {r.latestCommit?.date ? safeRelative(r.latestCommit.date) : '-'}
              </td>
              <td className="py-2 pr-3 text-xs">{r.tags.join(', ')}</td>
              <td className="py-2 pr-3 text-xs">
                {r.hasReadme ? (
                  <button
                    type="button"
                    onClick={() => setReadmeFor(r)}
                    className="text-blue-600 hover:underline"
                  >
                    プレビュー
                  </button>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReadmeModal
        open={!!readmeFor}
        onClose={() => setReadmeFor(null)}
        repoName={readmeFor?.name ?? ''}
        repoPath={readmeFor?.path ?? ''}
      />
    </>
  )
}

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ja })
  } catch {
    return '-'
  }
}
