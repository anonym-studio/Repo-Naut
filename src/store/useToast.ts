import { create } from 'zustand'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
  /** ミリ秒単位の表示時間。`Toaster` 側でタイマー管理する */
  durationMs: number
  createdAt: number
}

interface ToastStore {
  toasts: Toast[]
  push: (kind: ToastKind, message: string, options?: { durationMs?: number }) => number
  remove: (id: number) => void
  clear: () => void
}

let nextId = 1

/** 1 度に表示する最大件数。それを超えると古いトーストが押し出される。 */
export const MAX_TOASTS = 5

/**
 * 種別ごとのデフォルト表示時間。
 * エラーは読み損ねないよう長めに、それ以外は通常通り。
 */
const DEFAULT_DURATIONS: Record<ToastKind, number> = {
  success: 3500,
  info: 3500,
  error: 6000,
}

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, message, options) => {
    const id = nextId++
    const durationMs = options?.durationMs ?? DEFAULT_DURATIONS[kind]
    set((s) => {
      const next = [...s.toasts, { id, kind, message, durationMs, createdAt: Date.now() }]
      // 上限を超えたら古いものから捨てる
      return { toasts: next.slice(-MAX_TOASTS) }
    })
    return id
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}))

export const toast = {
  success: (msg: string, options?: { durationMs?: number }) =>
    useToast.getState().push('success', msg, options),
  error: (msg: string, options?: { durationMs?: number }) =>
    useToast.getState().push('error', msg, options),
  info: (msg: string, options?: { durationMs?: number }) =>
    useToast.getState().push('info', msg, options),
  dismiss: (id: number) => useToast.getState().remove(id),
  clearAll: () => useToast.getState().clear(),
}
