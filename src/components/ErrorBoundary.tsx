import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * 全局运行时错误兜底：子组件抛错时显示可恢复界面，
 * 并把错误信息输出到控制台，避免整页白屏。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] 渲染异常:', error, info.componentStack)
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '32px',
            textAlign: 'center',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'var(--brand-8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '30px',
            }}
          >
            😵
          </div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>页面出了点问题</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
            别担心，你的学习数据都在本地，没有丢失。
            <br />
            刷新一下通常就能恢复。
          </p>
          <button
            onClick={this.handleReload}
            style={{
              padding: '11px 28px',
              border: 'none',
              borderRadius: '999px',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-brand)',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
