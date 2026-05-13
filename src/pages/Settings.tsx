import { useState } from 'react'
import { open, ask } from '@tauri-apps/plugin-dialog'
import type { EditorPreset, Settings as SettingsType, TerminalPreset } from '../types'
import { useSettings } from '../hooks/useSettings'
import { useAddWorkspace, useRemoveWorkspace } from '../hooks/useWorkspaces'
import { useEditor } from '../hooks/useEditor'
import { useGhAuthStatus } from '../hooks/useRepoCreate'
import { Spinner } from '../components/common/Spinner'
import { toast } from '../store/useToast'

export function Settings() {
  return (
    <div className="space-y-10 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <WorkspaceSection />
      <ScanSection />
      <EditorSection />
      <TerminalSection />
      <GhSection />
      <ThemeSection />
    </div>
  )
}

// ---------- Workspaces ----------

function WorkspaceSection() {
  const { settings } = useSettings()
  const addWorkspace = useAddWorkspace()
  const removeWorkspace = useRemoveWorkspace()
  const [name, setName] = useState('')
  const [path, setPath] = useState('')

  if (!settings) return null

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return
    addWorkspace.mutate(
      { name: name.trim(), path: path.trim() },
      {
        onSuccess: () => {
          setName('')
          setPath('')
          toast.success(`Workspace「${name.trim()}」を登録しました`)
        },
        onError: (e) => toast.error(`登録に失敗: ${(e as Error).message}`),
      },
    )
  }

  const handlePickDir = async () => {
    const selected = await open({ directory: true, multiple: false, title: 'Workspace のルートディレクトリを選択' })
    if (typeof selected === 'string') {
      setPath(selected)
      if (!name.trim()) {
        const segments = selected.split(/[/\\]/).filter(Boolean)
        const last = segments[segments.length - 1]
        if (last) setName(last)
      }
    }
  }

  const handleRemove = async (id: string, label: string) => {
    const ok = await ask(`Workspace「${label}」を削除しますか？\n\nリポジトリ自体は削除されません。`, {
      title: 'Workspace を削除',
      kind: 'warning',
    })
    if (!ok) return
    removeWorkspace.mutate(id, {
      onSuccess: () => toast.success(`「${label}」を削除しました`),
      onError: (e) => toast.error(`削除に失敗: ${(e as Error).message}`),
    })
  }

  return (
    <Section title="Workspace" description="Gitリポジトリをスキャンするルートディレクトリを登録します。">
      <ul className="space-y-2">
        {settings.workspaces.length === 0 && (
          <li className="text-sm text-gray-500">登録済みのWorkspaceはありません</li>
        )}
        {settings.workspaces.map((ws) => (
          <li
            key={ws.id}
            className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{ws.name}</div>
              <div className="text-xs text-gray-500 truncate" title={ws.path}>
                {ws.path}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(ws.id, ws.name)}
              className="text-xs text-red-600 hover:text-red-700 ml-3 shrink-0"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="mt-4 grid grid-cols-[160px_1fr_auto_auto] gap-2 items-end">
        <Field label="名前">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Personal"
            className={inputCls}
          />
        </Field>
        <Field label="パス">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/projects"
            className={inputCls}
          />
        </Field>
        <button
          type="button"
          onClick={handlePickDir}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          参照…
        </button>
        <button type="submit" className={primaryBtn} disabled={addWorkspace.isPending}>
          {addWorkspace.isPending ? '追加中...' : '追加'}
        </button>
      </form>
      {addWorkspace.isPending && (
        <div className="mt-2">
          <Spinner label="Workspaceを登録中..." />
        </div>
      )}
      {addWorkspace.isError && (
        <p className="text-xs text-red-600 mt-2">{(addWorkspace.error as Error).message}</p>
      )}
    </Section>
  )
}

// ---------- Editors ----------

const presetTemplates: Record<Exclude<EditorPreset, 'custom'>, { name: string; command: string }> = {
  vscode: { name: 'VS Code', command: 'code' },
  cursor: { name: 'Cursor', command: 'cursor' },
  windsurf: { name: 'Windsurf', command: 'windsurf' },
  zed: { name: 'Zed', command: 'zed' },
}

function EditorSection() {
  const { editors, defaultEditor, addEditor, removeEditor, setDefaultEditor } = useEditor()
  const [customName, setCustomName] = useState('')
  const [customCommand, setCustomCommand] = useState('')

  const handleRemove = async (id: string, name: string) => {
    const ok = await ask(`エディタ「${name}」を削除しますか？`, {
      title: 'エディタを削除',
      kind: 'warning',
    })
    if (!ok) return
    removeEditor(id)
    toast.success(`「${name}」を削除しました`)
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customName.trim() || !customCommand.trim()) return
    addEditor({
      name: customName.trim(),
      command: customCommand.trim(),
      args: [],
      preset: 'custom',
    })
    setCustomName('')
    setCustomCommand('')
  }

  const handleAddPreset = (preset: Exclude<EditorPreset, 'custom'>) => {
    const tpl = presetTemplates[preset]
    addEditor({ name: tpl.name, command: tpl.command, args: [], preset })
  }

  const availablePresets = (Object.keys(presetTemplates) as Array<Exclude<EditorPreset, 'custom'>>).filter(
    (p) => !editors.some((e) => e.preset === p),
  )

  return (
    <Section title="エディタ" description="リポジトリカードから起動するエディタを管理します。">
      <ul className="space-y-2">
        {editors.map((ed) => (
          <li
            key={ed.id}
            className="flex items-center justify-between border border-gray-200 dark:border-gray-700 rounded px-3 py-2"
          >
            <div className="min-w-0 flex items-center gap-3">
              <input
                type="radio"
                name="default-editor"
                checked={defaultEditor?.id === ed.id}
                onChange={() => setDefaultEditor(ed.id)}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium">
                  {ed.name}
                  {defaultEditor?.id === ed.id && (
                    <span className="ml-2 text-xs text-blue-600">デフォルト</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 font-mono">{ed.command}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(ed.id, ed.name)}
              className="text-xs text-red-600 hover:text-red-700"
            >
              削除
            </button>
          </li>
        ))}
      </ul>

      {availablePresets.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-gray-500 mb-1">プリセットから追加</div>
          <div className="flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleAddPreset(p)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                + {presetTemplates[p].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAddCustom} className="mt-4 grid grid-cols-[160px_1fr_auto] gap-2 items-end">
        <Field label="名前">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Antigravity"
            className={inputCls}
          />
        </Field>
        <Field label="コマンド">
          <input
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder="antigravity"
            className={inputCls}
          />
        </Field>
        <button type="submit" className={primaryBtn}>
          カスタム追加
        </button>
      </form>
    </Section>
  )
}

// ---------- gh CLI ----------

function GhSection() {
  const { data: gh, isLoading } = useGhAuthStatus()

  return (
    <Section title="GitHub CLI (gh)" description="リポジトリ作成機能で使用します。">
      {isLoading ? (
        <p className="text-sm text-gray-500">確認中...</p>
      ) : !gh?.installed ? (
        <p className="text-sm text-red-600">
          gh コマンドが見つかりません。
          <a
            href="https://cli.github.com/"
            target="_blank"
            rel="noreferrer"
            className="underline ml-1"
          >
            インストール方法
          </a>
        </p>
      ) : !gh.authenticated ? (
        <p className="text-sm text-amber-600">
          未認証です。ターミナルで <code className="font-mono">gh auth login</code> を実行してください。
        </p>
      ) : (
        <p className="text-sm text-green-600">
          認証済み（{gh.username ?? 'unknown user'}）
        </p>
      )}
    </Section>
  )
}

// ---------- Scan / Excluded Directories ----------

function ScanSection() {
  const { settings, updateSettings } = useSettings()
  const [draft, setDraft] = useState('')
  if (!settings) return null

  const excluded = settings.excludedDirs ?? []

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    if (excluded.includes(v)) {
      toast.error(`「${v}」は既に追加されています`)
      return
    }
    updateSettings({ excludedDirs: [...excluded, v] } as Partial<SettingsType>)
    setDraft('')
    toast.success(`「${v}」をスキャン除外に追加`)
  }
  const handleRemove = (name: string) => {
    updateSettings({ excludedDirs: excluded.filter((n) => n !== name) } as Partial<SettingsType>)
  }

  return (
    <Section
      title="スキャン除外ディレクトリ"
      description="リポジトリ検索時にスキップするディレクトリ名（node_modules / target / dist 等は既定で除外）"
    >
      {excluded.length === 0 ? (
        <p className="text-xs text-gray-500">追加の除外設定はありません</p>
      ) : (
        <ul className="flex flex-wrap gap-2 mb-3">
          {excluded.map((d) => (
            <li
              key={d}
              className="flex items-center gap-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
            >
              <span className="font-mono">{d}</span>
              <button
                type="button"
                onClick={() => handleRemove(d)}
                className="text-gray-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex gap-2 items-end">
        <Field label="ディレクトリ名">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="vendor"
            className={inputCls}
          />
        </Field>
        <button type="submit" className={primaryBtn}>
          追加
        </button>
      </form>
    </Section>
  )
}

// ---------- Terminal ----------

const terminalPresets: Array<{ id: TerminalPreset; label: string; sub?: string }> = [
  { id: 'auto', label: '自動 (推奨)', sub: 'mac: iTerm→Terminal、win: wt→cmd' },
  { id: 'iterm2', label: 'iTerm2 (macOS)' },
  { id: 'terminal_app', label: 'Terminal.app (macOS)' },
  { id: 'windows_terminal', label: 'Windows Terminal' },
  { id: 'cmd', label: 'cmd.exe' },
  { id: 'custom', label: 'カスタムコマンド' },
]

function TerminalSection() {
  const { settings, updateSettings } = useSettings()
  if (!settings) return null
  const preset = settings.terminal?.preset ?? 'auto'
  const command = settings.terminal?.command ?? ''

  const setPreset = (next: TerminalPreset) => {
    updateSettings({
      terminal: { ...settings.terminal, preset: next },
    } as Partial<SettingsType>)
  }
  const setCommand = (next: string) => {
    updateSettings({
      terminal: { ...settings.terminal, command: next || undefined },
    } as Partial<SettingsType>)
  }

  return (
    <Section title="ターミナル" description="リポジトリカードの「Terminal」で起動するアプリ。">
      <div className="space-y-2">
        {terminalPresets.map((p) => (
          <label key={p.id} className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="terminal-preset"
              checked={preset === p.id}
              onChange={() => setPreset(p.id)}
              className="mt-1"
            />
            <span>
              {p.label}
              {p.sub && <span className="block text-xs text-gray-500">{p.sub}</span>}
            </span>
          </label>
        ))}
        {preset === 'custom' && (
          <div className="pt-2">
            <Field label="カスタムコマンド（cwd でリポジトリを開く）">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="alacritty / kitty / wezterm ..."
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------- Theme ----------

function ThemeSection() {
  const { settings, updateSettings } = useSettings()
  if (!settings) return null
  const themes: Array<SettingsType['theme']> = ['light', 'dark', 'system']

  return (
    <Section title="テーマ" description="アプリの配色を切り替えます。">
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => updateSettings({ theme: t } as Partial<SettingsType>)}
            className={`text-xs border rounded px-3 py-1 ${
              settings.theme === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </Section>
  )
}

// ---------- 共通 UI ----------

const inputCls =
  'w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500'

const primaryBtn =
  'text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-1'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </header>
      <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-white dark:bg-gray-800">
        {children}
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs text-gray-500 flex flex-col gap-1">
      <span>{label}</span>
      {children}
    </label>
  )
}
