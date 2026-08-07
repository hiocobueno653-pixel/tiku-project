import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  loadThemePreference,
  saveThemePreference,
  resolveTheme,
  type ThemePreference,
} from '../data/persistence'

/**
 * 主题 hook：默认跟随系统，手动切换后持久化为显式选择。
 * 返回当前实际主题与切换函数（light ↔ dark）。
 */
export function useTheme(): { theme: 'light' | 'dark'; toggleTheme: () => void } {
  const [pref, setPref] = useState<ThemePreference>(() => loadThemePreference())
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => applyTheme(loadThemePreference()))

  // 仅在"跟随系统"时监听系统主题变化；事件回调中 setState 是允许的
  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      applyTheme('system')
      setResolved(resolveTheme('system'))
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [pref])

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolved === 'dark' ? 'light' : 'dark'
    saveThemePreference(next)
    setPref(next)
    setResolved(applyTheme(next))
  }, [resolved])

  return useMemo(
    () => ({ theme: resolved, toggleTheme }),
    [resolved, toggleTheme],
  )
}
