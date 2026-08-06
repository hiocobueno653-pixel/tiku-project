import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  extractJsonArray,
  normalizeQuestions,
  parseExamImagesWithAi,
  parseExamTextWithAi,
} from './exam-parser'
import type { AiApiConfig } from './types'

const cfg: AiApiConfig = {
  provider: 'custom',
  model: 'test-model',
  apiKey: 'test-key',
  baseUrl: 'https://example.com/v1/',
}

const validQuestion = {
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
  answer: 'B',
  explanation: '解析',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('extractJsonArray', () => {
  it('returns an empty array for empty or invalid input', () => {
    expect(extractJsonArray('')).toEqual([])
    expect(extractJsonArray('没有任何数组')).toEqual([])
  })

  it('extracts a plain JSON array from surrounding prose', () => {
    const raw = `前缀 ${JSON.stringify([validQuestion])} 后缀`
    const questions = extractJsonArray(raw)
    expect(questions).toHaveLength(1)
    expect(questions[0]).toMatchObject({ subject: 'math', answer: 'B' })
  })
})

describe('normalizeQuestions', () => {
  it('drops questions without exactly four valid options', () => {
    const result = normalizeQuestions([
      { ...validQuestion, options: [{ key: 'A', text: '1' }] },
      { ...validQuestion, options: [] },
    ])
    expect(result).toHaveLength(0)
  })

  it('defaults invalid subjects and difficulties', () => {
    const result = normalizeQuestions([
      { ...validQuestion, subject: 'biology', difficulty: 'extreme', answer: 'Z' },
    ])
    expect(result[0]).toMatchObject({ subject: 'math', difficulty: 'medium', answer: 'A' })
  })
})

describe('parseExamTextWithAi', () => {
  it('calls the chat API once and reuses the cache for identical text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify([validQuestion]) } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = await parseExamTextWithAi(cfg, '同一份试卷文本')
    const second = await parseExamTextWithAi(cfg, '同一份试卷文本')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first.questions).toHaveLength(1)
    expect(second.questions).toEqual(first.questions)
  })

  it('throws a readable error when the API returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      }),
    )

    await expect(parseExamTextWithAi(cfg, '错误请求')).rejects.toThrow(/401/)
  })
})

describe('parseExamImagesWithAi', () => {
  it('returns an empty result when no images are provided', async () => {
    await expect(parseExamImagesWithAi(cfg, [])).resolves.toEqual({ questions: [] })
  })

  it('batches images and merges parsed questions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify([validQuestion]) } }],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await parseExamImagesWithAi(cfg, [
      'data:image/jpeg;base64,abc',
      'data:image/jpeg;base64,def',
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.questions).toHaveLength(1)
  })
})