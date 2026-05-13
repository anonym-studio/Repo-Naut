import { useSettings } from '../../hooks/useSettings'

export function WorkspaceSelector() {
  const { settings, setActiveWorkspace } = useSettings()

  if (!settings) return null

  const active = settings.workspaces.find((w) => w.id === settings.activeWorkspaceId)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">Workspace</p>
      <select
        value={settings.activeWorkspaceId}
        onChange={(e) => setActiveWorkspace(e.target.value)}
        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
      >
        {settings.workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
      {active && (
        <p className="text-xs text-gray-400 mt-1 truncate" title={active.path}>
          {active.path}
        </p>
      )}
    </div>
  )
}
