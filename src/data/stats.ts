// 统计计算 — 纯函数，不直接读写 localStorage（依赖由调用方或 persistence 提供）

import { localDateISO } from './persistence'
import { SUBJECTS } from './sample-data'
import type { DailyPracticeRecord, Question, Subject, SubjectId } from './types'

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

/** 周视图单日状态 */
export interface WeekDayView {
  day: string
  state: 'filled' | 'current' | 'empty'
  label: string
}

/**
 * 基于连续打卡天数构建本周（周一为一周起点）打卡视图。
 * 只把过去且距今不超过 streakDays-1 天的日期标记为 filled；
 * 未来日期永远不会被标记为已打卡。
 * @param streakDays 连续打卡天数（≥0）
 * @param today 参考日期（默认当天，便于测试注入）
 */
export function buildWeekView(streakDays: number, today: Date = new Date()): WeekDayView[] {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const todayIdx = today.getDay()
  // 今天相对本周一（周一为一周起点）的天数：周日=6，周一=0 ... 周六=5
  const mondayOffset = (todayIdx + 6) % 7
  // 周一开始：调整顺序为 一/二/三/四/五/六/日
  const order = [1, 2, 3, 4, 5, 6, 0]
  return order.map((dow) => {
    const isToday = dow === todayIdx
    // 该天在本周相对周一的位置（周一=0 ... 周日=6）
    const dayOffset = dow === 0 ? 6 : dow - 1
    // 该天相对今天的天数：负数=过去，0=今天，正数=未来（本周剩余）
    const diff = dayOffset - mondayOffset
    // 连续打卡覆盖：仅当该天在过去 且 距今不超过 streakDays-1 天时视为已打卡
    const filled = !isToday && diff >= -(streakDays - 1) && diff < 0 && streakDays > 0
    return {
      day: dayNames[dow],
      state: isToday ? 'current' : filled ? 'filled' : 'empty',
      label: isToday ? '今日' : dayNames[dow],
    }
  })
}
