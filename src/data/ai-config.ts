// AI 模型配置持久化 — Capacitor Preferences（原生）优先，localStorage 兜底

import type { AiApiConfig, AiProvider } from './types'

export const AI_PROVIDER_PRESETS: Record<AiProvider, { label: string; defaultModel: string; defaultBaseUrl: string }> = {
  openai: { label: 'OpenAI', defaultModel: 'gpt-4o-mini', defaultBaseUrl: 'https://api.openai.com/v1' },
  deepseek: { label: 'DeepSeek', defaultModel: 'deepseek-chat', defaultBaseUrl: 'https://api.deepseek.com/v1' },
  moonshot: { label: 'Moonshot Kimi', defaultModel: 'moonshot-v1-8k', defaultBaseUrl: 'https://api.moonshot.cn/v1' },
  custom: { label: '自定义', defaultModel: '', defaultBaseUrl: '' },
}

const AI_CONFIG_KEY = 'tiku.aiConfig.v1'
const AI_CONFIG_PREF_KEY = 'tiku.aiConfig' // Capacitor Preferences key (无版本号，自身管理迁移)

/**
 * 从 Capacitor Preferences 异步读取 AI 配置。
 * 首次调用时若 Preferences 中无数据，会尝试从旧 localStorage 迁移。
 */
export async function loadAiConfig(): Promise<AiApiConfig | null> {
  if (typeof window === 'undefined') return null
  try {
    // 动态导入，避免 Web 端首屏加载不必要的原生模块
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key: AI_CONFIG_PREF_KEY })
    if (value) {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed.provider === 'string') return parsed as AiApiConfig
    }

    // 迁移：旧数据可能还在 localStorage（明文），搬过来后清除
    const raw = window.localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed.provider === 'string') {
        await Preferences.set({ key: AI_CONFIG_PREF_KEY, value: raw })
        window.localStorage.removeItem(AI_CONFIG_KEY)
        return parsed as AiApiConfig
      }
    }
    return null
  } catch {
    // Preferences 不可用（纯 Web 无 Capacitor runtime），fallback 到 localStorage
    try {
      const raw = window.localStorage.getItem(AI_CONFIG_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed.provider !== 'string') return null
      return parsed as AiApiConfig
    } catch {
      return null
    }
  }
}

export async function saveAiConfig(cfg: AiApiConfig): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key: AI_CONFIG_PREF_KEY, value: JSON.stringify(cfg) })
    // 同步清除旧 localStorage 中的明文副本
    window.localStorage.removeItem(AI_CONFIG_KEY)
  } catch {
    // fallback
    try { window.localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
  }
}

export async function clearAiConfig(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.remove({ key: AI_CONFIG_PREF_KEY })
  } catch { /* ignore */ }
  try { window.localStorage.removeItem(AI_CONFIG_KEY) } catch { /* ignore */ }
}
