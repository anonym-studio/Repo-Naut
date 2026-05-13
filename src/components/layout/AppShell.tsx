import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'
import { WorkspaceSelector } from './WorkspaceSelector'
import { GhStatusBanner } from './GhStatusBanner'
import { Onboarding } from './Onboarding'
import { useSettings } from '../../hooks/useSettings'
import { useThemeSync } from '../../hooks/useThemeSync'
import { useWorkspaceWatcher } from '../../hooks/useWorkspaceWatcher'
import { Spinner } from '../common/Spinner'
import { CommandPalette } from '../common/CommandPalette'
import { Toaster } from '../common/Toaster'

export function AppShell() {
  const { settings, isLoading } = useSettings()
  useThemeSync()
  useWorkspaceWatcher()
  const needsOnboarding = !!settings && settings.workspaces.length === 0

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <TopNav />
      <GhStatusBanner />
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner label="設定を読み込み中..." />
        </div>
      ) : needsOnboarding ? (
        <main className="flex-1 overflow-auto">
          <Onboarding />
        </main>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-48 shrink-0 border-r border-gray-200 dark:border-gray-700 p-4">
            <WorkspaceSelector />
          </aside>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      )}
      <CommandPalette />
      <Toaster />
    </div>
  )
}
