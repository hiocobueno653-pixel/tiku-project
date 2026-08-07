// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('toggles a goal to completed and back', async () => {
    useAppStore.setState({
      goals: [
        { id: 'g-1', text: '完成数学 20 题', total: 20, done: 0, completed: false },
      ],
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DailyGoal />
      </MemoryRouter>,
    )

    // 初始未完成
    const toggleBtn = screen.getByRole('button', { name: '标记为完成' })
    await user.click(toggleBtn)

    // 完成后：进度 20/20，按钮变为"标记为未完成"
    expect(useAppStore.getState().goals[0].completed).toBe(true)
    expect(screen.getByText('20/20 题')).toBeTruthy()
    expect(screen.getByRole('button', { name: '标记为未完成' })).toBeTruthy()

    // 再点一次取消完成
    await user.click(screen.getByRole('button', { name: '标记为未完成' }))
    expect(useAppStore.getState().goals[0].completed).toBe(false)
    expect(screen.getByRole('button', { name: '标记为完成' })).toBeTruthy()
  })
})
