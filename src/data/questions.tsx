// Sample data for the question bank app — matches the design drafts' content

export type Difficulty = 'simple' | 'medium' | 'hard'

export interface Question {
  id: string
  subject: SubjectId
  category: string
  difficulty: Difficulty
  content: string
  options: { key: string; text: string }[]
  answer: string // correct option key
  explanation: string
  createdAt: string
  favorite: boolean
}

export type SubjectId = 'math' | 'english' | 'physics' | 'chemistry'

export interface Subject {
  id: SubjectId
  name: string
  count: number
  icon: 'math' | 'english' | 'physics' | 'chemistry'
}

export const SUBJECTS: Subject[] = [
  { id: 'math', name: '高中数学', count: 0, icon: 'math' },
  { id: 'english', name: '英语语法', count: 0, icon: 'english' },
  { id: 'physics', name: '物理力学', count: 0, icon: 'physics' },
  { id: 'chemistry', name: '化学反应', count: 0, icon: 'chemistry' },
]

export const CATEGORIES = ['全部', '数学', '英语', '物理', '化学'] as const

/**
 * 内置题目库已清空 —— 所有题目均由用户自行添加（手动新增 / 上传试卷）。
 * 数据持久化在 localStorage（见 loadUserQuestions / saveUserQuestions）。
 */
export const QUESTIONS: Question[] = []

/**
 * 最近的练习记录 —— 初始为空，由练习完成后写入 localStorage。
 * 见 loadRecentActivities / saveRecentActivities / appendRecentActivity。
 */
export interface RecentActivity {
  id: number
  title: string
  time: string
  score: number
  completed: boolean
}

export const RECENT_ACTIVITIES: RecentActivity[] = []

export interface DailyGoal {
  id: string
  text: string
  total: number
  done: number
  completed: boolean
}

/**
 * 每日目标初始为空 —— 由用户在"每日目标"页面自行添加。
 * 见 loadDailyGoals / saveDailyGoals。
 */
export const DAILY_GOALS: DailyGoal[] = []

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: React.ReactNode
  examples?: { title: string; body: string }[]
}

// Simulated AI replies for keyword-based demo responses
export function generateAiReply(question: string): { content: React.ReactNode } {
  const q = question.trim()
  if (/牛顿|第二定律|第三定律|力学/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>牛顿第二定律（F = ma）</strong>描述的是力、质量和加速度之间的定量关系：物体受到的合力等于质量乘以加速度。它告诉我们力是如何改变物体运动状态的。</p>
          <p className="mb-2"><strong>牛顿第三定律（作用力与反作用力）</strong>指出，两个物体之间的作用力和反作用力总是大小相等、方向相反、作用在同一条直线上。</p>
          <p>简单来说，第二定律研究的是一个物体受力后如何运动，而第三定律描述的是两个物体之间力的相互关系。两者适用于不同的分析场景。</p>
        </>
      ),
    }
  }
  if (/导数|极值|函数/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>求函数极值的步骤：</strong></p>
          <p className="mb-1">1. 求导数 f'(x)；</p>
          <p className="mb-1">2. 令 f'(x) = 0，解出驻点；</p>
          <p className="mb-1">3. 用 f''(x) 或列表法判断驻点是极大值还是极小值；</p>
          <p>4. 比较驻点和端点的函数值，确定最值。</p>
        </>
      ),
    }
  }
  if (/定语从句|关系代词|that|which/.test(q)) {
    return {
      content: (
        <>
          <p className="mb-2"><strong>定语从句关系代词选择要点：</strong></p>
          <p className="mb-1">• 先行词是<strong>人</strong>：用 who / whom / that</p>
          <p className="mb-1">• 先行词是<strong>物</strong>：用 which / that</p>
          <p className="mb-1">• <strong>what</strong> 不能引导定语从句，它本身包含先行词</p>
          <p>• 介词后只能用 whom / which，不能用 that</p>
        </>
      ),
    }
  }
  return {
    content: (
      <>
        <p className="mb-2">这是一个很好的问题。让我从基础概念入手帮你理解：</p>
        <p className="mb-2">学习这类知识点时，建议先掌握核心定义，再通过具体例题巩固理解，最后归纳解题套路。</p>
        <p>如果你能告诉我具体是哪道题或者哪个概念不清楚，我可以给出更针对性的解释。</p>
      </>
    ),
  }
}

export const SUBJECT_COLORS: Record<SubjectId, string> = {
  math: '#2F6BFF',
  english: '#00B578',
  physics: '#FF8F1F',
  chemistry: '#F54A45',
}

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

export function difficultyLabel(d: Difficulty): string {
  return d === 'simple' ? '简单' : d === 'medium' ? '中等' : '困难'
}

/* ═══════════════════════════════════════════════════════════
   Versioned storage helpers
   将数据包装为 { __v, data } 信封格式，支持从旧版（无 __v）自动迁移。
   迁移函数签名: (oldData, oldVersion) => newData
   ═══════════════════════════════════════════════════════════ */
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

function localDateISO(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayISO(): string {
  return localDateISO(new Date())
}

/**
 * 根据用户题库动态计算每个科目的题目数量。
 * 返回新的 SUBJECTS 数组（不修改原数组）。
 */
export function computeSubjectCounts(userQuestions: Question[]): Subject[] {
  const counts: Record<SubjectId, number> = {
    math: 0,
    english: 0,
    physics: 0,
    chemistry: 0,
  }
  for (const q of userQuestions) {
    if (q.subject in counts) counts[q.subject]++
  }
  return SUBJECTS.map((s) => ({ ...s, count: counts[s.id] }))
}

/**
 * 根据用户题库动态计算各难度的题目数量。
 */
export function computeDifficultyCounts(userQuestions: Question[]): {
  all: number
  simple: number
  medium: number
  hard: number
} {
  const c = { all: userQuestions.length, simple: 0, medium: 0, hard: 0 }
  for (const q of userQuestions) {
    if (q.difficulty === 'simple') c.simple++
    else if (q.difficulty === 'medium') c.medium++
    else if (q.difficulty === 'hard') c.hard++
  }
  return c
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
export interface LearningStats {
  totalAnswered: number // 累计做题数（不含跳过）
  totalCorrect: number // 累计答对数
  streakDays: number // 连续打卡天数
  lastPracticeISO: string // 最近一次练习日期 YYYY-MM-DD
  totalSeconds: number // 累计学习时长（秒）
}

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
export interface DailyPracticeRecord {
  date: string // YYYY-MM-DD
  answered: number
  correct: number
}

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
export function appendDailyPractice(record: Omit<DailyPracticeRecord, never>): DailyPracticeRecord[] {
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

/**
 * 纯函数：将原始练习记录填充为最近 N 天的连续序列（不足的天数补零）。
 * 不读 localStorage，可由 Zustand 消费者直接传入 store 中的 dailyRecords。
 */
export function fillDailyRecords(
  records: DailyPracticeRecord[],
  days: number,
): DailyPracticeRecord[] {
  const result: DailyPracticeRecord[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = localDateISO(d)
    const found = records.find((r) => r.date === iso)
    result.push({
      date: iso,
      answered: found?.answered ?? 0,
      correct: found?.correct ?? 0,
    })
  }
  return result
}

/**
 * 获取最近 N 天的练习记录（不足的天数补零），用于绘制趋势图。
 */
export function getRecentDailyPractice(days: number): DailyPracticeRecord[] {
  return fillDailyRecords(loadDailyPracticeRecords(), days)
}

/* ═══════════════════════════════════════════════════════════
   AI Chat API configuration persistence (localStorage)
   ═══════════════════════════════════════════════════════════ */
export type AiProvider = 'openai' | 'deepseek' | 'moonshot' | 'custom'

export interface AiApiConfig {
  provider: AiProvider
  model: string
  apiKey: string
  baseUrl: string
}

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

/* ═══════════════════════════════════════════════════════════
   AI Chat history persistence (localStorage)
   聊天记录持久化：只保存可序列化的字符串内容；ReactNode 会被字符串化。
   ═══════════════════════════════════════════════════════════ */
export interface ChatMessageRecord {
  id: string
  role: 'user' | 'ai'
  content: string // 序列化后的纯文本
  isLocalMock?: boolean // 标记本地示例回复
  isError?: boolean // 标记错误回退
  errorDetail?: string
  ts: number // 时间戳
}

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

/* ═══════════════════════════════════════════════════════════
   Exam Parser — upload image / PDF / text → AI → structured questions
   ═══════════════════════════════════════════════════════════ */

// 试卷解析后得到的题目结构（不含 id/createdAt/favorite，由调用方补全）
export interface ParsedQuestion {
  subject: SubjectId
  category: string
  difficulty: Difficulty
  content: string
  options: { key: string; text: string }[]
  answer: string
  explanation: string
}

export interface ExamParseResult {
  questions: ParsedQuestion[]
  raw?: string
}

const EXAM_PARSE_PROMPT = `你是一位试卷题目识别助手。请分析用户提供的试卷内容（图片或文本），识别出所有"选择题"（每题 4 个选项 A/B/C/D 的单选题），并以 JSON 数组格式返回。

输出格式要求：
- 仅返回 JSON 数组，不要任何 Markdown 代码块标记、不要任何说明文字
- 数组每项包含字段：
  - "subject": "math" | "english" | "physics" | "chemistry" 之一（按题目内容判断）
  - "category": 字符串，简短的知识点分类，如"函数与导数"
  - "difficulty": "simple" | "medium" | "hard" 之一
  - "content": 字符串，题目题干
  - "options": 数组，4 项，每项 { "key": "A"|"B"|"C"|"D", "text": "选项内容" }
  - "answer": "A"|"B"|"C"|"D"，正确答案。若试卷未给出答案，给出最可能的选择
  - "explanation": 字符串，解析说明；若试卷未给出，写""

规则：
1. 只识别选择题，跳过填空题/解答题/作文题
2. 选项内容保留原始文本，不要省略
3. 题干要完整，包含所有题号、材料背景
4. 如果识别不到任何选择题，返回空数组 []`

/**
 * 解析试卷图片为题目数组（调用 OpenAI 兼容的 vision API）
 * @param images base64 dataURL 数组，例如 ["data:image/jpeg;base64,..."]
 */
export async function parseExamImagesWithAi(
  cfg: AiApiConfig,
  images: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<ExamParseResult> {
  if (images.length === 0) {
    return { questions: [] }
  }

  // 多图分批发送（每批最多 3 张，避免 token 超限）
  const BATCH_SIZE = 3
  const allQuestions: ParsedQuestion[] = []

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    onProgress?.(i, images.length)

    const userContent: Array<
      { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
    > = [
      {
        type: 'text',
        text: `${EXAM_PARSE_PROMPT}\n\n本次共 ${batch.length} 张图片，请合并识别为单个 JSON 数组。`,
      },
      ...batch.map((dataUrl) => ({
        type: 'image_url' as const,
        image_url: { url: dataUrl },
      })),
    ]

    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.1,
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.slice(0, 200) : ''}`)
    }

    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? ''
    const parsed = extractJsonArray(reply)
    allQuestions.push(...parsed)
  }
  onProgress?.(images.length, images.length)

  return { questions: allQuestions, raw: '' }
}

/**
 * 解析试卷文本为题目数组（调用 OpenAI 兼容的 chat API）
 */
export async function parseExamTextWithAi(
  cfg: AiApiConfig,
  text: string,
): Promise<ExamParseResult> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: EXAM_PARSE_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      stream: false,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.slice(0, 200) : ''}`)
  }

  const data = await res.json()
  const reply: string = data?.choices?.[0]?.message?.content ?? ''
  const questions = extractJsonArray(reply)
  return { questions, raw: reply }
}

/**
 * 从 AI 返回的文本中提取 JSON 数组（兼容带 ```json 代码块、纯 JSON、首尾多余字符等情况）
 */
export function extractJsonArray(text: string): ParsedQuestion[] {
  if (!text) return []
  // 1. 优先尝试 ```json ... ``` 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    const parsed = tryParse(codeBlockMatch[1])
    if (parsed) return normalizeQuestions(parsed)
  }
  // 2. 尝试找到第一个 [ 到最后一个 ]
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    const jsonStr = text.slice(start, end + 1)
    const parsed = tryParse(jsonStr)
    if (parsed) return normalizeQuestions(parsed)
  }
  // 3. 直接尝试整段
  const parsed = tryParse(text)
  if (parsed) return normalizeQuestions(parsed)
  return []
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s.trim())
  } catch {
    return null
  }
}

export function normalizeQuestions(raw: unknown): ParsedQuestion[] {
  if (!Array.isArray(raw)) return []
  const validSubjects: SubjectId[] = ['math', 'english', 'physics', 'chemistry']
  const validDifficulties: Difficulty[] = ['simple', 'medium', 'hard']
  return raw
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .map((q) => {
      const subject = validSubjects.includes(q.subject as SubjectId)
        ? (q.subject as SubjectId)
        : 'math'
      const difficulty = validDifficulties.includes(q.difficulty as Difficulty)
        ? (q.difficulty as Difficulty)
        : 'medium'
      const options = Array.isArray(q.options)
        ? (q.options as unknown[])
            .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
            .map((o) => ({
              key: String(o.key ?? '').toUpperCase().slice(0, 1),
              text: String(o.text ?? ''),
            }))
            .filter((o) => /^[A-D]$/.test(o.key) && o.text.length > 0)
        : []
      const answer = String(q.answer ?? '').toUpperCase().slice(0, 1)
      return {
        subject,
        category: String(q.category ?? '').trim() || '未分类',
        difficulty,
        content: String(q.content ?? '').trim(),
        options,
        answer: /^[A-D]$/.test(answer) ? answer : 'A',
        explanation: String(q.explanation ?? '').trim(),
      }
    })
    .filter((q) => q.content.length > 0 && q.options.length === 4)
}

/**
 * 将 PDF 文件的每一页渲染为图片 dataURL（动态加载 pdfjs-dist，避免首屏体积）
 */
export async function pdfToImages(
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  // 动态导入 pdfjs-dist，仅在用户上传 PDF 时加载
  const pdfjs = await import('pdfjs-dist')
  // vite 支持 ?url 形式导入 worker
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const total = pdf.numPages
  const images: string[] = []

  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total)
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    // pdfjs 渲染需要白色背景，否则透明
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    images.push(dataUrl)
  }

  onProgress?.(total, total)
  return images
}

/**
 * 将 File（图片）转为 dataURL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 读取文本文件内容
 */
export async function fileToText(file: File): Promise<string> {
  return await file.text()
}
