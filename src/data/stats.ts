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
