import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { GhAuthStatus, CreateRepoResult } from '../types'

export function useGhAuthStatus() {
  return useQuery({
    queryKey: ['gh-auth'],
    queryFn: () => invoke<GhAuthStatus>('check_gh_auth'),
    staleTime: 1000 * 60, // 1分
  })
}

export function useCreateRepo() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<string[]>([])

  useEffect(() => {
    const unlisten = listen<string>('create_repo_progress', (event) => {
      setProgress((prev) => [...prev, event.payload])
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const mutation = useMutation({
    mutationFn: (params: {
      name: string
      description?: string
      visibility: 'public' | 'private'
      workspaceId: string
      withReadme: boolean
    }) => invoke<CreateRepoResult>('create_repo', params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      setProgress([])
    },
  })

  return { ...mutation, progress }
}
