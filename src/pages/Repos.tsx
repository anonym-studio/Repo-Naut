import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useRepos, useSetRepoOrder } from '../hooks/useRepos'
import { useSettings } from '../hooks/useSettings'
import { useAppStore } from '../store/useAppStore'
import { SortableRepoCard } from '../components/repo/SortableRepoCard'
import { RepoList } from '../components/repo/RepoList'
import { RepoFilter } from '../components/repo/RepoFilter'
import { CreateRepoModal } from '../components/repo/CreateRepoModal'
import { Spinner } from '../components/common/Spinner'
import { toast } from '../store/useToast'
import type { Repository } from '../types'

export function Repos() {
  const { settings } = useSettings()
  const { repos, isLoading } = useRepos()
  const setRepoOrder = useSetRepoOrder()
  const viewMode = useAppStore((s) => s.viewMode)
  const filterLanguage = useAppStore((s) => s.filterLanguage)
  const filterStatus = useAppStore((s) => s.filterStatus)
  const filterTags = useAppStore((s) => s.filterTags)
  const sortKey = useAppStore((s) => s.sortKey)
  const setSortKey = useAppStore((s) => s.setSortKey)
  const setFilterLanguage = useAppStore((s) => s.setFilterLanguage)
  const setFilterStatus = useAppStore((s) => s.setFilterStatus)
  const setFilterTags = useAppStore((s) => s.setFilterTags)
  const [createOpen, setCreateOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLElement | null>>({})

  const activeWorkspaceId = settings?.activeWorkspaceId ?? ''
  const customOrder = useMemo(
    () => settings?.workspaceRepoOrder?.[activeWorkspaceId] ?? [],
    [settings, activeWorkspaceId],
  )

  // ポインター/キーボード両対応の D&D センサー。誤ドラッグ防止に少し閾値を入れる
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
    const base = repos.filter((r) => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterLanguage && !r.language.includes(filterLanguage)) return false
      if (filterTags.length > 0 && !filterTags.every((t) => r.tags.includes(t))) return false
      return true
    })
    if (sortKey === 'custom') {
      // 保存済み順序の indexOf でソート。未登録のものは末尾に名前順で並べる
      const indexMap = new Map(customOrder.map((id, i) => [id, i]))
      return base.slice().sort((a, b) => {
        const ai = indexMap.get(a.id) ?? Number.POSITIVE_INFINITY
        const bi = indexMap.get(b.id) ?? Number.POSITIVE_INFINITY
        if (ai === bi) return a.name.localeCompare(b.name)
        return ai - bi
      })
    }
    return base.sort(buildSorter(sortKey))
  }, [repos, filterStatus, filterLanguage, filterTags, sortKey, customOrder])

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

  const reorderable = sortKey === 'custom' && viewMode === 'card'

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!activeWorkspaceId) return

    const visibleIds = filtered.map((r) => r.id)
    const fromIdx = visibleIds.indexOf(String(active.id))
    const toIdx = visibleIds.indexOf(String(over.id))
    if (fromIdx < 0 || toIdx < 0) return

    // 表示中（filter 後）の並びだけを動かす。filter 外のリポジトリは元の順序を維持する。
    const reorderedVisible = arrayMove(visibleIds, fromIdx, toIdx)

    // 既存の保存順序とマージ。
    // 1) 既存順序のうち、表示中の ID 部分を visible の新並びで差し替える
    // 2) 未登録 ID は末尾に追記する
    const visibleSet = new Set(reorderedVisible)
    const merged: string[] = []
    let visibleCursor = 0
    for (const id of customOrder) {
      if (visibleSet.has(id)) {
        merged.push(reorderedVisible[visibleCursor++])
      } else {
        merged.push(id)
      }
    }
    while (visibleCursor < reorderedVisible.length) {
      const id = reorderedVisible[visibleCursor++]
      if (!merged.includes(id)) merged.push(id)
    }
    // すべての現存リポジトリの ID を最終的に末尾までカバー（filtered 外で未登録のもの対策）
    for (const r of repos) {
      if (!merged.includes(r.id)) merged.push(r.id)
    }

    setRepoOrder.mutate(
      { workspaceId: activeWorkspaceId, repoIds: merged },
      { onError: (e) => toast.error(`並び替えの保存に失敗: ${(e as Error).message}`) },
    )
  }

  const enableCustomSort = () => {
    setSortKey('custom')
    // 初回有効化時に現在の表示順で保存して、以後の D&D の基準点にする
    if (activeWorkspaceId && customOrder.length === 0 && repos.length > 0) {
      setRepoOrder.mutate({
        workspaceId: activeWorkspaceId,
        repoIds: repos.map((r) => r.id),
      })
    }
    toast.info('カスタム並びを有効化しました。カード右上のハンドルでドラッグできます。')
  }

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
        <>
          {sortKey === 'custom' && (
            <div className="mb-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded px-3 py-2 flex items-center justify-between gap-3">
              <span>
                カスタム並び替えモード: カード右上の <span className="font-mono">⋮⋮</span> ハンドルをドラッグして順序を変更できます。
              </span>
              <button
                type="button"
                onClick={() => setSortKey('lastCommit')}
                className="text-blue-700 dark:text-blue-300 underline underline-offset-2"
              >
                通常ソートに戻す
              </button>
            </div>
          )}
          {sortKey !== 'custom' && repos.length > 1 && (
            <div className="mb-2 text-xs text-gray-500 flex items-center gap-2">
              <button
                type="button"
                onClick={enableCustomSort}
                className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
              >
                カスタム順で並び替え
              </button>
              <span>に切り替えてドラッグで順序を保存できます</span>
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filtered.map((r) => r.id)}
              strategy={rectSortingStrategy}
            >
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
                    <SortableRepoCard repo={r} reorderable={reorderable} />
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      ) : (
        <RepoList repos={filtered} highlightId={highlightId} cardRefs={cardRefs} />
      )}

      <CreateRepoModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

type StandardSortKey = 'lastCommit' | 'name' | 'language'

function buildSorter(key: StandardSortKey | 'custom') {
  return (a: Repository, b: Repository) => {
    switch (key) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'language':
        return (a.language[0] ?? '').localeCompare(b.language[0] ?? '')
      case 'custom':
      case 'lastCommit':
      default: {
        const aDate = a.latestCommit?.date ?? ''
        const bDate = b.latestCommit?.date ?? ''
        return bDate.localeCompare(aDate)
      }
    }
  }
}
