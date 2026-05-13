import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Column, Task } from '../../types'
import { TaskCard } from './TaskCard'

const columnTitles: Record<Column, string> = {
  todo: 'TODO',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
}

interface Props {
  column: Column
  tasks: Task[]
  onAdd: () => void
  onEditTask: (task: Task) => void
}

export function KanbanColumn({ column, tasks, onAdd, onEditTask }: Props) {
  // 空カラムへのドロップ用に column 自体も droppable にしておく
  const { setNodeRef, isOver } = useDroppable({ id: column })
  const sorted = tasks.slice().sort((a, b) => a.order - b.order)
  const taskIds = sorted.map((t) => t.id)

  return (
    <section
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border ${
        isOver ? 'border-blue-400' : 'border-transparent'
      }`}
    >
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">
          {columnTitles[column]}
          <span className="ml-2 text-xs text-gray-500">{tasks.length}</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
        >
          +
        </button>
      </header>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2 min-h-[120px]">
          {sorted.length === 0 ? (
            <li className="text-[11px] text-gray-400 italic py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded">
              ここにドロップ
            </li>
          ) : (
            sorted.map((t) => (
              <TaskCard key={t.id} task={t} onEdit={() => onEditTask(t)} />
            ))
          )}
        </ul>
      </SortableContext>
    </section>
  )
}
