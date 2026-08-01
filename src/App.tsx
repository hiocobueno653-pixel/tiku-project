import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import QuestionBank from './pages/QuestionBank'
import AiChat from './pages/AiChat'
import DailyGoal from './pages/DailyGoal'
import PracticeSetup from './pages/PracticeSetup'
import PracticeSession from './pages/PracticeSession'
import Statistics from './pages/Statistics'

export default function App() {
  return (
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
  )
}
