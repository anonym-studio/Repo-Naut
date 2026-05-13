import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invoke } from '@tauri-apps/api/core'

export type ImportSummary = {
  schemaVersion: number
  exportedAt: string
  appVersion: string
  settingsWorkspaces: number
  reposMetaCount: number
  tasksCount: number
}

export type ExportResult = {
  path: string
  size: number
}

/**
 * 全データを 1 つの JSON ファイルにエクスポートする。
 * `path` は `tauri-plugin-dialog` の `save()` で取得したファイルパスを渡す。
 */
export function useExportData() {
  return useMutation({
    mutationFn: (path: string) => invoke<ExportResult>('export_data', { path }),
  })
}

/**
 * バックアップファイルを「検証のみ」する。ディスクへの書き込みは発生しない。
 * インポート前のサマリ確認に使う。
 */
export function usePreviewBackup() {
  return useMutation({
    mutationFn: (path: string) => invoke<ImportSummary>('preview_backup', { path }),
  })
}

/**
 * バックアップファイルをインポートし、settings / repos-meta / kanban を上書きする。
 * 成功後は関連クエリをすべて invalidate して UI を再フェッチさせる。
 */
export function useImportData() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (path: string) => invoke<ImportSummary>('import_data', { path }),
    onSuccess: () => {
      // settings / repos / kanban / scripts / github-stats 等、JSON に依存する全クエリを再取得
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['repos'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['scripts'] })
    },
  })
}
