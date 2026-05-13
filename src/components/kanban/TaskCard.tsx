import { useDraggable } from '@dnd-kit/core'
import type { Task } from '../../types'
import { useDeleteTask } from '../../hooks/useTasks'

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const translate = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined

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
          onClick={() => {
            if (confirm(`「${task.title}」を削除しますか？`)) deleteTask.mutate(task.id)
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
