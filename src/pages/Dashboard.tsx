import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useRepos } from '../hooks/useRepos'
import { useTasks } from '../hooks/useTasks'
import { Spinner } from '../components/common/Spinner'

export function Dashboard() {
  const { repos, isLoading } = useRepos()
  const { tasks } = useTasks()

  const activeRepos = useMemo(() => repos.filter((r) => r.status === 'active'), [repos])

  const langStats = useMemo(() => {
    const counts: Record<string, number> = {}
    activeRepos.forEach((r) => r.language.forEach((l) => (counts[l] = (counts[l] ?? 0) + 1)))
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [activeRepos])

  const recentlyActive = useMemo(() => {
    return activeRepos
      .filter((r) => r.latestCommit?.date)
      .sort((a, b) => (b.latestCommit!.date > a.latestCommit!.date ? 1 : -1))
      .slice(0, 5)
  }, [activeRepos])

  const archiveCandidates = useMemo(() => {
    const now = new Date()
    return activeRepos.filter((r) => {
      if (!r.latestCommit?.date) return false
      try {
        return differenceInDays(now, parseISO(r.latestCommit.date)) > 90
      } catch {
        return false
      }
    })
  }, [activeRepos])

  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      inProgress: tasks.filter((t) => t.column === 'in_progress').length,
      review: tasks.filter((t) => t.column === 'review').length,
    }
  }, [tasks])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size={28} />
        <p className="text-sm text-gray-500">Workspace 配下のリポジトリをスキャンしています...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat title="アクティブリポジトリ" value={activeRepos.length} />
        <Stat title="アーカイブ" value={repos.length - activeRepos.length} />
        <Stat
          title="タスク"
          value={`${taskStats.inProgress}進行中 / ${taskStats.total}件`}
          link="/kanban"
        />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="直近アクティブなリポジトリ">
          {recentlyActive.length === 0 ? (
            <p className="text-xs text-gray-500">表示するリポジトリがありません</p>
          ) : (
            <ul className="text-sm divide-y divide-gray-100 dark:divide-gray-700">
              {recentlyActive.map((r) => (
                <li key={r.id} className="py-2 flex justify-between gap-2">
                  <Link to={`/repos/${r.id}`} className="truncate hover:underline">
                    {r.name}
                  </Link>
                  <span className="text-xs text-gray-500 shrink-0">
                    {r.latestCommit && safeRelative(r.latestCommit.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="言語分布">
          {langStats.length === 0 ? (
            <p className="text-xs text-gray-500">スキャン結果がまだありません</p>
          ) : (
            <ul className="space-y-1">
              {langStats.map(([lang, n]) => (
                <li key={lang} className="flex items-center gap-2 text-sm">
                  <span className="w-20 text-gray-700 dark:text-gray-200">{lang}</span>
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded">
                    <div
                      className="h-2 bg-blue-500 rounded"
                      style={{ width: `${(n / langStats[0][1]) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-6 text-right">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      <Panel title="アーカイブ候補 (90日以上コミットなし)">
        {archiveCandidates.length === 0 ? (
          <p className="text-xs text-gray-500">該当するリポジトリはありません</p>
        ) : (
          <ul className="text-sm space-y-1">
            {archiveCandidates.map((r) => (
              <li key={r.id} className="flex justify-between">
                <Link to={`/repos/${r.id}`} className="hover:underline">
                  {r.name}
                </Link>
                <span className="text-xs text-gray-500">
                  {r.latestCommit && safeRelative(r.latestCommit.date)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function Stat({ title, value, link }: { title: string; value: number | string; link?: string }) {
  const body = (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:border-blue-400 transition-colors">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
    </div>
  )
  return link ? <Link to={link}>{body}</Link> : body
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}

function safeRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ja })
  } catch {
    return iso
  }
}
