import { useEffect, useRef, useState } from 'react'
import { useRunScript, useScripts } from '../../hooks/useScripts'
import { GitResultModal, type GitResult } from '../common/GitResultModal'
import { toast } from '../../store/useToast'

interface Props {
  repoPath: string
  /** ボタンのバリエーション。コンパクトはカード用、デフォルトは RepoDetail 用 */
  variant?: 'compact' | 'default'
}

/**
 * 登録済みカスタムスクリプトをワンクリックで実行するボタン。
 *
 * クリックでドロップダウンを表示し、選択したスクリプトを `run_script` で実行する。
 * 実行結果は `GitResultModal` で表示し、`onRetry` で再実行も可能。
 */
export function ScriptRunButton({ repoPath, variant = 'default' }: Props) {
  const { scripts } = useScripts()
  const runScript = useRunScript()
  const [menuOpen, setMenuOpen] = useState(false)
  const [result, setResult] = useState<GitResult | null>(null)
  // 「もう一度実行」用に最後に実行したスクリプトを覚えておく
  const [lastScriptId, setLastScriptId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const run = (scriptId: string, scriptName: string) => {
    setMenuOpen(false)
    setLastScriptId(scriptId)
    runScript.mutate(
      { scriptId, repoPath },
      {
        onSuccess: (res) => {
          setResult({ command: scriptName, context: '(script)', result: res })
          if (res.success) {
            toast.success(`「${scriptName}」を実行しました`)
          }
        },
        onError: (e) => toast.error(`実行に失敗: ${(e as Error).message}`),
      },
    )
  }

  const handleRetry = () => {
    if (!lastScriptId) return
    const script = scripts.find((s) => s.id === lastScriptId)
    if (!script) return
    run(script.id, script.name)
  }

  if (scripts.length === 0) {
    return null
  }

  const buttonCls =
    variant === 'compact'
      ? 'text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700'
      : 'text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700'

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={runScript.isPending}
        title="登録済みスクリプトを実行"
        className={buttonCls}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        {runScript.isPending ? '実行中...' : 'Run ▾'}
      </button>

      {menuOpen && (
        <ul
          role="menu"
          className="absolute right-0 mt-1 z-20 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1"
        >
          {scripts.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="menuitem"
                onClick={() => run(s.id, s.name)}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-[10px] text-gray-500 font-mono truncate" title={s.command}>
                  {s.command}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <GitResultModal
        open={!!result}
        onClose={() => setResult(null)}
        result={result}
        onRetry={lastScriptId ? handleRetry : undefined}
        retrying={runScript.isPending}
      />
    </div>
  )
}
