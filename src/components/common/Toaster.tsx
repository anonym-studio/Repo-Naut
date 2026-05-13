import { useToast } from '../../store/useToast'

const kindStyles: Record<string, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
}

export function Toaster() {
  const toasts = useToast((s) => s.toasts)
  const remove = useToast((s) => s.remove)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded shadow-lg px-4 py-2 text-sm flex items-start gap-3 ${kindStyles[t.kind] ?? kindStyles.info}`}
          role="status"
        >
          <span className="flex-1 whitespace-pre-wrap break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="opacity-80 hover:opacity-100 leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
