import { useMemo, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Column, Task } from '../../types'
import { useTasks, useMoveTask } from '../../hooks/useTasks'
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
    tasks.forEach((t) => map[t.column].push(t))
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
    const newOrder = (grouped[newColumn].at(-1)?.order ?? 0) + 1
    move.mutate({ id: taskId, column: newColumn, order: newOrder })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {isLoading && <p className="text-sm text-gray-500 mb-2">読み込み中...</p>}
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
