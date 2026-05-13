import { useEffect } from 'react'
import { useSettings } from './useSettings'

/**
 * `settings.theme` の値に従って `<html>` に `dark` クラスを付け外しする。
 * - 'light'  → `dark` クラスを外す
 * - 'dark'   → `dark` クラスを付ける
 * - 'system' → OS の prefers-color-scheme に追従し、変更時にも反応する
 */
export function useThemeSync() {
  const { settings } = useSettings()
  const theme = settings?.theme ?? 'system'

  useEffect(() => {
    const root = document.documentElement
    const applySystem = () => {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', dark)
    }

    if (theme === 'dark') {
      root.classList.add('dark')
      return
    }
    if (theme === 'light') {
      root.classList.remove('dark')
      return
    }
    // system
    applySystem()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', applySystem)
    return () => mq.removeEventListener('change', applySystem)
  }, [theme])
}
