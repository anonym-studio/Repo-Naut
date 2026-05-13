import { useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
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

  /**
   * D&D 完了時の処理:
   *  - over がカラムID なら、カラム末尾へ移動（空カラムへのドロップを含む）
   *  - over がタスクID なら、そのタスクの直前/直後に挿入（同一カラム内並び替えに対応）
   *
   * 並び順は order の中間値で表現する（前後の中点）。実装はシンプルさを優先し、衝突時のみ正規化する。
   */
  const handleDragEnd = (e: DragEndEvent) => {
    const taskId = String(e.active.id)
    const overId = e.over?.id
    if (!overId) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    // 1) カラム自体へのドロップ → そのカラムの末尾に置く
    if (columns.includes(overId as Column)) {
      const targetColumn = overId as Column
      if (task.column === targetColumn) return
      const maxOrder = grouped[targetColumn].reduce((max, t) => Math.max(max, t.order), 0)
      move.mutate(
        { id: taskId, column: targetColumn, order: maxOrder + 1 },
        { onError: (err) => toast.error(`移動に失敗: ${(err as Error).message}`) },
      )
      return
    }

    // 2) タスクへのドロップ → そのタスクが属するカラムの該当位置に挿入
    const overTask = tasks.find((t) => t.id === String(overId))
    if (!overTask) return
    const targetColumn = overTask.column
    const columnTasks = grouped[targetColumn].slice().sort((a, b) => a.order - b.order)
    const fromIndex = columnTasks.findIndex((t) => t.id === taskId)
    const toIndex = columnTasks.findIndex((t) => t.id === overTask.id)
    if (toIndex < 0) return
    if (task.column === targetColumn && fromIndex === toIndex) return

    // 「挿入位置の前後の order の中間値」を新しい order とする
    const reordered = columnTasks.filter((t) => t.id !== taskId)
    const insertIndex = toIndex
    const prev = reordered[insertIndex - 1]
    const next = reordered[insertIndex]
    let newOrder: number
    if (!prev && !next) {
      newOrder = 1
    } else if (!prev) {
      newOrder = next!.order - 1
    } else if (!next) {
      newOrder = prev.order + 1
    } else {
      newOrder = (prev.order + next.order) / 2
    }

    move.mutate(
      { id: taskId, column: targetColumn, order: newOrder },
      { onError: (err) => toast.error(`並び替えに失敗: ${(err as Error).message}`) },
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
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
