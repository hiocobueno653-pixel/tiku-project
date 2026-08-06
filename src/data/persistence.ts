// localStorage 持久化 — 所有带版本信封的读写操作
// 数据包装为 { __v, data } 信封格式，支持从旧版（无 __v）自动迁移

import type {
  ChatMessageRecord,
  DailyGoal,
  DailyPracticeRecord,
  LearningStats,
  Question,
  RecentActivity,
} from './types'

interface VersionedEnvelope<T> {
  __v: number
  data: T
}

/** 迁移函数表：migrators[0] 将 v1→v2，migrators[1] 将 v2→v3，依此类推 */
type Migrators<T> = ((old: unknown) => T)[]

function loadVersioned<T>(
  key: string,
  currentVersion: number,
  migrators: Migrators<T> = [],
): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // 无 __v → 旧版数据（视为 v1），直接当 data 用
    if (parsed && typeof parsed === 'object' && '__v' in parsed) {
      const env = parsed as VersionedEnvelope<T>
      let data = env.data
      for (let v = env.__v; v < currentVersion; v++) {
        const m = migrators[v - 1] // migrators[0] 升级 v1→v2
        if (m) data = m(data)
      }
      return data
    }
    // 旧格式（无信封），按 v1 走迁移链
    let data = parsed as T
    for (let v = 1; v < currentVersion; v++) {
      const m = migrators[v - 1]
      if (m) data = m(data)
    }
    return data
  } catch {
    return null
  }
}

function saveVersioned<T>(key: string, data: T, version: number): void {
  if (typeof window === 'undefined') return
  try {
    const env: VersionedEnvelope<T> = { __v: version, data }
    window.localStorage.setItem(key, JSON.stringify(env))
  } catch {
    // ignore quota / serialization errors
  }
}

/* ── 本地日期工具 ── */

export function localDateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return localDateISO(new Date())
}

/* ═══════════════════════════════════════════════════════════
   User-added questions persistence (localStorage)
   内置题目（QUESTIONS）只读；用户添加的题目持久化到 localStorage，
   在题库列表中前置显示，可编辑/删除。
   ═══════════════════════════════════════════════════════════ */
const USER_QUESTIONS_KEY = 'tiku.userQuestions.v1'
const USER_QUESTIONS_VER = 1

export function loadUserQuestions(): Question[] {
  const data = loadVersioned<Question[]>(USER_QUESTIONS_KEY, USER_QUESTIONS_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter((q) => q && typeof q.id === 'string') as Question[]
}

export function saveUserQuestions(qs: Question[]): void {
  saveVersioned(USER_QUESTIONS_KEY, qs, USER_QUESTIONS_VER)
}

const FAVORITE_IDS_KEY = 'tiku.favoriteIds.v1'
const FAVORITE_IDS_VER = 1

export function loadFavoriteIds(): string[] {
  const data = loadVersioned<string[]>(FAVORITE_IDS_KEY, FAVORITE_IDS_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter((id): id is string => typeof id === 'string')
}

export function saveFavoriteIds(ids: string[]): void {
  saveVersioned(FAVORITE_IDS_KEY, Array.from(new Set(ids)), FAVORITE_IDS_VER)
}

export function nextQuestionId(existing: Question[]): string {
  const nums = existing
    .map((q) => parseInt(q.id.replace(/^Q\./, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `Q.${String(max + 1).padStart(3, '0')}`
}

/* ═══════════════════════════════════════════════════════════
   Recent activities persistence (localStorage)
   练习完成后追加一条记录，首页"最近练习"读取此数据。
   ═══════════════════════════════════════════════════════════ */
const RECENT_ACTIVITIES_KEY = 'tiku.recentActivities.v1'
const RECENT_ACTIVITIES_VER = 1
const MAX_RECENT_ACTIVITIES = 20

export function loadRecentActivities(): RecentActivity[] {
  const data = loadVersioned<RecentActivity[]>(RECENT_ACTIVITIES_KEY, RECENT_ACTIVITIES_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter(
    (a) => a && typeof a.id === 'number' && typeof a.title === 'string',
  ) as RecentActivity[]
}

export function saveRecentActivities(list: RecentActivity[]): void {
  saveVersioned(RECENT_ACTIVITIES_KEY, list.slice(0, MAX_RECENT_ACTIVITIES), RECENT_ACTIVITIES_VER)
}

export function appendRecentActivity(activity: Omit<RecentActivity, 'id'>): RecentActivity[] {
  const list = loadRecentActivities()
  const nextId = list.length > 0 ? Math.max(...list.map((a) => a.id)) + 1 : 1
  const newItem: RecentActivity = { ...activity, id: nextId }
  const next = [newItem, ...list].slice(0, MAX_RECENT_ACTIVITIES)
  saveRecentActivities(next)
  return next
}

/* ═══════════════════════════════════════════════════════════
   Daily goals persistence (localStorage)
   每日目标由用户在 DailyGoal 页面添加/编辑/删除。
   ═══════════════════════════════════════════════════════════ */
const DAILY_GOALS_KEY = 'tiku.dailyGoals.v1'
const DAILY_GOALS_VER = 1

export function loadDailyGoals(): DailyGoal[] {
  const data = loadVersioned<DailyGoal[]>(DAILY_GOALS_KEY, DAILY_GOALS_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter(
    (g) => g && typeof g.id === 'string' && typeof g.text === 'string',
  ) as DailyGoal[]
}

export function saveDailyGoals(goals: DailyGoal[]): void {
  saveVersioned(DAILY_GOALS_KEY, goals, DAILY_GOALS_VER)
}

export function applyPracticeToDailyGoals(answered: number): DailyGoal[] {
  if (answered <= 0) return loadDailyGoals()
  const goals = loadDailyGoals()
  let remaining = answered
  const next = goals.map((g) => {
    if (remaining <= 0 || g.completed) return g
    const nextDone = Math.min(g.total, g.done + remaining)
    remaining -= Math.max(0, nextDone - g.done)
    return {
      ...g,
      done: nextDone,
      completed: nextDone >= g.total,
    }
  })
  saveDailyGoals(next)
  return next
}

/* ═══════════════════════════════════════════════════════════
   Learning statistics persistence (localStorage)
   累计做题数 / 正确数 / 连续打卡天数 / 已练习题数。
   ═══════════════════════════════════════════════════════════ */
const STATS_KEY = 'tiku.learningStats.v1'
const STATS_VER = 1

const DEFAULT_STATS: LearningStats = {
  totalAnswered: 0,
  totalCorrect: 0,
  streakDays: 0,
  lastPracticeISO: '',
  totalSeconds: 0,
}

export function loadLearningStats(): LearningStats {
  const data = loadVersioned<LearningStats>(STATS_KEY, STATS_VER)
  if (!data || typeof data !== 'object') return { ...DEFAULT_STATS }
  return {
    totalAnswered: Number(data.totalAnswered) || 0,
    totalCorrect: Number(data.totalCorrect) || 0,
    streakDays: Number(data.streakDays) || 0,
    lastPracticeISO: String(data.lastPracticeISO || ''),
    totalSeconds: Number(data.totalSeconds) || 0,
  }
}

export function saveLearningStats(stats: LearningStats): void {
  saveVersioned(STATS_KEY, stats, STATS_VER)
}

/**
 * 在一次练习完成后调用：累加做题数与正确数，并更新连续打卡。
 * 同时会追加一条每日练习记录，供 Statistics 页绘制趋势图。
 * @param correct 本次答对数
 * @param answered 本次作答数（不含跳过）
 * @param elapsedSeconds 本次用时（秒）
 */
export function recordPracticeSession(
  correct: number,
  answered: number,
  elapsedSeconds: number = 0,
): LearningStats {
  const prev = loadLearningStats()
  const today = todayISO()

  // 连续打卡：若上次是今天，不增；若上次是昨天，+1；否则重置为 1
  let streak = prev.streakDays
  if (prev.lastPracticeISO === today) {
    // 同一天多次练习，streak 不变
    if (streak === 0) streak = 1
  } else {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yISO = localDateISO(yesterday)
    if (prev.lastPracticeISO === yISO) {
      streak += 1
    } else {
      streak = 1
    }
  }

  const next: LearningStats = {
    totalAnswered: prev.totalAnswered + answered,
    totalCorrect: prev.totalCorrect + correct,
    streakDays: streak,
    lastPracticeISO: today,
    totalSeconds: prev.totalSeconds + Math.max(0, elapsedSeconds),
  }
  saveLearningStats(next)
  // 同步追加每日练习记录（用于趋势图），并推进每日目标
  appendDailyPractice({ date: today, answered, correct })
  applyPracticeToDailyGoals(answered)
  return next
}

/* ═══════════════════════════════════════════════════════════
   Daily practice history (localStorage)
   按日累计做题数与正确数，供 Statistics 页绘制趋势/柱状图。
   ═══════════════════════════════════════════════════════════ */
const DAILY_PRACTICE_KEY = 'tiku.dailyPractice.v1'
const DAILY_PRACTICE_VER = 1

export function loadDailyPracticeRecords(): DailyPracticeRecord[] {
  const data = loadVersioned<DailyPracticeRecord[]>(DAILY_PRACTICE_KEY, DAILY_PRACTICE_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter(
    (r) => r && typeof r.date === 'string' && typeof r.answered === 'number',
  ) as DailyPracticeRecord[]
}

export function saveDailyPracticeRecords(list: DailyPracticeRecord[]): void {
  saveVersioned(DAILY_PRACTICE_KEY, list, DAILY_PRACTICE_VER)
}

/**
 * 追加一条每日练习记录：同一天会累加 answered/correct。
 */
export function appendDailyPractice(
  record: Omit<DailyPracticeRecord, never>,
): DailyPracticeRecord[] {
  const list = loadDailyPracticeRecords()
  const existing = list.find((r) => r.date === record.date)
  if (existing) {
    existing.answered += record.answered
    existing.correct += record.correct
  } else {
    list.push({ ...record })
  }
  // 按日期升序保留
  list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  saveDailyPracticeRecords(list)
  return list
}

/* ═══════════════════════════════════════════════════════════
   AI Chat history persistence (localStorage)
   聊天记录持久化：只保存可序列化的字符串内容；ReactNode 会被字符串化。
   ═══════════════════════════════════════════════════════════ */
const CHAT_HISTORY_KEY = 'tiku.chatHistory.v1'
const CHAT_HISTORY_VER = 1
const MAX_CHAT_RECORDS = 200

export function loadChatHistory(): ChatMessageRecord[] {
  const data = loadVersioned<ChatMessageRecord[]>(CHAT_HISTORY_KEY, CHAT_HISTORY_VER)
  if (!data || !Array.isArray(data)) return []
  return data.filter(
    (m) => m && typeof m.id === 'string' && typeof m.content === 'string',
  ) as ChatMessageRecord[]
}

export function saveChatHistory(list: ChatMessageRecord[]): void {
  saveVersioned(CHAT_HISTORY_KEY, list.slice(-MAX_CHAT_RECORDS), CHAT_HISTORY_VER)
}

export function clearChatHistory(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CHAT_HISTORY_KEY)
  } catch {
    // ignore
  }
}
