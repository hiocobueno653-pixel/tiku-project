import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

interface AppShellProps {
  children: ReactNode
  /** When true (e.g. during practice session), hide the bottom nav. */
  hideNav?: boolean
}

export default function AppShell({ children, hideNav = false }: AppShellProps) {
  const { pathname } = useLocation()

  // 切换路由后回到页面顶部，避免从长列表中间进入新页面
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <div className={`app-shell screen-enter${hideNav ? ' no-nav' : ''}`}>{children}</div>
      {!hideNav && <BottomNav />}
    </>
  )
}
