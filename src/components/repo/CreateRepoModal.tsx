import { useEffect, useState } from 'react'
import { useGhAuthStatus, useCreateRepo } from '../../hooks/useRepoCreate'
import { useSettings } from '../../hooks/useSettings'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateRepoModal({ open, onClose }: Props) {
  const { settings } = useSettings()
  const { data: gh } = useGhAuthStatus()
  const createRepo = useCreateRepo()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [workspaceId, setWorkspaceId] = useState('')
  const [withReadme, setWithReadme] = useState(false)

  useEffect(() => {
    if (open && settings && !workspaceId) {
      setWorkspaceId(settings.activeWorkspaceId || settings.workspaces[0]?.id || '')
    }
  }, [open, settings, workspaceId])

  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setVisibility('private')
      setWithReadme(false)
    }
  }, [open])

  if (!open) return null

  const ghReady = gh?.installed && gh?.authenticated
  const canSubmit = ghReady && name.trim().length > 0 && workspaceId

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createRepo.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        workspaceId,
        withReadme,
      },
      {
        onSuccess: (res) => {
          if (res.success) onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold">新規リポジトリの作成</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!ghReady && (
            <p className="text-sm text-red-600">
              {gh?.installed
                ? 'gh の認証が必要です。ターミナルで `gh auth login` を実行してください。'
                : 'gh CLI が見つかりません。'}
            </p>
          )}
          <Field label="リポジトリ名">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-new-app"
              required
              className={inputCls}
            />
          </Field>
          <Field label="説明 (任意)">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description"
              className={inputCls}
            />
          </Field>
          <Field label="公開設定">
            <div className="flex gap-3 text-sm">
              {(['public', 'private'] as const).map((v) => (
                <label key={v} className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="visibility"
                    value={v}
                    checked={visibility === v}
                    onChange={() => setVisibility(v)}
                  />
                  {v}
                </label>
              ))}
            </div>
          </Field>
          <Field label="クローン先 (Workspace)">
            <select
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="" disabled>
                選択してください
              </option>
              {settings?.workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.path})
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withReadme}
              onChange={(e) => setWithReadme(e.target.checked)}
            />
            README を初期化する
          </label>

          {createRepo.progress.length > 0 && (
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">
              {createRepo.progress.join('\n')}
            </pre>
          )}
          {createRepo.data && !createRepo.data.success && (
            <p className="text-xs text-red-600">{createRepo.data.error}</p>
          )}
          {createRepo.isError && (
            <p className="text-xs text-red-600">{(createRepo.error as Error).message}</p>
          )}

          <footer className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!canSubmit || createRepo.isPending}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-1"
            >
              {createRepo.isPending ? '作成中...' : '作成してクローン'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

const inputCls =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-gray-500 flex flex-col gap-1">
      <span>{label}</span>
      {children}
    </label>
  )
}
