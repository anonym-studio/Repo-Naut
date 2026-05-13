import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRepos } from '../hooks/useRepos'
import { useSettings } from '../hooks/useSettings'
import { useAppStore } from '../store/useAppStore'
import { RepoCard } from '../components/repo/RepoCard'
import { RepoList } from '../components/repo/RepoList'
import { RepoFilter } from '../components/repo/RepoFilter'
import { CreateRepoModal } from '../components/repo/CreateRepoModal'
import { Spinner } from '../components/common/Spinner'
import { toast } from '../store/useToast'
import type { Repository } from '../types'

export function Repos() {
  const { settings } = useSettings()
  const { repos, isLoading } = useRepos()
  const viewMode = useAppStore((s) => s.viewMode)
  const filterLanguage = useAppStore((s) => s.filterLanguage)
  const filterStatus = useAppStore((s) => s.filterStatus)
  const filterTags = useAppStore((s) => s.filterTags)
  const sortKey = useAppStore((s) => s.sortKey)
  const setFilterLanguage = useAppStore((s) => s.setFilterLanguage)
  const setFilterStatus = useAppStore((s) => s.setFilterStatus)
  const setFilterTags = useAppStore((s) => s.setFilterTags)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

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

  // `?focus=<repoId>` を受け取って、対応するカードまで自動スクロール + 数秒ハイライト。
  // フィルタやステータスで隠れている場合は自動的にフィルタを解除して見えるようにする。
  useEffect(() => {
    if (!focusId || isLoading) return
    const target = repos.find((r) => r.id === focusId)
    if (!target) {
      toast.error('指定されたリポジトリが見つかりませんでした')
      setSearchParams({}, { replace: true })
      return
    }

    let relaxed = false
    if (filterStatus !== 'all' && target.status !== filterStatus) {
      setFilterStatus('all')
      relaxed = true
    }
    if (filterLanguage && !target.language.includes(filterLanguage)) {
      setFilterLanguage(null)
      relaxed = true
    }
    if (filterTags.length > 0 && !filterTags.every((t) => target.tags.includes(t))) {
      setFilterTags([])
      relaxed = true
    }
    if (relaxed) toast.info('フィルタを一時的に解除してリポジトリを表示しました')

    // フィルタ反映を待ってからスクロールする
    const scrollTimer = setTimeout(() => {
      const el = cardRefs.current[focusId]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightId(focusId)
      }
    }, 80)
    const clearTimer = setTimeout(() => setHighlightId(null), 2600)
    // URL から focus パラメータを取り除く（リロード時にハイライトが再発火しないように）
    setSearchParams({}, { replace: true })

    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(clearTimer)
    }
    // 初回マウント時 + focusId 変化時のみ実行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, isLoading, repos])

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
            <div
              key={r.id}
              ref={(el) => {
                cardRefs.current[r.id] = el
              }}
              className={`transition-all duration-500 ${
                highlightId === r.id
                  ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900 rounded-lg'
                  : ''
              }`}
            >
              <RepoCard repo={r} />
            </div>
          ))}
        </div>
      ) : (
        <RepoList repos={filtered} highlightId={highlightId} cardRefs={cardRefs} />
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
