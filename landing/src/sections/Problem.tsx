const pains = [
  'どのディレクトリにどのプロジェクトがあるか分からない',
  'git status するためにターミナルを何枚も開く',
  '「あのコード、どこのリポだっけ」で検索に時間を取られる',
  'タスクはバラバラのツールに散らかっている',
]

export function Problem() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <div className="rounded-2xl border border-[#1E2330] bg-[#0F1117] p-8 md:p-12">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-widest text-[#94A3B8]">
          The Problem
        </h2>
        <p className="mb-8 text-2xl font-bold leading-snug text-[#F8FAFC] md:text-3xl">
          プロジェクトが増えるほど、
          <br />
          リポジトリは迷子になる。
        </p>
        <ul className="space-y-4">
          {pains.map((pain) => (
            <li key={pain} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#3B82F6]/40 bg-[#3B82F6]/10 text-[10px] text-[#3B82F6]">
                ✕
              </span>
              <span className="text-[#94A3B8]">{pain}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
