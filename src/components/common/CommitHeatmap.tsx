import { useMemo } from 'react'
import type { CommitActivity, CommitActivityDay } from '../../types'

interface Props {
  activity: CommitActivity
  /** マスのサイズ (px) */
  cellSize?: number
  /** マスの間隔 (px) */
  cellGap?: number
}

/**
 * GitHub 風のコミットアクティビティヒートマップ。
 *
 * 仕様:
 *  - 日付は古い → 新しい 順で渡される（series）
 *  - 日曜=0 〜 土曜=6 の縦軸、左から右へ週が進む
 *  - 0/1〜q1/q1〜q2/q2〜q3/q3〜 の 5 段階で色を変える
 */
export function CommitHeatmap({ activity, cellSize = 12, cellGap = 3 }: Props) {
  const { series } = activity

  // 週単位（縦 7 マス）にビン分け。最初の週は日曜より前の曜日を空マスで埋める
  const weeks = useMemo(() => {
    if (series.length === 0) return [] as Array<Array<CommitActivityDay | null>>
    const result: Array<Array<CommitActivityDay | null>> = []
    let week: Array<CommitActivityDay | null> = []
    series.forEach((day, idx) => {
      const dayOfWeek = new Date(day.date + 'T00:00:00Z').getUTCDay()
      // 最初の日に到達したら、その曜日まで null で埋める
      if (idx === 0 && dayOfWeek > 0) {
        for (let i = 0; i < dayOfWeek; i++) week.push(null)
      }
      week.push(day)
      if (week.length === 7) {
        result.push(week)
        week = []
      }
    })
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      result.push(week)
    }
    return result
  }, [series])

  // 強度を決めるための四分位（max ベースの段階）
  const thresholds = useMemo(() => {
    const counts = series.map((d) => d.count).filter((c) => c > 0)
    if (counts.length === 0) return [0, 0, 0, 0]
    const max = Math.max(...counts)
    return [1, Math.ceil(max * 0.25), Math.ceil(max * 0.5), Math.ceil(max * 0.75)]
  }, [series])

  const levelFor = (count: number): number => {
    if (count <= 0) return 0
    if (count >= thresholds[3]) return 4
    if (count >= thresholds[2]) return 3
    if (count >= thresholds[1]) return 2
    return 1
  }

  const levelClass: Record<number, string> = {
    0: 'bg-gray-100 dark:bg-gray-800',
    1: 'bg-emerald-200 dark:bg-emerald-900',
    2: 'bg-emerald-300 dark:bg-emerald-700',
    3: 'bg-emerald-400 dark:bg-emerald-500',
    4: 'bg-emerald-600 dark:bg-emerald-400',
  }

  if (series.length === 0) {
    return <p className="text-xs text-gray-500">表示するデータがありません</p>
  }

  return (
    <div className="text-xs">
      <div
        className="grid grid-flow-col"
        style={{
          gridTemplateRows: `repeat(7, ${cellSize}px)`,
          gap: `${cellGap}px`,
        }}
      >
        {weeks.flatMap((week, wi) =>
          week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`empty-${wi}-${di}`}
                  className="opacity-0"
                  style={{ width: cellSize, height: cellSize }}
                />
              )
            }
            const level = levelFor(day.count)
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} コミット`}
                className={`rounded-sm ${levelClass[level]}`}
                style={{ width: cellSize, height: cellSize }}
              />
            )
          }),
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
        <span>{series[0]?.date}</span>
        <div className="flex items-center gap-1">
          <span>少</span>
          {[0, 1, 2, 3, 4].map((lv) => (
            <div
              key={lv}
              className={`rounded-sm ${levelClass[lv]}`}
              style={{ width: cellSize - 2, height: cellSize - 2 }}
            />
          ))}
          <span>多</span>
        </div>
        <span>{series[series.length - 1]?.date}</span>
      </div>
    </div>
  )
}
