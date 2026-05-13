import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { Task, NewTask, Column } from '../types'

export function useTasks() {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => invoke<Task[]>('get_tasks'),
  })

  return { tasks, isLoading }
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (task: NewTask) => invoke<Task>('create_task', { task }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      invoke<Task>('update_task', { id, patch }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoke('delete_task', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, column, order }: { id: string; column: Column; order: number }) =>
      invoke('move_task', { id, column, order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
