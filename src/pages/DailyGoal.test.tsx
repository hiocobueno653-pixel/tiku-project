// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DailyGoal from './DailyGoal'
import { useAppStore } from '../store/useAppStore'

describe('DailyGoal page', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.getState().refresh()
  })

  it('renders the goal card and empty checklist state', () => {
    render(
      <MemoryRouter>
        <DailyGoal />
      </MemoryRouter>,
    )

    expect(screen.getByText('每日目标')).toBeTruthy()
    expect(screen.getByText('今日进度')).toBeTruthy()
    expect(screen.getByText('学习计划')).toBeTruthy()
    expect(screen.getByText('还没有目标')).toBeTruthy()
  })

  it('renders goals and the week view with streak dots', () => {
    useAppStore.setState({
      goals: [
        { id: 'g-1', text: '完成数学 20 题', total: 20, done: 10, completed: false },
      ],
      stats: {
        totalAnswered: 10,
        totalCorrect: 8,
        streakDays: 2,
        lastPracticeISO: '',
        totalSeconds: 600,
      },
    })
    render(
      <MemoryRouter>
        <DailyGoal />
      </MemoryRouter>,
    )

    expect(screen.getByText('完成数学 20 题')).toBeTruthy()
    expect(screen.getByText('10/20 题')).toBeTruthy()
    expect(screen.getByText('连续打卡 2 天')).toBeTruthy()
    // 周视图 7 个打卡圆点
    expect(document.querySelectorAll('.streak-dot')).toHaveLength(7)
  })
})
