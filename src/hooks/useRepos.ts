import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Repository, RepoMeta, RepoDetail } from '../types'
import { useSettings } from './useSettings'

export function useRepos() {
  const { settings } = useSettings()
  const activeWorkspace = settings?.workspaces.find((w) => w.id === settings.activeWorkspaceId)

  const { data: repos = [], isLoading } = useQuery({
    queryKey: ['repos', activeWorkspace?.path],
    queryFn: () => invoke<Repository[]>('scan_workspace', { path: activeWorkspace!.path }),
    enabled: !!activeWorkspace,
  })

  return { repos, isLoading }
}

export function useRepoDetail(path: string) {
  return useQuery({
    queryKey: ['repo-detail', path],
    queryFn: () => invoke<RepoDetail>('get_repo_detail', { path }),
    enabled: !!path,
  })
}

export function useUpdateRepoMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, meta }: { id: string; meta: Partial<RepoMeta> }) =>
      invoke('update_repo_meta', { id, meta }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repos'] }),
  })
}
