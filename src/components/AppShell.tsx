import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

interface AppShellProps {
  children: ReactNode
  /** When true (e.g. during practice session), remove bottom-nav bottom padding. */
  hideNav?: boolean
}

export default function AppShell({ children, hideNav = false }: AppShellProps) {
  const { pathname } = useLocation()

  // 切换路由后回到页面顶部，避免从长列表中间进入新页面
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={`app-shell screen-enter${hideNav ? ' no-nav' : ''}`}>
      {/* 内容容器：flex:1 撑满视口剩余高度，空状态时导航栏独立显示在视口底部 */}
      <div className="app-content">{children}</div>
    </div>
  )
}
