import { useDraggable } from '@dnd-kit/core'
import { ask } from '@tauri-apps/plugin-dialog'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../../types'
import { useDeleteTask } from '../../hooks/useTasks'
import { useRepos } from '../../hooks/useRepos'
import { toast } from '../../store/useToast'

const priorityColor: Record<Task['priority'], string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

interface Props {
  task: Task
  onEdit: () => void
}

export function TaskCard({ task, onEdit }: Props) {
  const deleteTask = useDeleteTask()
  const navigate = useNavigate()
  const { repos } = useRepos()
  const linkedRepo = task.repoId ? repos.find((r) => r.id === task.repoId) : null
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const translate = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined

  const goToRepo = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!linkedRepo) return
    navigate(`/repos?focus=${encodeURIComponent(linkedRepo.id)}`)
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: translate,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2.5 text-sm space-y-1.5 cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2" {...listeners} {...attributes}>
        <p className="font-medium leading-snug">{task.title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${priorityColor[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      {linkedRepo && (
        <button
          type="button"
          onClick={goToRepo}
          onPointerDown={(e) => e.stopPropagation()}
          title={`Repos に移動して「${linkedRepo.name}」を表示`}
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 max-w-full"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3 h-3 shrink-0"
            fill="currentColor"
            aria-hidden
          >
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h7.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75H4.5a1 1 0 0 0 0 2h8a.75.75 0 0 1 0 1.5h-8A2.5 2.5 0 0 1 2 15zM11.5 1.5h-7a1 1 0 0 0-1 1v9.083A2.5 2.5 0 0 1 4.5 11.5h7z" />
          </svg>
          <span className="truncate">{linkedRepo.name}</span>
        </button>
      )}
      {!linkedRepo && task.repoId && (
        <span
          className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-400 italic"
          title="紐付け先のリポジトリが見つかりません"
        >
          (リポジトリ未検出)
        </span>
      )}
      {task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.labels.map((l) => (
            <span
              key={l}
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            >
              {l}
            </span>
          ))}
        </div>
      )}
      {task.dueDate && (
        <p className="text-[10px] text-gray-500">期日: {task.dueDate}</p>
      )}
      <div className="flex justify-end gap-2 pt-1 text-[10px]">
        <button
          type="button"
          onClick={onEdit}
          className="text-blue-600 hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          編集
        </button>
        <button
          type="button"
          onClick={async () => {
            const ok = await ask(`「${task.title}」を削除しますか？`, {
              title: 'タスクを削除',
              kind: 'warning',
            })
            if (!ok) return
            deleteTask.mutate(task.id, {
              onSuccess: () => toast.success(`「${task.title}」を削除しました`),
              onError: (e) => toast.error(`削除に失敗: ${(e as Error).message}`),
            })
          }}
          className="text-red-600 hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          削除
        </button>
      </div>
    </li>
  )
}
