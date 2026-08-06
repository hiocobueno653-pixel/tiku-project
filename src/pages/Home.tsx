import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  ChevronRight,
  CheckCircle2,
  Zap,
  Lightbulb,
  Library,
  Upload,
  Target,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAppStore } from '../store/useAppStore'
import { todayISO } from '../data/persistence'

export default function Home() {
  const navigate = useNavigate()
  const greeting = getGreeting()

  const activities = useAppStore((s) => s.activities)
  const stats = useAppStore((s) => s.stats)
  const questionCount = useAppStore((s) => s.questions.length)
  const dailyRecords = useAppStore((s) => s.dailyRecords)
  const goals = useAppStore((s) => s.goals)
  const todayAnswered = useMemo(
    () => dailyRecords.find((r) => r.date === todayISO())?.answered ?? 0,
    [dailyRecords],
  )
  const todayTarget = useMemo(() => {
    const total = goals.reduce((sum, g) => sum + g.total, 0)
    return total > 0 ? total : 20
  }, [goals])

  const todayProgress = Math.min(100, Math.round((todayAnswered / todayTarget) * 100))

  const accuracy =
    stats && stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0

  const hasQuestions = questionCount > 0
  const hasActivities = activities.length > 0

  return (
    <AppShell>
      {/* Header / Greeting */}
      <div className="screen-header">
        <div>
          <h1 className="page-title">
            {greeting}
          </h1>
          <p className="page-subtitle">
            {hasQuestions ? '今天也要加油哦' : '先去题库添加题目吧'}
          </p>
        </div>
      </div>

      {/* Today's Progress Card */}
      <div className="px-4 mt-6">
        <div className="progress-card">
          <div className="progress-card-header">
            <div className="flex items-center gap-3">
              <span className="progress-card-icon">
                <Target size={18} strokeWidth={2.2} />
              </span>
              <div>
                <h3 className="progress-card-title">今日进度</h3>
                <p className="progress-card-sub">
                  {stats && stats.lastPracticeISO === todayISO()
                    ? `今日已练习 ${todayAnswered} 题`
                    : '完成练习后自动记录'}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/practice-setup')}
              disabled={!hasQuestions}
              className={hasQuestions ? 'progress-continue' : 'progress-continue disabled'}
            >
              {hasQuestions ? '继续学习' : '暂无题目'}
            </button>
          </div>

          <div className="progress-card-main">
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(var(--brand) 0deg, var(--brand) ${todayProgress * 3.6}deg, var(--surface-2) ${todayProgress * 3.6}deg, var(--surface-2) 360deg)`,
              }}
            >
              <div className="progress-ring-content">
                <span className="progress-ring-value">{todayProgress}%</span>
                <span className="progress-ring-label">完成度</span>
              </div>
            </div>

            <div className="progress-card-detail">
              <p className="progress-count">
                <strong>{todayAnswered}</strong>
                <span> / {todayTarget} 题</span>
              </p>
              <p className="progress-status">
                {!hasQuestions
                  ? '先去题库添加题目吧'
                  : todayAnswered >= todayTarget
                    ? '今日目标已完成，太棒了'
                    : todayAnswered > 0
                      ? `再练 ${todayTarget - todayAnswered} 题即可完成`
                      : '今日还未开始练习'}
              </p>
            </div>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${todayProgress}%` }}
            />
          </div>

          <div className="progress-footer">
            <div className="flex items-center gap-1.5">
              <Clock size={14} strokeWidth={2} />
              <span>
                题库共 {questionCount} 题
              </span>
            </div>
            <button
              onClick={() => navigate('/daily-goal')}
              className="progress-link"
            >
              设置目标
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats Row — 真实数据 */}
      <div className="px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={stats ? String(stats.totalAnswered) : '0'}
            label="累计做题"
            color="var(--brand)"
          />
          <StatCard
            value={`${accuracy}%`}
            label="正确率"
            color="var(--state-success)"
          />
          <StatCard
            value={stats ? `${stats.streakDays}天` : '0天'}
            label="连续打卡"
            color="var(--brand)"
          />
        </div>
      </div>

      {/* Recent Activity Section — 真实数据，空时引导 */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title-lg">
            最近练习
          </h2>
          {hasActivities && (
            <button
              onClick={() => navigate('/statistics')}
              style={{
                fontSize: '12px',
                color: 'var(--brand)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              查看全部
            </button>
          )}
        </div>

        {!hasActivities && (
          <div
            className="empty-state"
            style={{
              background: 'var(--surface)',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--inner-hl), var(--shadow-1)',
            }}
          >
            <div className="empty-state-icon" style={{ position: 'relative', zIndex: 1 }}>
              <Zap size={26} color="var(--brand)" strokeWidth={2} />
            </div>
            <p className="empty-state-title" style={{ position: 'relative', zIndex: 1 }}>
              还没有练习记录
            </p>
            <p className="empty-state-desc" style={{ position: 'relative', zIndex: 1 }}>
              开始第一次练习，开启你的进步之旅
            </p>
            <button
              onClick={() => navigate(hasQuestions ? '/practice-setup' : '/question-bank')}
              className="empty-state-cta"
              style={{ position: 'relative', zIndex: 1 }}
            >
              {hasQuestions ? '去练习' : '先去添加题目'}
            </button>
          </div>
        )}

        {activities.slice(0, 5).map((a, i) => (
          <div
            key={a.id}
            className="activity-row"
            style={{
              marginBottom: i === Math.min(activities.length, 5) - 1 ? 0 : '8px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2">
                <span className="activity-row-title">
                  {a.title}
                </span>
                {a.completed && (
                  <CheckCircle2 size={16} color="var(--state-success)" strokeWidth={2} />
                )}
              </div>
              <span className="activity-row-time">
                {a.time}
              </span>
            </div>
            <span
              className="activity-row-score"
              style={{ color: a.score >= 90 ? 'var(--state-success)' : 'var(--brand)' }}
            >
              {a.score}分
            </span>
          </div>
        ))}
      </div>

      {/* Recommended Section — 引导新用户去题库 */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="section-title-lg" style={{ marginBottom: '12px' }}>
          快速开始
        </h2>

        <div
          className="flex gap-3 overflow-x-auto pb-2 no-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {!hasQuestions && (
            <RecommendCard
              icon={<Upload size={18} color="var(--brand)" strokeWidth={2} />}
              title="上传试卷"
              desc="AI 识别一键导入"
              borderLeft="4px solid var(--brand)"
              onClick={() => navigate('/question-bank')}
            />
          )}
          <RecommendCard
            icon={<Library size={18} color="var(--brand)" strokeWidth={2} />}
            title="管理题库"
            desc={hasQuestions ? `已有 ${questionCount} 题` : '手动添加题目'}
            borderLeft="4px solid var(--brand-15)"
            onClick={() => navigate('/question-bank')}
          />
          <RecommendCard
            icon={<Lightbulb size={18} color="var(--brand)" strokeWidth={2} />}
            title="薄弱知识点"
            desc="针对错题智能推荐"
            borderLeft="4px solid var(--brand)"
            gradient
            onClick={() => navigate(hasQuestions ? '/practice-setup' : '/question-bank')}
          />
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string
  label: string
  color: string
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-value" style={{ color }}>
        {value}
      </div>
      <div className="stat-card-label">
        {label}
      </div>
    </div>
  )
}

function RecommendCard({
  icon,
  title,
  desc,
  borderLeft,
  gradient,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  borderLeft: string
  gradient?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`recommend-card${gradient ? ' gradient' : ''}`}
      style={{ borderLeft }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="recommend-card-icon">{icon}</span>
          <span className="recommend-card-title">{title}</span>
        </div>
        <p className="recommend-card-desc">{desc}</p>
      </div>
      <span className="recommend-arrow">
        <ChevronRight size={14} strokeWidth={2.5} />
      </span>
    </button>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
