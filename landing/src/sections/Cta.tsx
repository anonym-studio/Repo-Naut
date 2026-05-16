import { GITHUB_REPO_URL, RELEASES_LATEST_URL } from '../constants'

const steps = [
  '.dmg ファイルをダブルクリックしてマウント',
  'Repo-Naut.app を /Applications フォルダへドラッグ',
  'Finder で Repo-Naut.app を右クリック →「開く」を選択',
  '警告ダイアログの「開く」をクリック',
]

export function Cta() {
  return (
    <section id="download" className="mx-auto max-w-3xl px-6 py-24 text-center">
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-[#8B5CF6] opacity-[0.06] blur-[100px]" />

      <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-[#94A3B8]">
        Download
      </h2>
      <p className="mb-2 text-3xl font-bold text-[#F8FAFC] md:text-4xl">今すぐ始める</p>
      <p className="mb-10 text-[#94A3B8]">無料・オープンソース・登録不要</p>

      {/* CTA button */}
      <a
        href={RELEASES_LATEST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-8 py-4 text-base font-semibold text-white shadow-lg transition-opacity hover:opacity-90"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        macOS 用をダウンロード (.dmg)
      </a>

      {/* Version + OS */}
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {['v0.1.0', 'macOS 12+', 'Apple Silicon / Intel 両対応'].map((badge) => (
          <span key={badge} className="rounded-full border border-[#1E2330] px-3 py-1 text-xs text-[#94A3B8]">
            {badge}
          </span>
        ))}
      </div>

      {/* GitHub star */}
      <div className="mb-12">
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-[#94A3B8] transition-colors hover:text-[#F8FAFC]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          ⭐ GitHub でスターを付ける
        </a>
      </div>

      {/* Unsigned warning box */}
      <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-6 text-left">
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-400">
          <span aria-hidden>⚠</span>
          初回起動時の注意（未署名アプリについて）
        </p>
        <p className="mb-4 text-sm leading-relaxed text-[#94A3B8]">
          Repo-Naut は現在 Apple Developer Program 未加入のため未署名です。
          macOS の Gatekeeper により初回起動時に警告が表示されますが、以下の手順で開くことができます。
          <strong className="text-[#F8FAFC]">2 回目以降は通常通りダブルクリックで起動できます。</strong>
        </p>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1E2330] font-mono text-[10px] text-[#94A3B8]">
                {i + 1}
              </span>
              <span className="text-[#94A3B8]">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-[#94A3B8]">
          ※ macOS 13 Ventura 以降ではダブルクリックで「開く」ボタンが表示されません。必ず右クリック→「開く」の手順を使ってください。
          <br />
          ターミナルを使う場合:{' '}
          <code className="rounded bg-[#0F1117] px-1.5 py-0.5 font-mono text-[#3B82F6]">
            xattr -cr /Applications/Repo-Naut.app
          </code>
        </p>
      </div>
    </section>
  )
}
