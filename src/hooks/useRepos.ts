import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type {
  Repository,
  RepoMeta,
  RepoDetail,
  ReadmeContent,
  CommitActivity,
} from '../types'
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

/**
 * Workspace 単位のカスタム並び順を保存する。
 * 保存後は settings クエリを再フェッチして UI に即反映する。
 */
export function useSetRepoOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ workspaceId, repoIds }: { workspaceId: string; repoIds: string[] }) =>
      invoke('set_repo_order', { workspaceId, repoIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })
}

/**
 * リポジトリ直下の README.md を読み込む。
 * `enabled` を false にしておけば不要なフェッチを抑止できる（モーダル開閉に合わせて切り替える）。
 */
export function useReadme(path: string, enabled: boolean) {
  return useQuery({
    queryKey: ['readme', path],
    queryFn: () => invoke<ReadmeContent>('read_readme', { path }),
    enabled: enabled && !!path,
    staleTime: 60_000,
  })
}

/**
 * アクティブな workspace の直近 `days` 日のコミット数を日別で取得する。
 * Dashboard のヒートマップ/グラフで使う。
 */
export function useCommitActivity(days = 30) {
  const { settings } = useSettings()
  const activeId = settings?.activeWorkspaceId
  return useQuery({
    queryKey: ['commit-activity', activeId, days],
    queryFn: () => invoke<CommitActivity>('get_commit_activity', { days }),
    enabled: !!activeId,
    staleTime: 60_000,
  })
}
