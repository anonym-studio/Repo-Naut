import { Link } from 'react-router-dom'
import { useGhAuthStatus } from '../../hooks/useRepoCreate'

export function GhStatusBanner() {
  const { data: gh } = useGhAuthStatus()
  if (!gh) return null
  if (gh.installed && gh.authenticated) return null

  return (
    <div className="bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-6 py-2 text-xs flex items-center gap-3">
      <span>
        {gh.installed
          ? 'gh は未認証です。リポジトリ作成機能を使うには `gh auth login` を実行してください。'
          : 'GitHub CLI (gh) がインストールされていません。リポジトリ作成機能を使うには gh のインストールが必要です。'}
      </span>
      <Link to="/settings" className="underline">
        設定を開く
      </Link>
    </div>
  )
}
