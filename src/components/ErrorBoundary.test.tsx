// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

function Safe() {
  return <div>正常内容</div>
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Safe />
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常内容')).toBeTruthy()
  })

  it('shows the recovery UI and logs to console when a child throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('页面出了点问题')).toBeTruthy()
    expect(screen.getByText('重新加载')).toBeTruthy()
    // 兜底文案明确告知数据未丢失
    expect(screen.getByText(/学习数据都在本地/)).toBeTruthy()
    // 异常被记录到控制台（含 ErrorBoundary 前缀）
    expect(errorSpy).toHaveBeenCalledWith(
      '[ErrorBoundary] 渲染异常:',
      expect.any(Error),
      expect.any(String),
    )
  })
})
