import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useRepos } from '../hooks/useRepos'
import { useSettings } from '../hooks/useSettings'
import { useAppStore } from '../store/useAppStore'
import { RepoCard } from '../components/repo/RepoCard'
import { RepoList } from '../components/repo/RepoList'
import { RepoFilter } from '../components/repo/RepoFilter'
import { CreateRepoModal } from '../components/repo/CreateRepoModal'
import { Spinner } from '../components/common/Spinner'
import type { Repository } from '../types'

export function Repos() {
  const { settings } = useSettings()
  const { repos, isLoading } = useRepos()
  const viewMode = useAppStore((s) => s.viewMode)
  const filterLanguage = useAppStore((s) => s.filterLanguage)
  const filterStatus = useAppStore((s) => s.filterStatus)
  const filterTags = useAppStore((s) => s.filterTags)
  const sortKey = useAppStore((s) => s.sortKey)
  const [createOpen, setCreateOpen] = useState(false)

  const availableLanguages = useMemo(() => {
    const set = new Set<string>()
    repos.forEach((r) => r.language.forEach((l) => set.add(l)))
    return Array.from(set).sort()
  }, [repos])

  const availableTags = useMemo(() => {
    const set = new Set<string>()
    repos.forEach((r) => r.tags.forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [repos])

  const filtered = useMemo(() => {
    return repos
      .filter((r) => {
        if (filterStatus !== 'all' && r.status !== filterStatus) return false
        if (filterLanguage && !r.language.includes(filterLanguage)) return false
        if (filterTags.length > 0 && !filterTags.every((t) => r.tags.includes(t))) return false
        return true
      })
      .sort(buildSorter(sortKey))
  }, [repos, filterStatus, filterLanguage, filterTags, sortKey])

  if (!settings) return null

  // Workspace未登録時は AppShell 側のオンボーディングが表示されるためここには来ない想定だが、
  // 念のためフォールバックを残す。
  if (settings.workspaces.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500">Workspaceが登録されていません</p>
        <Link to="/settings" className="text-blue-600 hover:underline text-sm">
          設定からWorkspaceを追加 →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1"
        >
          + 新規リポジトリ
        </button>
      </header>

      <RepoFilter
        availableLanguages={availableLanguages}
        availableTags={availableTags}
        total={repos.length}
        filtered={filtered.length}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size={28} />
          <p className="text-sm text-gray-500">Workspace 配下のリポジトリをスキャンしています...</p>
          <p className="text-xs text-gray-400">リポジトリ数が多いと数十秒かかる場合があります</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">該当するリポジトリがありません</p>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      ) : (
        <RepoList repos={filtered} />
      )}

      <CreateRepoModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function buildSorter(key: 'lastCommit' | 'name' | 'language') {
  return (a: Repository, b: Repository) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'language':
        return (a.language[0] ?? '').localeCompare(b.language[0] ?? '')
      case 'lastCommit':
      default: {
        const aDate = a.latestCommit?.date ?? ''
        const bDate = b.latestCommit?.date ?? ''
        return bDate.localeCompare(aDate)
      }
    }
  }
}
