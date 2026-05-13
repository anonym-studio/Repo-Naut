import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAddWorkspace } from '../../hooks/useWorkspaces'
import { Spinner } from '../common/Spinner'

export function Onboarding() {
  const navigate = useNavigate()
  const addWorkspace = useAddWorkspace()
  const [name, setName] = useState('')
  const [path, setPath] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return
    addWorkspace.mutate(
      { name: name.trim(), path: path.trim() },
      {
        onSuccess: () => {
          // 追加成功後すぐに Repos へ遷移してスキャン結果を見せる
          navigate('/repos')
        },
      },
    )
  }

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-1">RepoHub へようこそ</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
          まず Workspace（リポジトリを束ねるルートディレクトリ）を1つ登録してください。
          登録後、配下の Git リポジトリを自動的にスキャンします。
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Workspace 名">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Personal"
              required
              className={inputCls}
            />
          </Field>
          <Field label="ルートディレクトリの絶対パス">
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/projects"
              required
              className={inputCls}
            />
            <p className="text-[11px] text-gray-500 mt-1">
              例) <code className="font-mono">/Users/{`<name>`}/Documents/workspace-private</code>
            </p>
          </Field>

          {addWorkspace.isError && (
            <p className="text-xs text-red-600">{(addWorkspace.error as Error).message}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {addWorkspace.isPending && <Spinner label="登録中..." />}
            <button
              type="submit"
              disabled={addWorkspace.isPending}
              className="text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-1.5"
            >
              登録してスキャン開始
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-6">
          後から設定画面で Workspace の追加・削除ができます。
        </p>
      </div>
    </div>
  )
}

const inputCls =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-gray-500 flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  )
}
