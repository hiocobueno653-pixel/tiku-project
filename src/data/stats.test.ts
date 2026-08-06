import { describe, expect, it } from 'vitest'
import {
  buildWeekView,
  computeDifficultyCounts,
  computeSubjectCounts,
  fillDailyRecords,
} from './stats'
import type { Question } from './types'

const makeQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'Q.001',
  subject: 'math',
  category: '函数',
  difficulty: 'medium',
  content: '题干',
  options: [
    { key: 'A', text: '1' },
    { key: 'B', text: '2' },
    { key: 'C', text: '3' },
    { key: 'D', text: '4' },
  ],
  answer: 'A',
  explanation: '',
  createdAt: '2026-08-05',
  favorite: false,
  ...overrides,
})

describe('computeSubjectCounts', () => {
  it('counts questions by subject', () => {
    const questions = [
      makeQuestion({ subject: 'math' }),
      makeQuestion({ subject: 'math' }),
      makeQuestion({ subject: 'chemistry' }),
    ]

    const counts = computeSubjectCounts(questions)
    expect(counts.find((s) => s.id === 'math')?.count).toBe(2)
    expect(counts.find((s) => s.id === 'chemistry')?.count).toBe(1)
    expect(counts.find((s) => s.id === 'english')?.count).toBe(0)
  })
})

describe('computeDifficultyCounts', () => {
  it('counts difficulties and the total', () => {
    const questions = [
      makeQuestion({ difficulty: 'simple' }),
      makeQuestion({ difficulty: 'simple' }),
      makeQuestion({ difficulty: 'hard' }),
    ]

    expect(computeDifficultyCounts(questions)).toEqual({
      all: 3,
      simple: 2,
      medium: 0,
      hard: 1,
    })
  })
})

describe('fillDailyRecords', () => {
  it('fills missing days with zero values and keeps recent N days', () => {
    const today = new Date()
    const iso = (offset: number) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    }
    const records = [
      { date: iso(0), answered: 5, correct: 4 },
      { date: iso(3), answered: 10, correct: 8 },
    ]

    const filled = fillDailyRecords(records, 7)

    expect(filled).toHaveLength(7)
    expect(filled[6]).toEqual({ date: iso(0), answered: 5, correct: 4 })
    expect(filled[3]).toEqual({ date: iso(3), answered: 10, correct: 8 })
    expect(filled[5]).toEqual({ date: iso(1), answered: 0, correct: 0 })
    expect(filled[0]).toEqual({ date: iso(6), answered: 0, correct: 0 })
  })

  it('preserves the existing record when multiple days are missing in between', () => {
    const today = new Date()
    const iso = (offset: number) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${m}-${day}`
    }
    const records = [{ date: iso(2), answered: 7, correct: 5 }]

    const filled = fillDailyRecords(records, 4)

    expect(filled).toHaveLength(4)
    expect(filled[1]).toEqual({ date: iso(2), answered: 7, correct: 5 })
  })
})

describe('buildWeekView', () => {
  it('never marks future days of the current week as filled (regression)', () => {
    // 今天是周三（2026-08-05），连续打卡 10 天
    const view = buildWeekView(10, new Date(2026, 7, 5))
    const byDay = Object.fromEntries(view.map((v) => [v.day, v.state]))

    // 周一、周二在过去 → filled
    expect(byDay['一']).toBe('filled')
    expect(byDay['二']).toBe('filled')
    // 周三 = 今天
    expect(byDay['三']).toBe('current')
    // 周四到周日是未来 → 必须 empty，即使 streakDays 很大
    expect(byDay['四']).toBe('empty')
    expect(byDay['五']).toBe('empty')
    expect(byDay['六']).toBe('empty')
    expect(byDay['日']).toBe('empty')
  })

  it('marks only days covered by streak on a Sunday', () => {
    // 今天是周日（2026-08-09），连续打卡 2 天 → 只有周六（昨天）是 filled
    const view = buildWeekView(2, new Date(2026, 7, 9))
    const byDay = Object.fromEntries(view.map((v) => [v.day, v.state]))

    expect(byDay['六']).toBe('filled')
    expect(byDay['五']).toBe('empty')
    expect(byDay['一']).toBe('empty')
    expect(byDay['日']).toBe('current')
  })

  it('orders days Monday-first and caps filled by streak length', () => {
    // 今天是周三，连续打卡 2 天 → 只有昨天（周二）是 filled
    const view = buildWeekView(2, new Date(2026, 7, 5))
    expect(view.map((v) => v.day)).toEqual(['一', '二', '三', '四', '五', '六', '日'])
    expect(view[1].state).toBe('filled')
    expect(view[0].state).toBe('empty')
  })

  it('returns empty state when streak is zero', () => {
    const view = buildWeekView(0, new Date(2026, 7, 5))
    expect(view.every((v) => v.state === 'empty' || v.state === 'current')).toBe(true)
    expect(view.filter((v) => v.state === 'filled')).toHaveLength(0)
  })
})
