// 领域类型定义 — 题库应用共享的类型模型

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

export interface RecentActivity {
  id: number
  title: string
  time: string
  score: number
  completed: boolean
}

export interface DailyGoal {
  id: string
  text: string
  total: number
  done: number
  completed: boolean
}

/** 累计学习统计（localStorage 持久化） */
export interface LearningStats {
  totalAnswered: number // 累计做题数（不含跳过）
  totalCorrect: number // 累计答对数
  streakDays: number // 连续打卡天数
  lastPracticeISO: string // 最近一次练习日期 YYYY-MM-DD
  totalSeconds: number // 累计学习时长（秒）
}

/** 按日累计的练习记录，供统计页绘制趋势图 */
export interface DailyPracticeRecord {
  date: string // YYYY-MM-DD
  answered: number
  correct: number
}

export type AiProvider = 'openai' | 'deepseek' | 'moonshot' | 'custom'

export interface AiApiConfig {
  provider: AiProvider
  model: string
  apiKey: string
  baseUrl: string
}

/** 聊天记录（持久化用，只保存可序列化字符串） */
export interface ChatMessageRecord {
  id: string
  role: 'user' | 'ai'
  content: string // 序列化后的纯文本
  isLocalMock?: boolean // 标记本地示例回复
  isError?: boolean // 标记错误回退
  errorDetail?: string
  ts: number // 时间戳
}

/** 试卷解析后得到的题目结构（不含 id/createdAt/favorite，由调用方补全） */
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
