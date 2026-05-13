import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export function useArchiveRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoke('archive_repo', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] }),
  })
}

export function useRestoreRepo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, targetPath }: { id: string; targetPath?: string }) =>
      invoke('restore_repo', { id, targetPath }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] }),
  })
}
