import { create } from 'zustand'
import {
  loadUserQuestions, saveUserQuestions,
  loadRecentActivities, appendRecentActivity,
  loadDailyGoals, saveDailyGoals,
  loadLearningStats, recordPracticeSession,
  loadDailyPracticeRecords,
  loadChatHistory, saveChatHistory, clearChatHistory,
  loadFavoriteIds, saveFavoriteIds,
  nextQuestionId, todayISO,
} from '../data/persistence'
import type {
  Question, RecentActivity, DailyGoal,
  LearningStats, DailyPracticeRecord, ChatMessageRecord,
  ParsedQuestion,
} from '../data/types'

/**
 * 全局应用状态 Store
 * 初始化时从 localStorage 同步读取；action 变更状态后同步写回 localStorage。
 * AI 配置因使用 Capacitor Preferences（异步）不纳入此 store，由各页面自行加载。
 */
interface AppState {
  // ── 题库 ──
  questions: Question[]
  addQuestion: (data: Omit<Question, 'id' | 'createdAt' | 'favorite'>) => Question
  updateQuestion: (q: Question) => void
  deleteQuestion: (id: string) => void
  batchImport: (parsed: ParsedQuestion[]) => number

  // ── 收藏 ──
  favoriteIds: string[]
  toggleFavorite: (id: string) => void

  // ── 最近活动 ──
  activities: RecentActivity[]
  appendActivity: (a: Omit<RecentActivity, 'id'>) => void

  // ── 每日目标 ──
  goals: DailyGoal[]
  setGoals: (goals: DailyGoal[]) => void
  addGoal: (g: Omit<DailyGoal, 'id' | 'done' | 'completed'>) => void
  deleteGoal: (id: string) => void
  toggleGoal: (id: string) => void

  // ── 学习统计 ──
  stats: LearningStats
  recordSession: (correct: number, answered: number, elapsedSeconds: number) => void

  // ── 每日练习记录 ──
  dailyRecords: DailyPracticeRecord[]

  // ── 聊天记录 ──
  chatHistory: ChatMessageRecord[]
  setChatHistory: (list: ChatMessageRecord[]) => void
  clearChat: () => void

  // ── 刷新（从 localStorage 重新加载全部）──
  refresh: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  // ────────────────── 题库 ──────────────────
  questions: loadUserQuestions(),

  addQuestion: (data) => {
    const { questions } = get()
    const newQ: Question = {
      ...data,
      id: nextQuestionId(questions),
      createdAt: todayISO(),
      favorite: false,
    }
    const next = [newQ, ...questions]
    saveUserQuestions(next)
    set({ questions: next })
    return newQ
  },

  updateQuestion: (q) => {
    const { questions } = get()
    const next = questions.map((uq) => (uq.id === q.id ? q : uq))
    saveUserQuestions(next)
    set({ questions: next })
  },

  deleteQuestion: (id) => {
    const { questions, favoriteIds } = get()
    const next = questions.filter((uq) => uq.id !== id)
    saveUserQuestions(next)
    const nextFavorites = favoriteIds.filter((fid) => fid !== id)
    if (nextFavorites.length !== favoriteIds.length) saveFavoriteIds(nextFavorites)
    set({ questions: next, favoriteIds: nextFavorites })
  },

  batchImport: (parsed) => {
    if (parsed.length === 0) return 0
    const { questions } = get()
    const existing = [...questions]
    const newQs: Question[] = parsed.map((p) => {
      const newQ: Question = {
        ...p,
        id: nextQuestionId(existing),
        createdAt: todayISO(),
        favorite: false,
      }
      existing.push(newQ)
      return newQ
    })
    const next = [...newQs, ...questions]
    saveUserQuestions(next)
    set({ questions: next })
    return newQs.length
  },

  favoriteIds: loadFavoriteIds(),

  toggleFavorite: (id) => {
    const { favoriteIds } = get()
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((x) => x !== id)
      : [...favoriteIds, id]
    saveFavoriteIds(next)
    set({ favoriteIds: next })
  },

  // ────────────────── 最近活动 ──────────────────
  activities: loadRecentActivities(),

  appendActivity: (a) => {
    const next = appendRecentActivity(a)
    set({ activities: next })
  },

  // ────────────────── 每日目标 ──────────────────
  goals: loadDailyGoals(),

  setGoals: (goals) => {
    saveDailyGoals(goals)
    set({ goals })
  },

  addGoal: (g) => {
    const { goals } = get()
    const goal: DailyGoal = { ...g, id: `g-${Date.now()}`, done: 0, completed: false }
    const next = [...goals, goal]
    saveDailyGoals(next)
    set({ goals: next })
  },

  deleteGoal: (id) => {
    const { goals } = get()
    const next = goals.filter((g) => g.id !== id)
    saveDailyGoals(next)
    set({ goals: next })
  },

  toggleGoal: (id) => {
    const { goals } = get()
    const next = goals.map((g) => {
      if (g.id !== id) return g
      if (g.completed) {
        return { ...g, completed: false, done: g.done === g.total ? Math.max(0, g.total - 1) : g.done }
      }
      return { ...g, completed: true, done: g.total }
    })
    saveDailyGoals(next)
    set({ goals: next })
  },

  // ────────────────── 学习统计 ──────────────────
  stats: loadLearningStats(),

  recordSession: (correct, answered, elapsedSeconds) => {
    const next = recordPracticeSession(correct, answered, elapsedSeconds)
    set({
      stats: next,
      dailyRecords: loadDailyPracticeRecords(),
      goals: loadDailyGoals(), // recordPracticeSession 内部会推进目标进度
    })
  },

  // ────────────────── 每日练习记录 ──────────────────
  dailyRecords: loadDailyPracticeRecords(),

  // ────────────────── 聊天记录 ──────────────────
  chatHistory: loadChatHistory(),

  setChatHistory: (list) => {
    saveChatHistory(list)
    set({ chatHistory: list })
  },

  clearChat: () => {
    clearChatHistory()
    set({ chatHistory: [] })
  },

  // ────────────────── 刷新 ──────────────────
  refresh: () => {
    set({
      questions: loadUserQuestions(),
      favoriteIds: loadFavoriteIds(),
      activities: loadRecentActivities(),
      goals: loadDailyGoals(),
      stats: loadLearningStats(),
      dailyRecords: loadDailyPracticeRecords(),
      chatHistory: loadChatHistory(),
    })
  },
}))
