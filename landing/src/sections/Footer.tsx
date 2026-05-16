import { GITHUB_REPO_URL, RELEASES_URL } from '../constants'

export function Footer() {
  return (
    <footer className="border-t border-[#1E2330] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-3">
          <img src="/icon-base.png" alt="Repo-Naut icon" className="h-7 w-7 rounded" />
          <span className="font-semibold text-[#F8FAFC]">Repo-Naut</span>
        </div>

        <div className="flex items-center gap-6 text-sm text-[#94A3B8]">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#F8FAFC]"
          >
            GitHub
          </a>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-[#F8FAFC]"
          >
            ダウンロード
          </a>
        </div>

        <p className="text-xs text-[#94A3B8]">© 2026 anonym-studio</p>
      </div>
    </footer>
  )
}
