import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

interface Shortcut {
  keys: string[]
  description: string
}

const shortcuts: Array<{ group: string; items: Shortcut[] }> = [
  {
    group: 'グローバル',
    items: [
      { keys: ['?'], description: 'このショートカット一覧を開く / 閉じる' },
      { keys: ['Cmd / Ctrl', 'K'], description: 'コマンドパレットを開く' },
      { keys: ['Esc'], description: 'モーダル・パレットを閉じる' },
    ],
  },
  {
    group: 'ナビゲーション (`g` キーを押した直後に押下)',
    items: [
      { keys: ['g', 'd'], description: 'Dashboard へ' },
      { keys: ['g', 'r'], description: 'Repos へ' },
      { keys: ['g', 'k'], description: 'Kanban へ' },
      { keys: ['g', 'a'], description: 'Archive へ' },
      { keys: ['g', 's'], description: 'Settings へ' },
    ],
  },
  {
    group: 'コマンドパレット内',
    items: [
      { keys: ['↑', '↓'], description: '候補を移動' },
      { keys: ['Enter'], description: '選択中の項目を開く' },
    ],
  },
]

/**
 * `?` キー押下でグローバルに開閉するショートカット一覧モーダル。
 * `g` を起点とした 2 ストロークのナビゲーション（g r / g k 等）もここでハンドリングする。
 */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  // コマンドパレット表示中は ? を文字入力として扱うため、open 状態を取得して衝突回避
  const paletteOpen = useAppStore((s) => s.commandPaletteOpen)

  useEffect(() => {
    let waitingForG = false
    let gTimer: ReturnType<typeof setTimeout> | null = null

    const handler = (e: KeyboardEvent) => {
      // 入力要素にフォーカスがある場合はショートカットを無効化
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return

      // ? でモーダル開閉（コマンドパレット表示中は無視）
      if (!paletteOpen && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }

      if (open) {
        if (e.key === 'Escape') {
          e.preventDefault()
          setOpen(false)
        }
        // モーダル表示中は g- 系を受け付けない
        return
      }

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        waitingForG = true
        if (gTimer) clearTimeout(gTimer)
        gTimer = setTimeout(() => {
          waitingForG = false
        }, 1200)
        return
      }

      if (waitingForG) {
        waitingForG = false
        if (gTimer) clearTimeout(gTimer)
        switch (e.key) {
          case 'd':
            navigate('/')
            break
          case 'r':
            navigate('/repos')
            break
          case 'k':
            navigate('/kanban')
            break
          case 'a':
            navigate('/archive')
            break
          case 's':
            navigate('/settings')
            break
          default:
            return
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimer) clearTimeout(gTimer)
    }
  }, [open, paletteOpen, navigate])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="キーボードショートカット一覧"
    >
      <div
        className="w-full max-w-md max-h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold">キーボードショートカット</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="閉じる"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {shortcuts.map((group) => (
            <section key={group.group}>
              <h3 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
                {group.group}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((s) => (
                  <li key={s.description} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-200">{s.description}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-gray-400 text-[10px]">+</span>}
                          <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                            {k}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 flex justify-between">
          <span>Esc / 背景クリックでも閉じます</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-blue-600 hover:underline"
          >
            閉じる
          </button>
        </footer>
      </div>
    </div>
  )
}
