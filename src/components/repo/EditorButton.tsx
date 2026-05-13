import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../../hooks/useEditor'

interface Props {
  repoPath: string
}

export function EditorButton({ repoPath }: Props) {
  const { editors, defaultEditor, openInEditor } = useEditor()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!defaultEditor) {
    return (
      <span className="text-xs text-gray-400 italic">
        エディタ未登録
      </span>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => openInEditor(repoPath)}
        className="text-xs border border-gray-300 dark:border-gray-600 rounded-l px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        {defaultEditor.name}
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs border-y border-r border-gray-300 dark:border-gray-600 rounded-r px-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="他のエディタで開く"
      >
        ▾
      </button>
      {open && (
        <ul className="absolute right-0 top-full mt-1 z-10 min-w-[140px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg text-xs">
          {editors.map((ed) => (
            <li key={ed.id}>
              <button
                type="button"
                onClick={() => {
                  openInEditor(repoPath, ed.id)
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {ed.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
