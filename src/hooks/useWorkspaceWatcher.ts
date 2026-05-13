import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'

interface WorkspaceChangedPayload {
  workspaceId: string
  workspacePath: string
  reason: string
}

/**
 * Rust側の `notify` クレートから飛んでくる `workspace_changed` イベントを
 * リッスンし、リポジトリ一覧クエリを無効化して自動再スキャンを促す。
 *
 * AppShell で1回だけマウントすること。
 */
export function useWorkspaceWatcher() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const promise = listen<WorkspaceChangedPayload>('workspace_changed', () => {
      if (cancelled) return
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['repos'] })
      }, 500)
    })

    return () => {
      cancelled = true
      if (debounceTimer) clearTimeout(debounceTimer)
      promise.then((unlisten) => unlisten()).catch(() => {})
    }
  }, [queryClient])
}
