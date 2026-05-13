import { useEffect, useRef, useState } from 'react'
import { toast as toastApi, useToast, type Toast } from '../../store/useToast'

const kindStyles: Record<string, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
}

const kindIcons: Record<string, string> = {
  success: '✓',
  error: '!',
  info: 'i',
}

const kindAriaLabels: Record<string, string> = {
  success: '成功',
  error: 'エラー',
  info: '情報',
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.length > 2 && (
        <div className="flex justify-end pointer-events-auto">
          <button
            type="button"
            onClick={() => toastApi.clearAll()}
            className="text-[11px] text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 hover:bg-white dark:hover:bg-gray-700"
          >
            すべて閉じる ({toasts.length})
          </button>
        </div>
      )}
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}

/**
 * 単一トーストの表示 + 自動消去タイマー管理。
 * ホバー中はタイマーを一時停止し、離脱で残り時間から再開する。
 */
function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToast((s) => s.remove)
  // setTimeout のハンドルと、残り時間管理用
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remainingRef = useRef(toast.durationMs)
  const startedAtRef = useRef<number>(Date.now())
  const [paused, setPaused] = useState(false)

  // タイマー開始/再開
  const start = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    startedAtRef.current = Date.now()
    timerRef.current = setTimeout(() => remove(toast.id), remainingRef.current)
  }

  // 一時停止: 残り時間を計算してタイマー停止
  const pause = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current))
  }

  useEffect(() => {
    start()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEnter = () => {
    if (paused) return
    pause()
    setPaused(true)
  }
  const handleLeave = () => {
    if (!paused) return
    setPaused(false)
    start()
  }

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
      className={`pointer-events-auto rounded shadow-lg pl-3 pr-2 py-2 text-sm flex items-start gap-2 transition-opacity ${
        kindStyles[toast.kind] ?? kindStyles.info
      }`}
      role={toast.kind === 'error' ? 'alert' : 'status'}
    >
      <span
        aria-label={kindAriaLabels[toast.kind]}
        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold leading-none"
      >
        {kindIcons[toast.kind]}
      </span>
      <span className="flex-1 whitespace-pre-wrap wrap-break-word leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="shrink-0 opacity-80 hover:opacity-100 leading-none px-1 -my-1 text-base"
        aria-label="閉じる"
        tabIndex={0}
      >
        ×
      </button>
    </div>
  )
}
