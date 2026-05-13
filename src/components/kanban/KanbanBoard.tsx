import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Column, Task } from '../../types'
import { useTasks, useMoveTask } from '../../hooks/useTasks'
import { toast } from '../../store/useToast'
import { KanbanColumn } from './KanbanColumn'
import { TaskFormModal } from './TaskFormModal'

const columns: Column[] = ['todo', 'in_progress', 'review', 'done']

export function KanbanBoard() {
  const { tasks, isLoading } = useTasks()
  const move = useMoveTask()
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const [editing, setEditing] = useState<Task | null>(null)
  const [creatingFor, setCreatingFor] = useState<Column | null>(null)

  const grouped = useMemo(() => {
    const map: Record<Column, Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }
    tasks.forEach((t) => {
      const col = (map[t.column] ? t.column : 'todo') as Column
      map[col].push(t)
    })
    return map
  }, [tasks])

  const handleDragEnd = (e: DragEndEvent) => {
    const taskId = String(e.active.id)
    const overId = e.over?.id
    if (!overId) return
    const newColumn = overId as Column
    if (!columns.includes(newColumn)) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    if (task.column === newColumn) return
    // 移動先 column 内の最大 order より +1（空 column 時は 1）
    const maxOrder = grouped[newColumn].reduce((max, t) => Math.max(max, t.order), 0)
    move.mutate(
      { id: taskId, column: newColumn, order: maxOrder + 1 },
      { onError: (err) => toast.error(`移動に失敗: ${(err as Error).message}`) },
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex items-center justify-between mb-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : (
          <p className="text-xs text-gray-500">
            合計 {tasks.length} 件のタスク
          </p>
        )}
        <button
          type="button"
          onClick={() => setCreatingFor('todo')}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1"
        >
          + 新規タスク
        </button>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((c) => (
          <KanbanColumn
            key={c}
            column={c}
            tasks={grouped[c]}
            onAdd={() => setCreatingFor(c)}
            onEditTask={(t) => setEditing(t)}
          />
        ))}
      </div>
      <TaskFormModal
        open={creatingFor !== null}
        onClose={() => setCreatingFor(null)}
        defaultColumn={creatingFor ?? 'todo'}
      />
      <TaskFormModal open={editing !== null} onClose={() => setEditing(null)} task={editing} />
    </DndContext>
  )
}
