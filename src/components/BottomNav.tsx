import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Home,
  Library,
  MessageSquare,
  Shuffle,
  BarChart3,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: '首页', Icon: Home, end: true },
  { to: '/question-bank', label: '题库', Icon: Library },
  { to: '/ai-chat', label: 'AI问答', Icon: MessageSquare },
  { to: '/practice-setup', label: '练习', Icon: Shuffle },
  { to: '/statistics', label: '我的', Icon: BarChart3 },
]

/** 与 NavLink 的 end 语义一致的路由匹配（用于定位活动指示器） */
function matchRoute(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
}

export default function BottomNav() {
  const { pathname } = useLocation()
  const trackRef = useRef<HTMLSpanElement | null>(null)
  const indicatorRef = useRef<HTMLSpanElement | null>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  // 滚动方向响应：向上滚时导航栏下移收起，向下滚 / 回到顶部时恢复
  const [tucked, setTucked] = useState(false)

  // 活动指示器：测量活动项相对滑块轨道的位置，用 translateX 驱动物理滑块
  const measureIndicator = useCallback(() => {
    const track = trackRef.current
    const indicator = indicatorRef.current
    if (!track || !indicator) return
    const index = NAV_ITEMS.findIndex(({ to, end }) => matchRoute(pathname, to, end))
    const item = itemRefs.current[index]
    if (!item) return
    const trackRect = track.getBoundingClientRect()
    const rect = item.getBoundingClientRect()
    indicator.style.width = `${rect.width}px`
    indicator.style.transform = `translateX(${rect.left - trackRect.left}px)`
  }, [pathname])

  // 路由切换：绘制前完成测量，避免滑块闪跳
  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator])

  // 窗口尺寸 / 方向变化时重新测量（滑块跟随布局）
  useEffect(() => {
    window.addEventListener('resize', measureIndicator)
    window.addEventListener('orientationchange', measureIndicator)
    return () => {
      window.removeEventListener('resize', measureIndicator)
      window.removeEventListener('orientationchange', measureIndicator)
    }
  }, [measureIndicator])

  // 滚动方向响应（prefers-reduced-motion 下禁用，尊重全局降级）
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let lastY = window.scrollY
    let rafId = 0
    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        const y = window.scrollY
        const delta = y - lastY
        lastY = y
        if (y < 8) setTucked(false)
        else if (Math.abs(delta) > 10) setTucked(delta < 0)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <nav
      className={`bottom-nav-bar${tucked ? ' nav-tucked' : ''}`}
      aria-label="主导航"
    >
      {/* 6s 循环的微光扫过带（纯装饰，不挡交互） */}
      <span className="nav-shimmer" aria-hidden="true" />
      {/* 滑块轨道：裁剪弹性过冲，让胶囊始终收在导航栏圆角内 */}
      <span ref={trackRef} className="nav-active-track" aria-hidden="true">
        <span ref={indicatorRef} className="nav-active-indicator" />
      </span>
      {NAV_ITEMS.map(({ to, label, Icon, end }, index) => (
        <NavLink
          key={to}
          ref={(el) => {
            itemRefs.current[index] = el
          }}
          to={to}
          end={end}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Icon className="nav-icon" strokeWidth={1.9} />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
