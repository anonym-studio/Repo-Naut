interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: 'ワークスペースを一瞬でスキャン',
    description:
      '登録したフォルダ配下の全リポジトリを Rust の並列処理で高速検索。最新コミット・ブランチ・未コミット数をリアルタイム表示。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'カードがコックピットになる',
    description:
      'GitHub/GitLab/Bitbucket リンク・エディタ起動・ターミナル・スクリプト実行・README プレビューがカード上に集約。VS Code / Cursor / Zed を登録して即起動。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="5" height="18" rx="1" />
        <rect x="10" y="3" width="5" height="12" rx="1" />
        <rect x="17" y="3" width="5" height="15" rx="1" />
      </svg>
    ),
    title: 'リポジトリ横断カンバン',
    description:
      'Todo / In Progress / Review / Done の 4 カラム。タスクをリポジトリに紐付けて管理できる、開発者のためのカンバンボード。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    title: 'アーカイブで整理',
    description:
      '古いプロジェクトは _archive/ へ移動。スナップショットメタを保存し、必要なときに元のパスへ復元できる。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: 'GitHub PAT 連携',
    description:
      'PAT を OS キーチェーンに安全保管。PR 数・Issue 数をカードにリアルタイム表示。Rate limit・認証エラーも適切にハンドリング。',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
      </svg>
    ),
    title: 'キーボードで即アクセス',
    description:
      'Cmd/Ctrl+K でコマンドパレット（リポジトリ・タスク・コミットを横断検索）。g+キーの Vim 風ナビゲーション、? でショートカット一覧。',
  },
]

export function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-12 text-center">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-[#94A3B8]">
          Core Features
        </h2>
        <p className="text-3xl font-bold text-[#F8FAFC] md:text-4xl">
          すべての作業を、一つの画面で。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="group rounded-xl border border-[#1E2330] bg-[#0F1117] p-6 transition-colors hover:border-[#3B82F6]/40"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[#1E2330] bg-[#05070A] text-[#3B82F6] transition-colors group-hover:border-[#3B82F6]/40 group-hover:bg-[#3B82F6]/10">
              <div className="h-5 w-5">{feature.icon}</div>
            </div>
            <h3 className="mb-2 font-semibold text-[#F8FAFC]">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-[#94A3B8]">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
