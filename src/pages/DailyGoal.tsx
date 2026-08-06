import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Circle,
  Flame,
  Zap,
  Plus,
  Trash2,
  Target,
  ChevronRight,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import BottomSheet from '../components/BottomSheet'
import { FormRow, inputStyle, SegmentedControl } from '../components/ui'
import { todayISO } from '../data/persistence'
import { useAppStore } from '../store/useAppStore'

export default function DailyGoalPage() {
  const navigate = useNavigate()
  const goals = useAppStore((s) => s.goals)
  const stats = useAppStore((s) => s.stats)
  const questionCount = useAppStore((s) => s.questions.length)
  const addGoal = useAppStore((s) => s.addGoal)
  const deleteGoal = useAppStore((s) => s.deleteGoal)
  const toggleGoal = useAppStore((s) => s.toggleGoal)
  const [showAddSheet, setShowAddSheet] = useState(false)
  // 新建目标表单
  const [newText, setNewText] = useState('')
  const [newTotal, setNewTotal] = useState(10)

  const completedCount = useMemo(
    () => goals.reduce((sum, g) => sum + g.done, 0),
    [goals],
  )
  const targetTotal = useMemo(
    () => goals.reduce((sum, g) => sum + g.total, 0),
    [goals],
  )
  // 当无目标时默认目标为 20 题
  const displayTarget = targetTotal > 0 ? targetTotal : 20
  const ringDeg = Math.min(360, (completedCount / displayTarget) * 360)

  const submitGoal = () => {
    const text = newText.trim()
    if (!text) return
    addGoal({
      text,
      total: Math.max(1, newTotal),
    })
    setNewText('')
    setNewTotal(10)
    setShowAddSheet(false)
  }

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 周${'日一二三四五六'[today.getDay()]}`

  const streakDays = stats?.streakDays ?? 0
  const hasGoals = goals.length > 0
  // 今日是否已打卡：基于 lastPracticeISO 是否为今天
  const isCheckedInToday = stats?.lastPracticeISO === todayISO()

  // 基于真实打卡数据计算本周打卡情况
  const weekView = useMemo(() => {
    const result: { day: string; state: 'filled' | 'current' | 'empty'; label: string }[] = []
    const dayNames = ['日', '一', '二', '三', '四', '五', '六']
    const now = new Date()
    const todayIdx = now.getDay()
    // 周一开始：调整顺序为 一/二/三/四/五/六/日
    const order = [1, 2, 3, 4, 5, 6, 0]
    // 今天相对本周一（周一为一周起点）的天数：周日=6，周一=0 ... 周六=5
    const mondayOffset = (todayIdx + 6) % 7
    for (const dow of order) {
      const isToday = dow === todayIdx
      // 该天在本周相对周一的位置（周一=0 ... 周日=6）
      const dayOffset = dow === 0 ? 6 : dow - 1
      // 该天相对今天的天数：负数=过去，0=今天，正数=未来（本周剩余）
      const diff = dayOffset - mondayOffset
      // 连续打卡覆盖：仅当该天在过去 且 距今不超过 streakDays-1 天时视为已打卡
      const filled = !isToday && diff >= -(streakDays - 1) && diff < 0 && streakDays > 0
      result.push({
        day: dayNames[dow],
        state: isToday ? 'current' : filled ? 'filled' : 'empty',
        label: isToday ? '今日' : dayNames[dow],
      })
    }
    return result
  }, [streakDays])

  return (
    <AppShell>
      <div className="screen-header screen-header-start">
        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 className="page-title">
              每日目标
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--ink-3)', margin: 0 }}>{dateStr}</p>
          </div>
          <button
            onClick={() => setShowAddSheet(true)}
            aria-label="添加目标"
            className="icon-btn icon-btn-primary"
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Main Goal Card */}
        <div
          style={{
            background: 'var(--brand-8)',
            border: '1px solid var(--brand-15)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              margin: '0 0 20px',
              color: 'var(--ink)',
            }}
          >
            今日进度
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Progress Ring */}
            <div
              className="goal-ring"
              style={{
                background: `conic-gradient(var(--brand) 0deg, var(--brand) ${ringDeg}deg, var(--surface-3) ${ringDeg}deg, var(--surface-3) 360deg)`,
              }}
            >
              <div className="goal-ring-content">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '36px',
                      fontWeight: 700,
                      color: 'var(--brand)',
                      lineHeight: 1,
                    }}
                  >
                    {completedCount}
                  </span>
                  <span style={{ fontSize: '14px', color: 'var(--ink-3)', fontWeight: 400 }}>
                    / {displayTarget}
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: '12px 0 4px' }}>
              已完成 {completedCount} 题
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ink-3)', margin: 0 }}>
              {completedCount >= displayTarget
                ? '太棒了，今日目标已完成！'
                : hasGoals
                  ? `再坚持一下，还差 ${Math.max(0, displayTarget - completedCount)} 题！`
                  : '点击右上角加号，添加你的第一个目标'}
            </p>
          </div>
        </div>

        {/* Goal Checklist or Empty State */}
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              margin: '0 0 12px',
              color: 'var(--ink)',
            }}
          >
            学习计划
          </h2>

          {!hasGoals ? (
            /* ── 空状态 ── */
            <div
              style={{
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 20px',
                textAlign: 'center',
                boxShadow: 'var(--inner-hl), var(--shadow-2)',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 14px',
                  borderRadius: '18px',
                  background:
                    'linear-gradient(135deg, rgba(47, 107, 255, 0.10) 0%, rgba(91, 140, 255, 0.14) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Target size={26} color="var(--brand)" strokeWidth={2} />
              </div>
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--ink)',
                  margin: '0 0 6px',
                }}
              >
                还没有目标
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--ink-2)',
                  margin: '0 0 18px',
                  lineHeight: 1.5,
                }}
              >
                添加每日学习目标，打卡记录会帮助你坚持
              </p>
              <button
                onClick={() => setShowAddSheet(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px -4px rgba(47, 107, 255, 0.4)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                添加目标
              </button>
            </div>
          ) : (
            goals.map((g) => (
              <div
                key={g.id}
                className="surface-row"
                style={{
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <button
                  onClick={() => toggleGoal(g.id)}
                  aria-label={g.completed ? '标记为未完成' : '标记为完成'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  {g.completed ? (
                    <CheckCircle2 size={22} color="var(--state-success)" strokeWidth={2} />
                  ) : (
                    <Circle size={22} color="var(--ink-3)" strokeWidth={2} />
                  )}
                </button>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      color: g.completed ? 'var(--ink-3)' : 'var(--ink)',
                      textDecoration: g.completed ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {g.text}
                  </span>
                  <span
                    style={{
                      fontSize: '13px',
                      color: 'var(--ink-3)',
                      whiteSpace: 'nowrap',
                      marginLeft: '8px',
                    }}
                  >
                    {g.done}/{g.total} 题
                  </span>
                </div>
                <button
                  onClick={() => deleteGoal(g.id)}
                  aria-label="删除目标"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--ink-3)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Streak Card — 真实打卡数据 */}
        <div style={{ marginBottom: '20px' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              margin: '0 0 12px',
              color: 'var(--ink)',
            }}
          >
            打卡记录
          </h2>

          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: 'var(--inner-hl), var(--shadow-2)',
            }}
          >
            {/* 7-day week view — 基于真实 streakDays */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              {weekView.map((d) => (
                <div
                  key={d.day}
                  className={`streak-dot ${d.state}`}
                  style={
                    d.state === 'current'
                      ? {
                          width: '40px',
                          height: '40px',
                          background: isCheckedInToday
                            ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)'
                            : 'var(--brand-8)',
                          color: isCheckedInToday ? '#fff' : 'var(--brand)',
                          fontWeight: 700,
                          boxShadow: isCheckedInToday
                            ? '0 0 0 3px rgba(47, 107, 255, 0.2), 0 4px 12px -2px rgba(47, 107, 255, 0.4)'
                            : '0 0 0 2px rgba(47, 107, 255, 0.15)',
                          flexDirection: 'column',
                          lineHeight: 1.1,
                        }
                      : { flexDirection: 'column', lineHeight: 1.1 }
                  }
                >
                  <span style={{ fontSize: '12px' }}>{d.day}</span>
                  {d.state === 'current' && (
                    <span style={{ fontSize: '9px', fontWeight: 600 }}>
                      {isCheckedInToday ? '已打卡' : '今日'}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Streak message — 真实数据 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={20} color="var(--brand)" strokeWidth={2} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand)' }}>
                {streakDays > 0 ? `连续打卡 ${streakDays} 天` : '尚未开始打卡'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: 0, textAlign: 'center' }}>
              {streakDays > 0
                ? '坚持每日练习，让学习成为习惯'
                : '完成第一次练习，开启你的打卡之旅'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/practice-setup')}
            disabled={questionCount === 0}
            style={{
              flex: 1,
              padding: '14px 0',
              background: questionCount === 0 ? 'var(--surface-3)' : 'var(--brand)',
              color: questionCount === 0 ? 'var(--ink-3)' : '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              fontWeight: 600,
              cursor: questionCount === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Zap size={16} strokeWidth={2.4} />
            {questionCount === 0 ? '暂无题目' : '开始今日练习'}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              flex: 1,
              padding: '14px 0',
              background: 'var(--bg)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            返回首页
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* ── 添加目标底部弹层 ── */}
      {showAddSheet && (
        <BottomSheet title="添加学习目标" onClose={() => setShowAddSheet(false)}>
          <FormRow label="目标内容">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="例如：完成数学函数练习"
              style={inputStyle}
              autoFocus
            />
          </FormRow>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: '6px',
              }}
            >
              题目数量：<span style={{ color: 'var(--brand)' }}>{newTotal}</span>
            </label>
            <SegmentedControl
              value={String(newTotal)}
              options={[5, 10, 15, 20, 30].map((n) => ({ id: String(n), label: String(n) }))}
              onChange={(id) => setNewTotal(Number(id))}
            />
          </div>

          <button
            onClick={submitGoal}
            disabled={!newText.trim()}
            style={{
              width: '100%',
              padding: '14px',
              background: newText.trim()
                ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)'
                : 'var(--surface-3)',
              color: newText.trim() ? '#fff' : 'var(--ink-3)',
              border: 'none',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: newText.trim() ? 'pointer' : 'not-allowed',
              boxShadow: newText.trim() ? '0 6px 16px -4px rgba(47, 107, 255, 0.45)' : 'none',
            }}
          >
            添加目标
          </button>
        </BottomSheet>
      )}

      <style>{`
        .goal-ring {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .goal-ring::before {
          content: '';
          width: 92px;
          height: 92px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.85);
          position: absolute;
        }
        .goal-ring .goal-ring-content {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .streak-dot {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 500;
        }
        .streak-dot.filled {
          background: linear-gradient(135deg, var(--state-success) 0%, #4ade80 100%);
          color: #ffffff;
          box-shadow: 0 4px 10px -2px rgba(22, 163, 74, 0.4);
        }
        .streak-dot.empty {
          background: var(--surface-2);
          color: var(--ink-3);
        }
      `}</style>
    </AppShell>
  )
}
