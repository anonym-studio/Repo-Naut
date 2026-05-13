import { useEffect, useState } from 'react'
import type { Column, NewTask, Task } from '../../types'
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks'
import { useRepos } from '../../hooks/useRepos'
import { MarkdownPreview } from '../common/MarkdownPreview'
import { toast } from '../../store/useToast'

interface Props {
  open: boolean
  onClose: () => void
  task?: Task | null
  defaultColumn?: Column
  defaultRepoId?: string
}

const defaultColumns: Column[] = ['todo', 'in_progress', 'review', 'done']
const priorities = ['low', 'medium', 'high'] as const

export function TaskFormModal({
  open,
  onClose,
  task,
  defaultColumn = 'todo',
  defaultRepoId,
}: Props) {
  const { repos } = useRepos()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [column, setColumn] = useState<Column>(defaultColumn)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [labelsRaw, setLabelsRaw] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [repoId, setRepoId] = useState('')

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setColumn(task.column)
      setPriority(task.priority)
      setLabelsRaw(task.labels.join(', '))
      setDueDate(task.dueDate ?? '')
      setRepoId(task.repoId ?? '')
    } else {
      setTitle('')
      setDescription('')
      setColumn(defaultColumn)
      setPriority('medium')
      setLabelsRaw('')
      setDueDate('')
      setRepoId(defaultRepoId ?? '')
    }
  }, [open, task, defaultColumn, defaultRepoId])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const labels = labelsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (task) {
      // 明示的に null を送ると Rust 側で Option::None に解釈される
      // （undefined のままだと JSON シリアライズで省略されてしまい、リセットできない）
      updateTask.mutate(
        {
          id: task.id,
          patch: {
            title: title.trim(),
            description: description.trim() ? description.trim() : null,
            column,
            priority,
            labels,
            dueDate: dueDate || null,
            repoId: repoId || null,
          } as Partial<Task>,
        },
        {
          onSuccess: () => {
            toast.success('タスクを更新しました')
            onClose()
          },
          onError: (err) => toast.error(`更新に失敗: ${(err as Error).message}`),
        },
      )
    } else {
      const newTask: NewTask = {
        title: title.trim(),
        description: description.trim() || undefined,
        column,
        // 0 を渡すと Rust 側で「同 column の末尾」に自動で order を割り当てる
        order: 0,
        priority,
        labels,
        dueDate: dueDate || undefined,
        repoId: repoId || undefined,
        commitSha: undefined,
        prUrl: undefined,
      }
      createTask.mutate(newTask, {
        onSuccess: () => {
          toast.success('タスクを作成しました')
          onClose()
        },
        onError: (err) => toast.error(`作成に失敗: ${(err as Error).message}`),
      })
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold">{task ? 'タスクの編集' : '新規タスク'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Field label="タイトル">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inputCls} />
          </Field>
          <Field label="説明 (Markdown)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputCls}
            />
            {description.trim() && (
              <div className="mt-2 border border-dashed border-gray-300 dark:border-gray-600 rounded p-2 bg-gray-50 dark:bg-gray-800">
                <p className="text-[10px] text-gray-500 mb-1">プレビュー</p>
                <MarkdownPreview source={description} />
              </div>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="カラム">
              <select
                value={column}
                onChange={(e) => setColumn(e.target.value as Column)}
                className={inputCls}
              >
                {defaultColumns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="優先度">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className={inputCls}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="ラベル (カンマ区切り)">
            <input
              value={labelsRaw}
              onChange={(e) => setLabelsRaw(e.target.value)}
              placeholder="bug, feature"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="期日">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="リポジトリ">
              <select value={repoId} onChange={(e) => setRepoId(e.target.value)} className={inputCls}>
                <option value="">なし</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
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
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 disabled:opacity-50"
              disabled={createTask.isPending || updateTask.isPending}
            >
              保存
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
