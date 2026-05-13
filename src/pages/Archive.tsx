import { useMemo } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRepos } from '../hooks/useRepos'
import { useRestoreRepo } from '../hooks/useArchive'

export function Archive() {
  const { repos, isLoading } = useRepos()
  const restore = useRestoreRepo()

  const archived = useMemo(() => repos.filter((r) => r.status === 'archived'), [repos])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Archive</h1>
      {isLoading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : archived.length === 0 ? (
        <p className="text-sm text-gray-500">アーカイブ済みのリポジトリはありません</p>
      ) : (
        <ul className="space-y-2">
          {archived.map((r) => (
            <li
              key={r.id}
              className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800 flex flex-wrap items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate" title={r.path}>
                  {r.path}
                </p>
                {r.archiveMeta && (
                  <p className="text-xs text-gray-400 mt-1">
                    元の場所: {r.archiveMeta.originalPath}
                    {r.archivedAt && ` · ${safeRelative(r.archivedAt)}`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`「${r.name}」を復元しますか？`)) restore.mutate({ id: r.id })
                }}
                disabled={restore.isPending}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                復元
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ja })
  } catch {
    return iso
  }
}
