// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import { useAppStore } from '../store/useAppStore'

describe('Home page', () => {
  afterEach(cleanup)

  beforeEach(() => {
    useAppStore.getState().refresh()
  })

  it('renders greeting, progress card and quick-start sections', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    // 问候语（时间相关，检查标题元素存在）
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0)
    // 进度卡片
    expect(screen.getByText('今日进度')).toBeTruthy()
    expect(screen.getByText('完成度')).toBeTruthy()
    // 快速开始区
    expect(screen.getByText('快速开始')).toBeTruthy()
    expect(screen.getByText('管理题库')).toBeTruthy()
  })

  it('shows empty state guidance when there is no activity', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(screen.getByText('还没有练习记录')).toBeTruthy()
    expect(screen.getByText('开始第一次练习，开启你的进步之旅')).toBeTruthy()
    expect(screen.getByText('先去添加题目')).toBeTruthy()
  })

  it('renders stat cards with real store values', () => {
    useAppStore.setState({
      stats: {
        totalAnswered: 12,
        totalCorrect: 9,
        streakDays: 3,
        lastPracticeISO: '',
        totalSeconds: 3600,
      },
    })
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('12').length).toBeGreaterThan(0)
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('3天')).toBeTruthy()
  })
})
