import { describe, expect, it } from 'vitest'
import { computeDifficultyCounts, computeSubjectCounts, fillDailyRecords } from './stats'
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
