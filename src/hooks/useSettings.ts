import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Settings } from '../types'

export function useSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => invoke<Settings>('get_settings'),
  })

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Settings>) => invoke('update_settings', { patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const setActiveWorkspace = (id: string) =>
    updateMutation.mutate({ activeWorkspaceId: id } as Partial<Settings>)

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    setActiveWorkspace,
  }
}
