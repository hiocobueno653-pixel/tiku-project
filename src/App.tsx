import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import QuestionBank from './pages/QuestionBank'
import AiChat from './pages/AiChat'
import DailyGoal from './pages/DailyGoal'
import PracticeSetup from './pages/PracticeSetup'
import PracticeSession from './pages/PracticeSession'
import Statistics from './pages/Statistics'
import BottomNav from './components/BottomNav'

export default function App() {
  return <AppLayout />
}

/**
 * 路由布局：BottomNav 渲染在 <Routes> 外层，跨路由保持挂载不卸载，
 * 滑动指示器才能从旧位置平滑过渡到新位置（而不是每次重新从首项滑起）。
 */
function AppLayout() {
  const { pathname } = useLocation()
  // 练习会话页全屏专注，隐藏底部导航（对应页面内 <AppShell hideNav> 的 no-nav 布局）
  const hideNav = pathname === '/practice'

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/question-bank" element={<QuestionBank />} />
        <Route path="/ai-chat" element={<AiChat />} />
        <Route path="/daily-goal" element={<DailyGoal />} />
        <Route path="/practice-setup" element={<PracticeSetup />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  )
}
