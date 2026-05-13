import { createHashRouter } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Repos } from './pages/Repos'
import { RepoDetail } from './pages/RepoDetail'
import { Kanban } from './pages/Kanban'
import { Archive } from './pages/Archive'
import { Settings } from './pages/Settings'

// Tauriアプリはサーバーがないため createHashRouter を使用
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'repos', element: <Repos /> },
      { path: 'repos/:id', element: <RepoDetail /> },
      { path: 'kanban', element: <Kanban /> },
      { path: 'archive', element: <Archive /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])
