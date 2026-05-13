import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Repository } from '../../types'
import { RepoCard } from './RepoCard'

interface Props {
  repo: Repository
  /** カスタムソート時のみ true。ハンドルを表示しドラッグ可能にする。 */
  reorderable: boolean
}

/**
 * RepoCard を `@dnd-kit/sortable` でラップする。
 *
 * - ドラッグはカード右上の縦ドットハンドルからのみ開始可能（カード本体は stretched link で詳細ページに遷移する）。
 * - `reorderable` が false の時はハンドル非表示 & ドラッグ無効。これによりカスタム順以外のソートで
 *   通常のカードと同じ振る舞いになる。
 */
export function SortableRepoCard({ repo, reorderable }: Props) {
  const sortable = useSortable({ id: repo.id, disabled: !reorderable })
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {reorderable && (
        <button
          type="button"
          aria-label={`${repo.name} の表示順を変更`}
          title="ドラッグして並び替え"
          // 並び替えハンドル。stretched link より前面に乗せ、ドラッグイベントを受け取る
          className="absolute top-1 right-1 z-20 inline-flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-white/80 dark:bg-gray-900/80 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <circle cx="4" cy="3" r="1.2" fill="currentColor" />
            <circle cx="10" cy="3" r="1.2" fill="currentColor" />
            <circle cx="4" cy="7" r="1.2" fill="currentColor" />
            <circle cx="10" cy="7" r="1.2" fill="currentColor" />
            <circle cx="4" cy="11" r="1.2" fill="currentColor" />
            <circle cx="10" cy="11" r="1.2" fill="currentColor" />
          </svg>
        </button>
      )}
      <RepoCard repo={repo} />
    </div>
  )
}
