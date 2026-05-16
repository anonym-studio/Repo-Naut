const stack = ['Rust', 'Tauri v2', 'React 18', 'TypeScript', 'Tailwind CSS']

const points = [
  {
    label: 'Tauri v2 + Rust',
    detail: 'Electron の数分の一のメモリ消費。ネイティブバイナリで macOS に溶け込む。',
  },
  {
    label: 'git2（libgit2）',
    detail: 'Git 操作を Rust から直接呼び出し。コマンドプロセスを起動しないため高速。',
  },
  {
    label: 'rayon による並列スキャン',
    detail: 'ワークスペーススキャンを並列処理。リポジトリが 100 件超えても遅くならない。',
  },
  {
    label: 'notify + 800ms debounce',
    detail: '.git/HEAD の変化をファイルシステム監視で検知。コミット後に自動再スキャン。',
  },
  {
    label: 'ローカルファースト',
    detail: 'データは JSON 3 ファイルのみ。クラウドなし・会員登録なし・完全プライベート。',
  },
]

export function Technology() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10 text-center">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-[#94A3B8]">
          Technology
        </h2>
        <p className="text-3xl font-bold text-[#F8FAFC] md:text-4xl">なぜ速いのか。</p>
      </div>

      {/* Stack badges */}
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {stack.map((name) => (
          <span
            key={name}
            className="rounded-full border border-[#1E2330] bg-[#0F1117] px-4 py-1.5 font-mono text-sm text-[#94A3B8]"
          >
            {name}
          </span>
        ))}
      </div>

      {/* Points */}
      <div className="space-y-4">
        {points.map((point) => (
          <div
            key={point.label}
            className="flex gap-4 rounded-xl border border-[#1E2330] bg-[#0F1117] p-5"
          >
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]" />
            <div>
              <span className="font-mono text-sm font-medium text-[#F8FAFC]">{point.label}</span>
              <span className="ml-2 text-sm text-[#94A3B8]">— {point.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
