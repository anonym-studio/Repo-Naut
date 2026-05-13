import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { GitCommandResult, ScriptConfig } from '../types'

const QUERY_KEY = ['scripts'] as const

export function useScripts() {
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => invoke<ScriptConfig[]>('list_scripts'),
    staleTime: 5_000,
  })
  return { scripts: query.data ?? [], isLoading: query.isLoading }
}

export type NewScript = Pick<ScriptConfig, 'name' | 'command' | 'description'>

export function useAddScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (script: NewScript) => invoke<ScriptConfig>('add_script', { script }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRemoveScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoke<void>('remove_script', { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export type ScriptPatch = {
  id: string
  name?: string
  command?: string
  /** 空文字を渡すと説明をクリア、`undefined`（または省略）で変更なし */
  description?: string
}

export function useUpdateScript() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ScriptPatch) => invoke<ScriptConfig>('update_script', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

/**
 * 指定スクリプトをリポジトリパスで実行する。
 * 結果は `GitCommandResult` 形式で返り、`GitResultModal` で表示できる。
 */
export function useRunScript() {
  return useMutation({
    mutationFn: ({ scriptId, repoPath }: { scriptId: string; repoPath: string }) =>
      invoke<GitCommandResult>('run_script', { scriptId, repoPath }),
  })
}
