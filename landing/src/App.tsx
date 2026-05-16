import { Hero } from './sections/Hero'
import { Problem } from './sections/Problem'
import { Features } from './sections/Features'
import { Technology } from './sections/Technology'
import { Cta } from './sections/Cta'
import { Footer } from './sections/Footer'

const DOWNLOAD_URL = '#' // TODO: GitHub Releases URL が確定したら更新
const GITHUB_URL = 'https://github.com/mkoguchi/repo-naut'

export function App() {
  return (
    <div className="min-h-screen bg-[#05070A] text-[#F8FAFC] antialiased">
      {/* Sticky nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#1E2330]/60 bg-[#05070A]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <img src="/icon-base.png" alt="Repo-Naut icon" className="h-6 w-6 rounded" />
            <span className="text-sm font-semibold tracking-tight text-[#F8FAFC]">Repo-Naut</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[#94A3B8] sm:flex">
            <a href="#features" className="transition-colors hover:text-[#F8FAFC]">機能</a>
            <a href="#technology" className="transition-colors hover:text-[#F8FAFC]">Technology</a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[#F8FAFC]"
            >
              GitHub
            </a>
          </nav>
          <a
            href={DOWNLOAD_URL}
            className="rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] px-4 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            ダウンロード
          </a>
        </div>
      </header>

      <main>
        <Hero />
        <div id="features">
          <Problem />
          <Features />
        </div>
        <div id="technology">
          <Technology />
        </div>
        <Cta />
      </main>

      <Footer />
    </div>
  )
}
