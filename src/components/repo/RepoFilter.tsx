import { useAppStore } from '../../store/useAppStore'

interface Props {
  availableLanguages: string[]
  availableTags: string[]
  total: number
  filtered: number
}

export function RepoFilter({ availableLanguages, availableTags, total, filtered }: Props) {
  const {
    filterLanguage,
    setFilterLanguage,
    filterTags,
    setFilterTags,
    filterStatus,
    setFilterStatus,
    sortKey,
    setSortKey,
    viewMode,
    setViewMode,
  } = useAppStore()

  const toggleTag = (t: string) => {
    setFilterTags(filterTags.includes(t) ? filterTags.filter((x) => x !== t) : [...filterTags, t])
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
      <Select
        label="ステータス"
        value={filterStatus}
        onChange={(v) => setFilterStatus(v as 'active' | 'archived' | 'all')}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'archived', label: 'Archived' },
          { value: 'all', label: 'All' },
        ]}
      />
      <Select
        label="言語"
        value={filterLanguage ?? ''}
        onChange={(v) => setFilterLanguage(v || null)}
        options={[{ value: '', label: 'すべて' }, ...availableLanguages.map((l) => ({ value: l, label: l }))]}
      />
      <Select
        label="並び順"
        value={sortKey}
        onChange={(v) => setSortKey(v as 'lastCommit' | 'name' | 'language')}
        options={[
          { value: 'lastCommit', label: '更新日時' },
          { value: 'name', label: '名前' },
          { value: 'language', label: '主要言語' },
        ]}
      />

      <div className="flex gap-1">
        {(['card', 'list'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setViewMode(m)}
            className={`text-xs border rounded px-2 py-1 ${
              viewMode === m
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {m === 'card' ? 'カード' : 'リスト'}
          </button>
        ))}
      </div>

      <span className="text-xs text-gray-500 ml-auto">
        {filtered} / {total}
      </span>

      {availableTags.length > 0 && (
        <div className="w-full flex flex-wrap gap-1 mt-1">
          {availableTags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTag(t)}
              className={`text-[10px] px-2 py-0.5 rounded ${
                filterTags.includes(t)
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-gray-500">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
