import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { GitHubStats, PatValidation, Repository } from '../types'

const PAT_QUERY_KEY = ['github', 'has-pat'] as const

/**
 * PAT が keychain に保存されているかを問い合わせる。
 * 値そのものは取得しない（漏洩リスクを避けるため）。
 */
export function useHasPat() {
  return useQuery({
    queryKey: PAT_QUERY_KEY,
    queryFn: () => invoke<boolean>('has_pat'),
    staleTime: 60_000,
  })
}

export function useValidatePat() {
  return useMutation({
    mutationFn: (pat: string) => invoke<PatValidation>('validate_pat', { pat }),
  })
}

export function useSavePat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pat: string) => invoke<void>('save_pat', { pat }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAT_QUERY_KEY })
      qc.invalidateQueries({ queryKey: ['github', 'stats'] })
    },
  })
}

export function useDeletePat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => invoke<void>('delete_pat'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAT_QUERY_KEY })
      qc.removeQueries({ queryKey: ['github', 'stats'] })
    },
  })
}

/**
 * リポジトリの remoteUrl から GitHub の owner/repo を抽出する。
 * - SSH 形式: git@github.com:owner/repo.git
 * - HTTPS 形式: https://github.com/owner/repo(.git)
 * - github.com 以外は null
 */
export function parseGithubOwnerRepo(
  repo: Pick<Repository, 'platform' | 'remoteUrl'>,
): { owner: string; repo: string } | null {
  if (repo.platform !== 'github' || !repo.remoteUrl) return null
  const sshMatch = repo.remoteUrl.match(/^git@github\.com:([^/]+)\/([^/.]+?)(?:\.git)?$/)
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] }
  const httpsMatch = repo.remoteUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.]+?)(?:\.git)?\/?$/)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }
  return null
}

/**
 * GitHub の PR 数 / Issue 数を取得する。
 * - PAT が無いときは fetch しない（`enabled` で抑止）
 * - 60 秒キャッシュ。Rate limit (5000 req/h) を考慮して staleTime 長め。
 */
export function useGithubStats(repo: Pick<Repository, 'platform' | 'remoteUrl'> | null) {
  const { data: hasPat } = useHasPat()
  const parsed = repo ? parseGithubOwnerRepo(repo) : null

  return useQuery({
    queryKey: ['github', 'stats', parsed?.owner, parsed?.repo],
    queryFn: () =>
      invoke<GitHubStats>('get_github_stats', {
        owner: parsed!.owner,
        repo: parsed!.repo,
      }),
    enabled: !!hasPat && !!parsed,
    staleTime: 60_000,
    retry: false,
  })
}
