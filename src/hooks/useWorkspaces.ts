import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Workspace } from '../types'

export function useAddWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, path }: { name: string; path: string }) =>
      invoke<Workspace>('add_workspace', { name, path }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    },
  })
}

export function useRemoveWorkspace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoke('remove_workspace', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    },
  })
}
