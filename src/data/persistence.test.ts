import { describe, expect, it } from 'vitest'
import {
  appendDailyPractice,
  clearChatHistory,
  exportAllData,
  importAllData,
  loadChatHistory,
  loadDailyPracticeRecords,
  loadLearningStats,
  loadUserQuestions,
  localDateISO,
  saveChatHistory,
  saveUserQuestions,
} from './persistence'
import type { ChatMessageRecord, Question } from './types'

const makeQuestion = (id: string): Question => ({
  id,
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
})

describe('localDateISO', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(localDateISO(new Date(2026, 7, 5))).toBe('2026-08-05')
    expect(localDateISO(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('user questions persistence', () => {
  it('round-trips saved questions', () => {
    expect(loadUserQuestions()).toEqual([])

    const questions = [makeQuestion('Q.001'), makeQuestion('Q.002')]
    saveUserQuestions(questions)

    expect(loadUserQuestions()).toEqual(questions)
  })

  it('drops malformed rows and keeps valid string ids', () => {
    window.localStorage.setItem(
      'tiku.userQuestions.v1',
      JSON.stringify({
        __v: 1,
        data: [{ id: 123 }, null, { id: 'Q.003' }],
      }),
    )

    const loaded = loadUserQuestions()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].id).toBe('Q.003')
  })

  it('migrates legacy data without a version envelope', () => {
    window.localStorage.setItem(
      'tiku.userQuestions.v1',
      JSON.stringify([{ ...makeQuestion('Q.009'), id: 'legacy-1' }]),
    )

    expect(loadUserQuestions()).toHaveLength(1)
  })
})

describe('daily practice records', () => {
  it('merges records for the same date', () => {
    appendDailyPractice({ date: '2026-08-05', answered: 3, correct: 2 })
    appendDailyPractice({ date: '2026-08-05', answered: 2, correct: 1 })

    expect(loadDailyPracticeRecords()).toEqual([
      { date: '2026-08-05', answered: 5, correct: 3 },
    ])
  })

  it('keeps records sorted by date', () => {
    appendDailyPractice({ date: '2026-08-06', answered: 1, correct: 1 })
    appendDailyPractice({ date: '2026-08-05', answered: 2, correct: 2 })

    expect(loadDailyPracticeRecords().map((r) => r.date)).toEqual(['2026-08-05', '2026-08-06'])
  })
})

describe('chat history persistence', () => {
  it('keeps only the latest 200 messages', () => {
    const messages: ChatMessageRecord[] = Array.from({ length: 205 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? 'user' : 'ai',
      content: `消息 ${i}`,
      ts: i,
    }))

    saveChatHistory(messages)

    const loaded = loadChatHistory()
    expect(loaded).toHaveLength(200)
    expect(loaded[0].id).toBe('m5')
    expect(loaded[199].id).toBe('m204')
  })

  it('clears chat history', () => {
    saveChatHistory([{ id: 'm1', role: 'user', content: 'hi', ts: 1 }])
    clearChatHistory()
    expect(loadChatHistory()).toEqual([])
  })
})

describe('backup / restore', () => {
  it('exports and imports all app data', () => {
    saveUserQuestions([makeQuestion('Q.001')])
    saveChatHistory([{ id: 'm1', role: 'user', content: 'hi', ts: 1 }])

    const backup = exportAllData()
    expect(Object.keys(backup).sort()).toEqual([
      'tiku.chatHistory.v1',
      'tiku.userQuestions.v1',
    ])

    // 清空后导入恢复
    window.localStorage.clear()
    expect(loadUserQuestions()).toEqual([])
    const count = importAllData(backup)
    expect(count).toBe(2)
    expect(loadUserQuestions()).toEqual([makeQuestion('Q.001')])
    expect(loadChatHistory()).toEqual([{ id: 'm1', role: 'user', content: 'hi', ts: 1 }])
  })

  it('rejects non-object backups', () => {
    expect(() => importAllData(null)).toThrow()
    expect(() => importAllData([1, 2])).toThrow()
  })

  it('rejects backups containing invalid JSON values', () => {
    expect(() => importAllData({ 'tiku.userQuestions.v1': '{broken' })).toThrow()
  })

  it('excludes .bak keys from export', () => {
    saveUserQuestions([makeQuestion('Q.001')])
    window.localStorage.setItem('tiku.userQuestions.v1.bak', '{"__v":1,"data":[]}')

    const backup = exportAllData()
    expect(Object.keys(backup)).not.toContain('tiku.userQuestions.v1.bak')
  })
})

describe('corrupted data recovery', () => {
  it('recovers from the .bak copy when the primary value is corrupted', () => {
    saveUserQuestions([makeQuestion('Q.001')])
    // 第二次保存会先把当前值（Q.001 版本）备份到 .bak
    saveUserQuestions([makeQuestion('Q.002')])
    expect(window.localStorage.getItem('tiku.userQuestions.v1.bak')).not.toBeNull()

    // 主数据损坏，备份完好
    window.localStorage.setItem('tiku.userQuestions.v1', '{broken json')

    expect(loadUserQuestions()).toEqual([makeQuestion('Q.001')])
  })

  it('falls back to defaults when both primary and backup are corrupted', () => {
    window.localStorage.setItem('tiku.learningStats.v1', 'not-json')
    window.localStorage.setItem('tiku.learningStats.v1.bak', 'also-not-json')

    const stats = loadLearningStats()
    expect(stats.totalAnswered).toBe(0)
  })
})
