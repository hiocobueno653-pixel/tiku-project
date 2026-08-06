import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  appendRecentActivity,
  applyPracticeToDailyGoals,
  loadFavoriteIds,
  loadRecentActivities,
  nextQuestionId,
  recordPracticeSession,
  saveDailyGoals,
  saveFavoriteIds,
} from './persistence'
import { computeSubjectCounts, fillDailyRecords } from './stats'
import { extractJsonArray, normalizeQuestions } from './exam-parser'
import type { Question } from './types'
import { useAppStore } from '../store/useAppStore'

describe('nextQuestionId', () => {
  it('starts at Q.001 for an empty bank', () => {
    expect(nextQuestionId([])).toBe('Q.001')
  })

  it('increments from the highest existing numeric id', () => {
    const existing = [
      { id: 'Q.007' },
      { id: 'Q.009' },
      { id: 'Q.010' },
    ] as Question[]
    expect(nextQuestionId(existing)).toBe('Q.011')
  })

  it('ignores non-numeric ids', () => {
    expect(nextQuestionId([{ id: 'legacy-1' }] as Question[])).toBe('Q.001')
  })
})

describe('computeSubjectCounts', () => {
  it('counts questions by subject without mutating the base list', () => {
    const questions = [
      { subject: 'math' },
      { subject: 'math' },
      { subject: 'english' },
    ] as Question[]
    const counts = computeSubjectCounts(questions)
    expect(counts.find((s) => s.id === 'math')?.count).toBe(2)
    expect(counts.find((s) => s.id === 'english')?.count).toBe(1)
    expect(counts.find((s) => s.id === 'physics')?.count).toBe(0)
  })
})

describe('recordPracticeSession', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('accumulates totals and keeps the streak on the same day', () => {
    vi.setSystemTime(new Date('2026-07-31T08:00:00'))
    const first = recordPracticeSession(3, 5, 120)
    expect(first).toMatchObject({
      totalAnswered: 5,
      totalCorrect: 3,
      streakDays: 1,
      totalSeconds: 120,
    })

    const second = recordPracticeSession(1, 2, 30)
    expect(second).toMatchObject({
      totalAnswered: 7,
      totalCorrect: 4,
      streakDays: 1,
      totalSeconds: 150,
    })
  })

  it('increments the streak when practice happens on the next day', () => {
    vi.setSystemTime(new Date('2026-07-31T08:00:00'))
    recordPracticeSession(1, 1, 10)

    vi.setSystemTime(new Date('2026-08-01T08:00:00'))
    const next = recordPracticeSession(1, 1, 10)
    expect(next.streakDays).toBe(2)
  })
})

describe('applyPracticeToDailyGoals', () => {
  it('distributes answered count across incomplete goals in order', () => {
    saveDailyGoals([
      { id: 'g1', text: '数学', total: 10, done: 0, completed: false },
      { id: 'g2', text: '英语', total: 5, done: 0, completed: false },
    ])

    const next = applyPracticeToDailyGoals(12)
    expect(next[0]).toMatchObject({ done: 10, completed: true })
    expect(next[1]).toMatchObject({ done: 2, completed: false })
  })

  it('does not regress already completed goals', () => {
    saveDailyGoals([
      { id: 'g1', text: '数学', total: 5, done: 5, completed: true },
      { id: 'g2', text: '英语', total: 5, done: 0, completed: false },
    ])

    const next = applyPracticeToDailyGoals(3)
    expect(next[0]).toMatchObject({ done: 5, completed: true })
    expect(next[1]).toMatchObject({ done: 3, completed: false })
  })
})

describe('fillDailyRecords', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-01T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills missing days with zeros and keeps chronological order', () => {
    const result = fillDailyRecords(
      [{ date: '2026-07-31', answered: 3, correct: 2 }],
      3,
    )
    expect(result).toEqual([
      { date: '2026-07-30', answered: 0, correct: 0 },
      { date: '2026-07-31', answered: 3, correct: 2 },
      { date: '2026-08-01', answered: 0, correct: 0 },
    ])
  })
})

describe('appendRecentActivity', () => {
  it('keeps only the latest 20 activities', () => {
    for (let i = 0; i < 25; i++) {
      appendRecentActivity({
        title: `练习 ${i}`,
        time: '8月1日 10:00',
        score: 80,
        completed: true,
      })
    }

    const list = loadRecentActivities()
    expect(list).toHaveLength(20)
    expect(list[0].title).toBe('练习 24')
  })
})

describe('extractJsonArray', () => {
  it('extracts a JSON array wrapped in a markdown code block', () => {
    const raw =
      '说明文字\n```json\n' +
      '[{"subject":"math","category":"函数","difficulty":"medium","content":"题干","options":[{"key":"A","text":"1"},{"key":"B","text":"2"},{"key":"C","text":"3"},{"key":"D","text":"4"}],"answer":"B","explanation":"解析"}]' +
      '\n```\n结尾'
    const questions = extractJsonArray(raw)
    expect(questions).toHaveLength(1)
    expect(questions[0]).toMatchObject({
      subject: 'math',
      category: '函数',
      answer: 'B',
    })
  })
})

describe('normalizeQuestions', () => {
  it('sanitizes invalid fields and trims content', () => {
    const questions = normalizeQuestions([
      {
        subject: 'biology',
        category: '  ',
        difficulty: 'extreme',
        content: '题干',
        options: [
          { key: 'A', text: '1' },
          { key: 'B', text: '2' },
          { key: 'C', text: '3' },
          { key: 'D', text: '4' },
        ],
        answer: 'Z',
        explanation: ' ',
      },
    ])

    expect(questions[0]).toMatchObject({
      subject: 'math',
      category: '未分类',
      difficulty: 'medium',
      answer: 'A',
      explanation: '',
    })
  })

  it('drops questions without exactly four non-empty options', () => {
    const questions = normalizeQuestions([
      {
        subject: 'math',
        category: '函数',
        difficulty: 'simple',
        content: '题干',
        options: [
          { key: 'A', text: '1' },
          { key: 'B', text: '2' },
        ],
        answer: 'A',
        explanation: '',
      },
    ])
    expect(questions).toHaveLength(0)
  })
})

describe('favorite ids', () => {
  it('persists ids and removes duplicates', () => {
    saveFavoriteIds(['Q.001', 'Q.002', 'Q.001'])
    expect(loadFavoriteIds()).toEqual(['Q.001', 'Q.002'])
  })
})

describe('store favorites', () => {
  it('persists favorite ids and cleans them up on delete', () => {
    useAppStore.setState({
      questions: [{ id: 'Q.001' } as Question],
      favoriteIds: ['Q.001'],
    })

    useAppStore.getState().toggleFavorite('Q.002')
    expect(useAppStore.getState().favoriteIds).toEqual(['Q.001', 'Q.002'])

    useAppStore.getState().deleteQuestion('Q.001')
    expect(useAppStore.getState().favoriteIds).toEqual(['Q.002'])
    expect(loadFavoriteIds()).toEqual(['Q.002'])
  })
})
