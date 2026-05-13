import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useRepos } from '../../hooks/useRepos'
import { useTasks } from '../../hooks/useTasks'

type ResultKind = 'repo' | 'task' | 'commit' | 'nav' | 'recent'

interface Result {
  kind: ResultKind
  label: string
  sub?: string
  onSelect: () => void
}

const kindStyle: Record<ResultKind, string> = {
  repo: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  task: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  commit: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200',
  nav: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  recent: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
}

const kindLabel: Record<ResultKind, string> = {
  repo: 'Repo',
  task: 'Task',
  commit: 'Commit',
  nav: 'Nav',
  recent: '最近',
}

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen)
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const recentRepoIds = useAppStore((s) => s.recentRepoIds)
  const pushRecentRepo = useAppStore((s) => s.pushRecentRepo)
  const navigate = useNavigate()
  const { repos } = useRepos()
  const { tasks } = useTasks()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cmd/Ctrl + K で開閉、Esc で閉じる
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, setOpen])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const navItems: Result[] = [
      { kind: 'nav', label: 'Dashboard', sub: '/', onSelect: () => navigate('/') },
      { kind: 'nav', label: 'Repos', sub: '/repos', onSelect: () => navigate('/repos') },
      { kind: 'nav', label: 'Kanban', sub: '/kanban', onSelect: () => navigate('/kanban') },
      { kind: 'nav', label: 'Archive', sub: '/archive', onSelect: () => navigate('/archive') },
      { kind: 'nav', label: 'Settings', sub: '/settings', onSelect: () => navigate('/settings') },
    ]

    const repoResults: Result[] = repos.map((r) => ({
      kind: 'repo',
      label: r.name,
      sub: [r.currentBranch, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · '),
      onSelect: () => {
        pushRecentRepo(r.id)
        navigate(`/repos/${r.id}`)
      },
    }))

    const recentResults: Result[] = recentRepoIds
      .map((id) => repos.find((r) => r.id === id))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({
        kind: 'recent',
        label: r.name,
        sub: r.path,
        onSelect: () => {
          pushRecentRepo(r.id)
          navigate(`/repos/${r.id}`)
        },
      }))

    const commitResults: Result[] = repos
      .filter((r) => r.latestCommit?.message)
      .map((r) => ({
        kind: 'commit',
        label: r.latestCommit!.message,
        sub: `${r.name} · ${r.latestCommit!.shortSha}`,
        onSelect: () => {
          pushRecentRepo(r.id)
          navigate(`/repos/${r.id}`)
        },
      }))

    const taskResults: Result[] = tasks.map((t) => ({
      kind: 'task',
      label: t.title,
      sub: `${t.column} · ${t.priority}${t.labels.length > 0 ? ' · ' + t.labels.join(',') : ''}`,
      onSelect: () => navigate('/kanban'),
    }))

    if (!q) {
      return [...recentResults, ...navItems].slice(0, 12)
    }
    const all = [...recentResults, ...navItems, ...repoResults, ...commitResults, ...taskResults]
    const seen = new Set<string>()
    const matched = all.filter((r) => {
      if (!r.label.toLowerCase().includes(q) && !(r.sub ?? '').toLowerCase().includes(q)) return false
      const key = `${r.kind}-${r.label}-${r.sub ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    return matched.slice(0, 30)
  }, [query, repos, tasks, navigate, recentRepoIds, pushRecentRepo])

  useEffect(() => {
    if (activeIdx >= results.length) setActiveIdx(0)
  }, [results, activeIdx])

  if (!open) return null

  const handleSelect = (idx: number) => {
    const r = results[idx]
    if (!r) return
    r.onSelect()
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelect(activeIdx)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center bg-black/40 pt-[10vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActiveIdx(0)
          }}
          onKeyDown={handleKey}
          placeholder="リポジトリ・タスク・コミットを検索..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none"
        />
        <ul className="max-h-[60vh] overflow-auto">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-sm text-gray-500 text-center">該当する結果がありません</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.kind}-${i}-${r.label}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => handleSelect(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                    i === activeIdx
                      ? 'bg-blue-50 dark:bg-blue-900/40'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${kindStyle[r.kind]}`}>
                    {kindLabel[r.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-gray-500 truncate">{r.sub}</p>}
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
        <footer className="px-4 py-2 text-[10px] text-gray-500 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <span>↑↓ 移動</span>
          <span>↵ 開く</span>
          <span>Esc 閉じる</span>
        </footer>
      </div>
    </div>
  )
}
