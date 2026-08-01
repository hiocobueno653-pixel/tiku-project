import { NavLink } from 'react-router-dom'
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

export default function BottomNav() {
  return (
    <nav className="bottom-nav-bar" aria-label="主导航">
      {NAV_ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
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
