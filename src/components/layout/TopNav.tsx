import { Link, useLocation } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { useAppStore } from '../../store/useAppStore'
import { Spinner } from '../common/Spinner'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/repos', label: 'Repos' },
  { to: '/kanban', label: 'Kanban' },
  { to: '/archive', label: 'Archive' },
]

export function TopNav() {
  const location = useLocation()
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen)
  const scanningCount = useIsFetching({ queryKey: ['repos'] })

  return (
    <header className="flex items-center gap-6 px-6 h-12 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
      <span className="font-bold text-lg">Repo-Naut</span>
      <nav className="flex gap-4">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`text-sm ${
              location.pathname === item.to
                ? 'text-blue-600 dark:text-blue-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        {scanningCount > 0 && <Spinner label="スキャン中" />}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 hover:border-gray-400"
        >
          ⌘K 検索
        </button>
        <button
          type="button"
          onClick={() => {
            // ? を発火させてショートカットモーダルを開く
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))
          }}
          title="キーボードショートカット (?)"
          className="text-xs text-gray-400 border border-gray-200 dark:border-gray-600 rounded w-6 h-6 flex items-center justify-center hover:border-gray-400"
        >
          ?
        </button>
        <Link to="/settings" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">
          ⚙
        </Link>
      </div>
    </header>
  )
}
