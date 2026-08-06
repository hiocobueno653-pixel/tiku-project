// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import PracticeSession from './PracticeSession'
import { useAppStore } from '../store/useAppStore'
import type { Question } from '../data/types'

const makeQuestion = (overrides: Partial<Question> = {}): Question => ({
  id: 'Q.001',
  subject: 'math',
  category: '函数',
  difficulty: 'medium',
  content: '已知 f(x)=2x+1，求 f(3)',
  options: [
    { key: 'A', text: '5' },
    { key: 'B', text: '6' },
    { key: 'C', text: '7' },
    { key: 'D', text: '8' },
  ],
  answer: 'C',
  explanation: 'f(3)=2×3+1=7',
  createdAt: '2026-08-05',
  favorite: false,
  ...overrides,
})

function renderSession() {
  return render(
    <MemoryRouter initialEntries={['/practice?subject=math&count=2']}>
      <Routes>
        <Route path="/practice" element={<PracticeSession />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PracticeSession page', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.getState().refresh()
  })

  it('shows the empty state when there are no questions', () => {
    renderSession()
    expect(screen.getByText('题库暂无题目')).toBeTruthy()
    expect(screen.getByText('前往题库')).toBeTruthy()
  })

  it('renders question, options and action bar when questions exist', () => {
    useAppStore.setState({ questions: [makeQuestion()] })
    renderSession()

    // 题干与选项
    expect(screen.getByText('已知 f(x)=2x+1，求 f(3)')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
    expect(screen.getByText('8')).toBeTruthy()
    // 进度条与操作
    expect(document.querySelector('.session-progress')).toBeTruthy()
    expect(screen.getByText('跳过此题')).toBeTruthy()
    expect(screen.getByText('确认答案')).toBeTruthy()
  })

  it('selecting an option enables the confirm button', async () => {
    useAppStore.setState({ questions: [makeQuestion()] })
    const user = userEvent.setup()
    renderSession()

    const confirmBtn = screen.getByText('确认答案').closest('button') as HTMLButtonElement
    expect(confirmBtn.disabled).toBe(true)

    await user.click(screen.getByText('7'))
    expect(confirmBtn.disabled).toBe(false)
  })
})
