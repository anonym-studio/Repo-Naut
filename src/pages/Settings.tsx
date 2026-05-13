import { useState } from 'react'
import { open, save, ask } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
import type { EditorPreset, Settings as SettingsType, TerminalPreset } from '../types'
import { useSettings } from '../hooks/useSettings'
import { useAddWorkspace, useRemoveWorkspace } from '../hooks/useWorkspaces'
import { useEditor } from '../hooks/useEditor'
import { useGhAuthStatus } from '../hooks/useRepoCreate'
import {
  useDeletePat,
  useHasPat,
  useSavePat,
  useValidatePat,
} from '../hooks/useGithub'
import {
  useAddScript,
  useRemoveScript,
  useScripts,
  useUpdateScript,
} from '../hooks/useScripts'
import {
  useExportData,
  useImportData,
  usePreviewBackup,
  type ImportSummary,
} from '../hooks/useBackup'
import { Spinner } from '../components/common/Spinner'
import { toast } from '../store/useToast'
import type { ScriptConfig } from '../types'

export function Settings() {
  return (
    <div className="space-y-10 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <WorkspaceSection />
      <ScanSection />
      <EditorSection />
      <TerminalSection />
      <GhSection />
      <GithubPatSection />
      <ScriptsSection />
      <BackupSection />
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
  { id: 'ghostty', label: 'Ghostty (macOS / Linux)', sub: 'open -na Ghostty --args --working-directory=...' },
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
          <div className="pt-2 space-y-1">
            <Field label="カスタムコマンド">
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="例: alacritty / wezterm start / open -a Ghostty"
                className={inputCls}
              />
            </Field>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              スペースで program と引数に分割します。
              <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded mx-1">
                {'{path}'}
              </code>
              プレースホルダがあれば対象リポジトリのパスに置換、無ければ cwd として渡します。
            </p>
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

// ---------- GitHub PAT ----------

function GithubPatSection() {
  const { data: hasPat, isLoading } = useHasPat()
  const validate = useValidatePat()
  const save = useSavePat()
  const remove = useDeletePat()

  const [input, setInput] = useState('')
  const [revealed, setRevealed] = useState(false)
  // 直近の検証結果。Settings 内に表示する。
  const [lastValidation, setLastValidation] = useState<{
    valid: boolean
    message: string
  } | null>(null)

  const handleValidate = async (pat?: string) => {
    const target = (pat ?? input).trim()
    if (!target) {
      toast.error('PAT を入力してください')
      return null
    }
    try {
      const result = await validate.mutateAsync(target)
      if (result.valid) {
        const scopeText = result.scopes && result.scopes.length > 0 ? ` / scope: ${result.scopes}` : ''
        setLastValidation({
          valid: true,
          message: `${result.login ?? 'unknown'} として認証成功${scopeText}`,
        })
        return result
      }
      setLastValidation({ valid: false, message: result.message ?? '検証に失敗しました' })
      return result
    } catch (e) {
      setLastValidation({ valid: false, message: (e as Error).message })
      return null
    }
  }

  const handleSave = async () => {
    const target = input.trim()
    if (!target) {
      toast.error('PAT を入力してください')
      return
    }
    const result = await handleValidate(target)
    if (!result?.valid) {
      // 検証失敗時は保存しない
      return
    }
    try {
      await save.mutateAsync(target)
      setInput('')
      setRevealed(false)
      toast.success('PAT を保存しました')
    } catch (e) {
      toast.error(`保存に失敗: ${(e as Error).message}`)
    }
  }

  const handleDelete = async () => {
    const ok = await ask('保存済みの PAT を削除しますか？\n削除すると PR/Issue バッジが表示されなくなります。', {
      title: 'PAT を削除',
      kind: 'warning',
    })
    if (!ok) return
    try {
      await remove.mutateAsync()
      setLastValidation(null)
      toast.success('PAT を削除しました')
    } catch (e) {
      toast.error(`削除に失敗: ${(e as Error).message}`)
    }
  }

  // 保存済み PAT で /user を叩いて疎通確認する
  const [testing, setTesting] = useState(false)
  const handleTestExisting = async () => {
    setTesting(true)
    try {
      const result = await invoke<{
        valid: boolean
        login?: string
        scopes?: string
        message?: string
      }>('validate_stored_pat')
      if (result.valid) {
        const scopeText = result.scopes ? ` / scope: ${result.scopes}` : ''
        toast.success(`接続成功: ${result.login ?? 'unknown'}${scopeText}`)
        setLastValidation({
          valid: true,
          message: `${result.login ?? 'unknown'} として認証成功${scopeText}`,
        })
      } else {
        toast.error(result.message ?? '接続に失敗しました')
        setLastValidation({ valid: false, message: result.message ?? '接続に失敗しました' })
      }
    } catch (e) {
      toast.error(`接続に失敗: ${e}`)
      setLastValidation({ valid: false, message: String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Section
      title="GitHub PAT 連携"
      description="Personal Access Token を OS のキーチェーンに保存し、リポジトリカードに PR/Issue 数バッジを表示します。"
    >
      {isLoading ? (
        <Spinner label="読み込み中" />
      ) : hasPat ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px]"
            >
              ✓
            </span>
            <span>PAT は保存済みです（値はキーチェーンから取り出せません）</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleTestExisting}
              disabled={testing}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {testing ? '接続テスト中...' : '接続テスト'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={remove.isPending}
              className="text-xs border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded px-3 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-50"
            >
              {remove.isPending ? '削除中...' : 'PAT を削除'}
            </button>
          </div>
          <PatNoteBlock />
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Personal Access Token">
            <div className="flex gap-2 items-stretch">
              <input
                type={revealed ? 'text' : 'password'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ghp_xxx... または github_pat_xxx..."
                className={inputCls}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                title={revealed ? '隠す' : '表示する'}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {revealed ? '隠す' : '表示'}
              </button>
            </div>
          </Field>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleValidate()}
              disabled={validate.isPending || !input.trim()}
              className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {validate.isPending ? '検証中...' : '検証のみ'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={save.isPending || validate.isPending || !input.trim()}
              className={primaryBtn}
            >
              {save.isPending ? '保存中...' : '検証して保存'}
            </button>
          </div>
          <PatNoteBlock />
        </div>
      )}

      {lastValidation && (
        <div
          className={`mt-3 text-xs px-3 py-2 rounded border ${
            lastValidation.valid
              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {lastValidation.message}
        </div>
      )}
    </Section>
  )
}

function PatNoteBlock() {
  return (
    <p className="text-[11px] text-gray-500 leading-relaxed">
      推奨スコープ: <code className="font-mono">repo</code>（または fine-grained PAT で
      <code className="font-mono mx-1">Issues: Read</code>と
      <code className="font-mono mx-1">Pull requests: Read</code>）。
      <br />
      PAT は OS キーチェーンに保存され、JSON ファイルには書き込まれません。
    </p>
  )
}

// ---------- Custom Scripts ----------

function ScriptsSection() {
  const { scripts, isLoading } = useScripts()
  const add = useAddScript()
  const remove = useRemoveScript()
  const update = useUpdateScript()

  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', command: '', description: '' })
  const [editing, setEditing] = useState<ScriptConfig | null>(null)

  const resetDraft = () => setDraft({ name: '', command: '', description: '' })

  const handleAdd = async () => {
    if (!draft.name.trim() || !draft.command.trim()) {
      toast.error('名前とコマンドは必須です')
      return
    }
    try {
      await add.mutateAsync({
        name: draft.name,
        command: draft.command,
        description: draft.description || undefined,
      })
      toast.success(`スクリプト「${draft.name}」を追加しました`)
      resetDraft()
      setCreating(false)
    } catch (e) {
      toast.error(`追加に失敗: ${(e as Error).message}`)
    }
  }

  const handleDelete = async (s: ScriptConfig) => {
    const ok = await ask(`スクリプト「${s.name}」を削除しますか？`, {
      title: 'スクリプトを削除',
      kind: 'warning',
    })
    if (!ok) return
    try {
      await remove.mutateAsync(s.id)
      toast.success(`「${s.name}」を削除しました`)
    } catch (e) {
      toast.error(`削除に失敗: ${(e as Error).message}`)
    }
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    if (!editing.name.trim() || !editing.command.trim()) {
      toast.error('名前とコマンドは必須です')
      return
    }
    try {
      await update.mutateAsync({
        id: editing.id,
        name: editing.name,
        command: editing.command,
        description: editing.description ?? '',
      })
      toast.success(`「${editing.name}」を更新しました`)
      setEditing(null)
    } catch (e) {
      toast.error(`更新に失敗: ${(e as Error).message}`)
    }
  }

  return (
    <Section
      title="カスタムスクリプト"
      description="リポジトリ単位でワンクリック実行できるコマンドを登録します。リポジトリカード・詳細画面の「Run」から呼び出せます。"
    >
      {isLoading ? (
        <Spinner label="読み込み中" />
      ) : (
        <div className="space-y-3">
          {scripts.length === 0 && !creating ? (
            <p className="text-xs text-gray-500">
              登録されたスクリプトはありません。「+ 追加」から作成してください。
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {scripts.map((s) =>
                editing?.id === s.id ? (
                  <li key={s.id} className="py-3 space-y-2">
                    <Field label="名前">
                      <input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="コマンド">
                      <input
                        value={editing.command}
                        onChange={(e) => setEditing({ ...editing, command: e.target.value })}
                        className={`${inputCls} font-mono`}
                      />
                    </Field>
                    <Field label="説明 (任意)">
                      <input
                        value={editing.description ?? ''}
                        onChange={(e) =>
                          setEditing({ ...editing, description: e.target.value })
                        }
                        className={inputCls}
                      />
                    </Field>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={update.isPending}
                        className={primaryBtn}
                      >
                        {update.isPending ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </li>
                ) : (
                  <li key={s.id} className="py-2 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500 font-mono truncate" title={s.command}>
                        {s.command}
                      </p>
                      {s.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{s.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        削除
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>
          )}

          {creating ? (
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
              <Field label="名前">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="例: lint / test / format"
                  className={inputCls}
                />
              </Field>
              <Field label="コマンド">
                <input
                  value={draft.command}
                  onChange={(e) => setDraft({ ...draft, command: e.target.value })}
                  placeholder="例: pnpm test / cargo fmt / git status"
                  className={`${inputCls} font-mono`}
                />
              </Field>
              <Field label="説明 (任意)">
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="このスクリプトの目的"
                  className={inputCls}
                />
              </Field>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                スペースで program と引数に分割します。
                <code className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded mx-1">
                  {'{path}'}
                </code>
                プレースホルダがあれば対象リポジトリのパスに置換、無ければ cwd として渡します。
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    resetDraft()
                  }}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={add.isPending}
                  className={primaryBtn}
                >
                  {add.isPending ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="text-xs border border-dashed border-gray-300 dark:border-gray-600 rounded w-full py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              + 追加
            </button>
          )}
        </div>
      )}
    </Section>
  )
}

// ---------- Backup / Restore ----------

function BackupSection() {
  const exportMut = useExportData()
  const previewMut = usePreviewBackup()
  const importMut = useImportData()
  const [pendingImport, setPendingImport] = useState<{
    path: string
    summary: ImportSummary
  } | null>(null)

  const handleExport = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const defaultName = `repohub-backup-${today}.json`
      const filePath = await save({
        title: 'バックアップ先を選択',
        defaultPath: defaultName,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (!filePath) return
      const result = await exportMut.mutateAsync(filePath)
      toast.success(`バックアップを保存しました (${formatBytes(result.size)})`)
    } catch (e) {
      toast.error(`エクスポートに失敗: ${(e as Error).message}`)
    }
  }

  const handleSelectImport = async () => {
    try {
      const selected = await open({
        title: 'インポートするバックアップを選択',
        multiple: false,
        directory: false,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      if (!selected || typeof selected !== 'string') return
      const summary = await previewMut.mutateAsync(selected)
      setPendingImport({ path: selected, summary })
    } catch (e) {
      toast.error(`バックアップの読み込みに失敗: ${(e as Error).message}`)
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    const ok = await ask(
      '現在のデータをバックアップで完全に置き換えます。元に戻すには事前に現在のデータをエクスポートしておく必要があります。続行しますか？',
      { title: 'インポートを実行', kind: 'warning' },
    )
    if (!ok) return
    try {
      const result = await importMut.mutateAsync(pendingImport.path)
      toast.success(
        `インポートしました: workspace ${result.settingsWorkspaces} / repo meta ${result.reposMetaCount} / tasks ${result.tasksCount}`,
      )
      setPendingImport(null)
    } catch (e) {
      toast.error(`インポートに失敗: ${(e as Error).message}`)
    }
  }

  return (
    <Section
      title="データの管理"
      description="設定・タグ・メモ・カンバンタスクを 1 つの JSON ファイルにまとめてバックアップ / 復元します。GitHub PAT は OS キーチェーンに保存されているためバックアップには含まれません。"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exportMut.isPending}
            className={primaryBtn}
          >
            {exportMut.isPending ? '書き出し中...' : 'エクスポート'}
          </button>
          <button
            type="button"
            onClick={handleSelectImport}
            disabled={previewMut.isPending || importMut.isPending}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {previewMut.isPending ? '読み込み中...' : 'インポート...'}
          </button>
        </div>

        {pendingImport && (
          <div className="border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
              インポート内容を確認してください
            </p>
            <dl className="text-[11px] grid grid-cols-2 gap-x-3 gap-y-0.5">
              <dt className="text-gray-500">ファイル</dt>
              <dd className="font-mono truncate" title={pendingImport.path}>
                {pendingImport.path}
              </dd>
              <dt className="text-gray-500">作成元バージョン</dt>
              <dd>v{pendingImport.summary.appVersion}</dd>
              <dt className="text-gray-500">作成時刻</dt>
              <dd>{pendingImport.summary.exportedAt}</dd>
              <dt className="text-gray-500">Workspace 数</dt>
              <dd>{pendingImport.summary.settingsWorkspaces}</dd>
              <dt className="text-gray-500">リポメタ件数</dt>
              <dd>{pendingImport.summary.reposMetaCount}</dd>
              <dt className="text-gray-500">タスク件数</dt>
              <dd>{pendingImport.summary.tasksCount}</dd>
            </dl>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-3 py-1"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importMut.isPending}
                className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded px-3 py-1"
              >
                {importMut.isPending ? '適用中...' : 'インポートを実行'}
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-gray-500 leading-relaxed">
          バックアップには workspaces / editors / scripts / 除外ディレクトリ / リポジトリのタグ・メモ / カンバンタスクが含まれます。
        </p>
      </div>
    </Section>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
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
