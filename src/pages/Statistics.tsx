import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
  type ChartOptions,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { BarChart3, Sparkles, ChevronRight, Library, Zap } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAppStore } from '../store/useAppStore'
import { computeSubjectCounts, SUBJECT_COLORS } from '../data/questions'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Filler,
)

type Period = 'week' | 'month' | 'all'

export default function Statistics() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('week')
  const stats = useAppStore((s) => s.stats)
  const userQuestions = useAppStore((s) => s.questions)
  const activities = useAppStore((s) => s.activities)
  const dailyRecords = useAppStore((s) => s.dailyRecords)

  // 真实数据
  const totalAnswered = stats?.totalAnswered ?? 0
  const totalCorrect = stats?.totalCorrect ?? 0
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0
  const streakDays = stats?.streakDays ?? 0
  const hasData = totalAnswered > 0

  // 按周期筛选每日记录
  const filteredRecords = useMemo(() => {
    if (period === 'week') return dailyRecords.slice(-7)
    if (period === 'month') return dailyRecords.slice(-30)
    return dailyRecords
  }, [dailyRecords, period])

  const periodLabels = useMemo(() => {
    return filteredRecords.map((r) => {
      const d = new Date(r.date)
      if (period === 'week') {
        return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      }
      if (period === 'month') {
        return `${d.getMonth() + 1}/${d.getDate()}`
      }
      return `${d.getMonth() + 1}/${d.getDate()}`
    })
  }, [filteredRecords, period])

  const trendData = useMemo(
    () => ({
      labels: periodLabels,
      datasets: [
        {
          label: '做题量',
          data: filteredRecords.map((r) => r.answered),
          borderColor: '#2F6BFF',
          backgroundColor: 'rgba(47, 107, 255, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#2F6BFF',
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [filteredRecords, periodLabels],
  )

  const accuracyData = useMemo(
    () => ({
      labels: periodLabels,
      datasets: [
        {
          label: '正确率',
          data: filteredRecords.map((r) =>
            r.answered > 0 ? Math.round((r.correct / r.answered) * 100) : 0,
          ),
          backgroundColor: '#2F6BFF',
          borderRadius: 6,
          maxBarThickness: 32,
        },
      ],
    }),
    [filteredRecords, periodLabels],
  )

  // 科目分布 — 基于真实用户题库
  const subjectCounts = useMemo(() => computeSubjectCounts(userQuestions), [userQuestions])
  const subjectData = useMemo(() => {
    const total = subjectCounts.reduce((s, sub) => s + sub.count, 0)
    return {
      labels: subjectCounts.map((s) => s.name),
      datasets: [
        {
          data: subjectCounts.map((s) => (total > 0 ? Math.round((s.count / total) * 100) : 0)),
          backgroundColor: subjectCounts.map((s) => SUBJECT_COLORS[s.id]),
          borderWidth: 0,
          cutout: '62%',
        },
      ],
    }
  }, [subjectCounts])

  const trendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { color: '#E2E8F0' },
        ticks: { color: '#94A3B8', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: '#E2E8F0' },
        ticks: { color: '#94A3B8', font: { size: 11 } },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  const accuracyOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94A3B8', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: '#E2E8F0' },
        ticks: {
          color: '#94A3B8',
          font: { size: 11 },
          callback: (v) => `${v}%`,
        },
        border: { display: false },
        beginAtZero: true,
        max: 100,
      },
    },
  }

  const subjectOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  }

  // 真实学习时长：从累计秒数换算
  const totalSeconds = stats?.totalSeconds ?? 0
  const hours = (totalSeconds / 3600).toFixed(1)

  return (
    <AppShell>
      <div className="screen-header screen-header-stacked" style={{ paddingBottom: 24 }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="page-title">
            学习统计
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-3)', marginTop: '4px' }}>
            查看你的学习数据
          </p>
        </div>

        {!hasData ? (
          /* ── 空状态 ── */
          <EmptyState
            hasQuestions={userQuestions.length > 0}
            onGoPractice={() => navigate('/practice-setup')}
            onGoQuestionBank={() => navigate('/question-bank')}
          />
        ) : (
          <>
            {/* Period Selector */}
            <div className="chip-row mb-6">
              {(
                [
                  { id: 'week' as const, label: '本周' },
                  { id: 'month' as const, label: '本月' },
                  { id: 'all' as const, label: '全部' },
                ]
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={p.id === period ? 'chip active' : 'chip'}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Stats Summary — 真实数据 */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <SummaryCard
                label="做题量"
                value={String(totalAnswered)}
                valueColor="var(--brand)"
              />
              <SummaryCard
                label="正确率"
                value={`${accuracy}%`}
                valueColor="var(--state-success)"
              />
              <SummaryCard
                label="学习时长"
                value={`${hours}h`}
                valueColor="var(--brand)"
              />
            </div>

            {/* Learning Curve Chart */}
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-2)',
              }}
            >
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '12px',
                }}
              >
                做题量趋势
              </h2>
              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <Line data={trendData} options={trendOptions} />
              </div>
            </div>

            {/* Accuracy Chart */}
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                marginBottom: '16px',
                boxShadow: 'var(--shadow-2)',
              }}
            >
              <h2
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: '12px',
                }}
              >
                正确率趋势
              </h2>
              <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                <Bar data={accuracyData} options={accuracyOptions} />
              </div>
            </div>

            {/* Subject Distribution — 仅当有题库时显示 */}
            {userQuestions.length > 0 && (
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: 'var(--shadow-2)',
                }}
              >
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '12px',
                  }}
                >
                  题库科目分布
                </h2>
                <div style={{ position: 'relative', width: '100%', height: '180px' }}>
                  <Doughnut data={subjectData} options={subjectOptions} />
                </div>
                {/* Legend */}
                <div className="flex justify-center gap-4 mt-3 flex-wrap">
                  {subjectCounts.map((s) => (
                    <div key={s.id} className="flex items-center gap-1">
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          display: 'inline-block',
                          background: SUBJECT_COLORS[s.id],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                        {s.name} {s.count} 题
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Streak Card — 真实打卡数据 */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, #2F6BFF 0%, #4E83FF 100%)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                color: '#fff',
                marginBottom: '16px',
                boxShadow: '0 12px 32px -8px rgba(47, 107, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 500 }}>
                  连续打卡
                </p>
                <p style={{ fontSize: '32px', fontWeight: 700, margin: '4px 0 0', lineHeight: 1 }}>
                  {streakDays}
                  <span style={{ fontSize: '14px', fontWeight: 500, marginLeft: '4px' }}>天</span>
                </p>
              </div>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Zap size={26} color="#fff" strokeWidth={2.2} />
              </div>
            </div>

            {/* Recent Activities — 真实记录 */}
            {activities.length > 0 && (
              <div
                style={{
                  background: 'var(--surface)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  boxShadow: 'var(--shadow-2)',
                }}
              >
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: '12px',
                  }}
                >
                  最近练习
                </h2>
                <div className="flex flex-col gap-2">
                  {activities.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--ink)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.title}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '2px 0 0' }}>
                          {a.time}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: a.completed ? 'var(--state-success)' : 'var(--ink-3)',
                          marginLeft: '8px',
                        }}
                      >
                        {a.completed ? `${a.score}分` : '未完成'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}

function SummaryCard({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor: string
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 8px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-2)',
      }}
    >
      <p style={{ fontSize: '11px', color: 'var(--ink-3)', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>
        {value}
      </p>
    </div>
  )
}

/* ── 空状态：用户尚未进行任何练习 ── */
function EmptyState({
  hasQuestions,
  onGoPractice,
  onGoQuestionBank,
}: {
  hasQuestions: boolean
  onGoPractice: () => void
  onGoQuestionBank: () => void
}) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '40px 16px 32px',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          margin: '0 auto 18px',
          borderRadius: 'var(--radius-xl)',
          background:
            'linear-gradient(135deg, rgba(47, 107, 255, 0.10) 0%, rgba(91, 140, 255, 0.14) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
        }}
      >
        <BarChart3 size={32} color="var(--brand)" strokeWidth={2} />
      </div>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 6px',
          letterSpacing: 0,
        }}
      >
        暂无学习数据
      </h2>
      <p
        style={{
          fontSize: '13px',
          color: 'var(--ink-2)',
          margin: '0 0 24px',
          lineHeight: 1.5,
        }}
      >
        {hasQuestions
          ? '完成第一次练习后，这里会展示你的做题量、正确率和打卡记录'
          : '先添加题库题目，再开始你的第一次练习'}
      </p>

      <button
        onClick={hasQuestions ? onGoPractice : onGoQuestionBank}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '999px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 8px 20px -4px rgba(47, 107, 255, 0.45)',
        }}
      >
        {hasQuestions ? (
          <>
            <Sparkles size={16} strokeWidth={2.4} />
            开始练习
          </>
        ) : (
          <>
            <Library size={16} strokeWidth={2.4} />
            前往题库
          </>
        )}
        <ChevronRight size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}
