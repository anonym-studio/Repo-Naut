import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'
import type { EditorConfig } from '../types'
import { useSettings } from './useSettings'

export function useEditor() {
  const { settings } = useSettings()
  const queryClient = useQueryClient()

  const defaultEditor = settings?.editors.find((e) => e.id === settings.defaultEditorId)

  const openInEditor = useMutation({
    mutationFn: ({ path, editorId }: { path: string; editorId?: string }) =>
      invoke('open_in_editor', { path, editorId }),
  })

  const addEditor = useMutation({
    mutationFn: (config: Omit<EditorConfig, 'id'>) => invoke<EditorConfig>('add_editor', { config }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const removeEditor = useMutation({
    mutationFn: (id: string) => invoke('remove_editor', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const setDefaultEditor = useMutation({
    mutationFn: (id: string) => invoke('set_default_editor', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  return {
    editors: settings?.editors ?? [],
    defaultEditor,
    openInEditor: (path: string, editorId?: string) => openInEditor.mutate({ path, editorId }),
    addEditor: addEditor.mutate,
    removeEditor: removeEditor.mutate,
    setDefaultEditor: setDefaultEditor.mutate,
  }
}
