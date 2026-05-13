import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export function useArchiveRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, path }: { id: string; path: string }) =>
      invoke('archive_repo', { id, path }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] }),
  })
}

export function useRestoreRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, path, targetPath }: { id: string; path: string; targetPath?: string }) =>
      invoke('restore_repo', { id, path, targetPath }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] }),
  })
}
