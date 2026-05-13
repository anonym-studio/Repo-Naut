import { useEffect, useState } from 'react'
import type { GitCommandResult } from '../../types'

export interface GitResult {
  /** どの git コマンドの結果か（pull / fetch / checkout など） */
  command: string
  /** ユーザーへの追加コンテキスト（ブランチ名など） */
  context?: string
  result: GitCommandResult
}

interface Props {
  open: boolean
  onClose: () => void
  result: GitResult | null
  /** 「もう一度実行」ボタンの動作（任意） */
  onRetry?: () => void
  retrying?: boolean
}

/**
 * git pull / fetch / checkout 等の実行結果を表示するモーダル。
 * 成功/失敗のアイコン+色分け、stderr の折りたたみ、再実行ボタンを備える。
 */
export function GitResultModal({ open, onClose, result, onRetry, retrying }: Props) {
  const [stderrOpen, setStderrOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    // モーダル開閉のたびに stderr の開閉状態をリセット
    if (open) setStderrOpen(false)
  }, [open, result])

  if (!open || !result) return null

  const ok = result.result.success
  const hasStdout = result.result.stdout.trim().length > 0
  const hasStderr = result.result.stderr.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className={`flex items-center justify-between gap-3 px-5 py-3 border-b ${
            ok
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className={`inline-flex items-center justify-center w-6 h-6 rounded-full shrink-0 ${
                ok ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {ok ? '✓' : '!'}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">
                <code className="font-mono">git {result.command}</code>
                {result.context && (
                  <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-300">
                    {result.context}
                  </span>
                )}
              </h2>
              <p
                className={`text-[11px] ${
                  ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                }`}
              >
                {ok ? '成功しました' : '失敗しました'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {hasStdout ? (
            <section>
              <p className="text-[11px] text-gray-500 mb-1">標準出力</p>
              <pre className="text-xs font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 whitespace-pre-wrap overflow-x-auto">
                {result.result.stdout.trim()}
              </pre>
            </section>
          ) : (
            !hasStderr && (
              <p className="text-xs text-gray-500">（出力はありません）</p>
            )
          )}

          {hasStderr && (
            <section>
              <button
                type="button"
                onClick={() => setStderrOpen((v) => !v)}
                className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
              >
                <span>{stderrOpen ? '▼' : '▶'}</span>
                <span>標準エラー出力 ({result.result.stderr.trim().split('\n').length} 行)</span>
              </button>
              {stderrOpen && (
                <pre className="mt-2 text-xs font-mono bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded p-3 whitespace-pre-wrap overflow-x-auto">
                  {result.result.stderr.trim()}
                </pre>
              )}
            </section>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
          <span className="text-gray-500">Esc / 背景クリックでも閉じます</span>
          <div className="flex gap-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={retrying}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {retrying ? '実行中...' : 'もう一度実行'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1"
            >
              閉じる
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
