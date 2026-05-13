import { useMutation } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { GitCommandResult } from '../types'

export function useGitPull() {
  return useMutation({
    mutationFn: (path: string) => invoke<GitCommandResult>('git_pull', { path }),
  })
}

export function useGitFetch() {
  return useMutation({
    mutationFn: (path: string) => invoke<GitCommandResult>('git_fetch', { path }),
  })
}

export function useGitCheckout() {
  return useMutation({
    mutationFn: ({ path, branch }: { path: string; branch: string }) =>
      invoke<GitCommandResult>('git_checkout', { path, branch }),
  })
}
