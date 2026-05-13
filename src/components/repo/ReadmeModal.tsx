import { useEffect } from 'react'
import { useReadme } from '../../hooks/useRepos'
import { MarkdownPreview } from '../common/MarkdownPreview'
import { Spinner } from '../common/Spinner'

interface Props {
  open: boolean
  onClose: () => void
  repoName: string
  repoPath: string
}

/**
 * README.md プレビュー用のスライドインモーダル。
 *
 * 閉じる手段は3つ用意してある（ユーザーが迷わないように）:
 * - 右上の × ボタン
 * - 背景（バックドロップ）クリック
 * - Esc キー
 */
export function ReadmeModal({ open, onClose, repoName, repoPath }: Props) {
  const { data, isLoading, error } = useReadme(repoPath, open)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    // モーダル表示中は背面のスクロールをロック
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${repoName} の README プレビュー`}
    >
      <aside
        className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate">{repoName}</h2>
            <p className="text-[11px] text-gray-500 truncate" title={data?.path ?? repoPath}>
              {data?.fileName ?? 'README.md'}
              {data && (
                <span className="ml-2">
                  {(data.size / 1024).toFixed(1)} KB
                  {data.truncated && <span className="ml-1 text-amber-600">(切り詰め)</span>}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner label="README を読み込み中..." />
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">
              README の読み込みに失敗: {(error as Error).message}
            </p>
          ) : data ? (
            <MarkdownPreview source={data.content} />
          ) : null}
        </div>

        <footer className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 shrink-0 flex items-center justify-between">
          <span>Esc / 背景クリックでも閉じます</span>
          <button
            type="button"
            onClick={onClose}
            className="text-blue-600 hover:underline"
          >
            閉じる
          </button>
        </footer>
      </aside>
    </div>
  )
}
