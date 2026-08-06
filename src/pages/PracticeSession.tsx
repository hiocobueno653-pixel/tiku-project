import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, Clock, SkipForward, Check, ChevronRight, RotateCcw, Library } from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAppStore } from '../store/useAppStore'
import { appendRecentActivity } from '../data/persistence'
import { difficultyLabel } from '../data/sample-data'
import type { Question, Difficulty, SubjectId } from '../data/types'

type Phase = 'answering' | 'feedback' | 'finished'

interface SessionQuestion extends Question {
  userAnswer?: string
  skipped?: boolean
}

export default function PracticeSession() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userQuestions = useAppStore((s) => s.questions)
  const recordSession = useAppStore((s) => s.recordSession)
  const subject = (params.get('subject') as SubjectId) || 'math'
  const difficulty = (params.get('difficulty') as Difficulty | 'all') || 'all'
  const total = Math.max(1, Number(params.get('count') || 10))
  const timed = params.get('timed') !== 'false'

  // Build a stable question set for this session — 从用户题库读取
  const sessionQuestions = useMemo<SessionQuestion[]>(() => {
    const userPool = userQuestions
    let pool = userPool.filter((q) => q.subject === subject)
    if (difficulty !== 'all') pool = pool.filter((q) => q.difficulty === difficulty)
    // 若该科目/难度下无题目，回退到全部用户题库
    if (pool.length === 0) pool = userPool.slice()
    // 若用户题库完全为空，返回空数组（外层会显示空状态）
    if (pool.length === 0) return []
    // Fisher-Yates 洗牌，确保均匀随机分布
    const shuffled = [...pool]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const out: SessionQuestion[] = []
    for (let i = 0; i < total; i++) {
      out.push({ ...shuffled[i % shuffled.length] })
    }
    return out
  }, [subject, difficulty, total, userQuestions])

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [phase, setPhase] = useState<Phase>('answering')
  const [answers, setAnswers] = useState<SessionQuestion[]>(sessionQuestions)
  const [elapsed, setElapsed] = useState(0)
  const [recorded, setRecorded] = useState(false) // 防止重复记录

  // 计算本次练习的统计结果（仅当 finished 时使用）
  const sessionStats = useMemo(() => {
    if (phase !== 'finished') return null
    const correct = answers.filter((a) => a.userAnswer && a.userAnswer === a.answer).length
    const answered = answers.filter((a) => !!a.userAnswer && !a.skipped).length
    return { correct, answered, total: answers.length }
  }, [phase, answers])

  // 进入 finished 阶段时，记录到 localStorage（仅一次）
  useEffect(() => {
    if (phase !== 'finished' || recorded || !sessionStats) return
    if (sessionStats.total === 0) return
    // 1. 累计做题数和正确数 + 更新连续打卡 + 累计学习时长
    recordSession(sessionStats.correct, sessionStats.answered, elapsed)
    // 2. 追加最近活动
    const accuracy =
      sessionStats.answered > 0
        ? Math.round((sessionStats.correct / sessionStats.answered) * 100)
        : 0
    const now = new Date()
    const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    appendRecentActivity({
      title: `练习 · ${sessionStats.total} 题`,
      time: timeStr,
      score: accuracy,
      completed: true,
    })
    setRecorded(true)
  }, [phase, recorded, sessionStats, elapsed, recordSession])

  // Timer
  useEffect(() => {
    if (!timed || phase === 'finished') return
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [timed, phase])

  const current = answers[index]
  const progressPct = ((index + (phase === 'feedback' ? 1 : 0)) / total) * 100

  const confirm = () => {
    if (!selected) return
    const next = [...answers]
    next[index] = { ...current, userAnswer: selected }
    setAnswers(next)
    setPhase('feedback')
  }

  const skip = () => {
    const next = [...answers]
    next[index] = { ...current, skipped: true }
    setAnswers(next)
    goNext()
  }

  const goNext = () => {
    if (index + 1 >= total) {
      setPhase('finished')
      return
    }
    setIndex((i) => i + 1)
    setSelected(undefined)
    setPhase('answering')
  }

  const restart = () => {
    setIndex(0)
    setSelected(undefined)
    setPhase('answering')
    setElapsed(0)
    setAnswers(sessionQuestions.map((q) => ({ ...q })))
    setRecorded(false)
  }

  // 题库为空时显示空状态
  if (sessionQuestions.length === 0) {
    return (
      <AppShell hideNav>
        <div className="px-4 pt-12 pb-24">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/practice-setup')}
              className="flex items-center justify-center w-9 h-9"
              style={{ color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}
              aria-label="返回"
            >
              <X size={20} strokeWidth={2} />
            </button>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              随机练习
            </h1>
            <span style={{ width: 36 }} />
          </div>
          <div style={{ textAlign: 'center', padding: '60px 16px' }}>
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
              }}
            >
              <Library size={32} color="var(--brand)" strokeWidth={2} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
              题库暂无题目
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: '0 0 24px', lineHeight: 1.5 }}>
              请先在题库页面添加题目，或上传试卷由 AI 解析
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/question-bank')}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px -4px rgba(47, 107, 255, 0.4)',
                }}
              >
                前往题库
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '12px 24px',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (phase === 'finished') {
    return (
      <ResultScreen
        answers={answers}
        elapsed={elapsed}
        timed={timed}
        onBackHome={() => navigate('/')}
        onPracticeAgain={restart}
      />
    )
  }

  return (
    <AppShell hideNav>
      <div className="px-4 pt-12 pb-24">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/practice-setup')}
            className="flex items-center justify-center w-9 h-9"
            style={{ color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label="退出练习"
          >
            <X size={20} strokeWidth={2} />
          </button>
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            随机练习
          </h1>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--brand)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {index + 1}/{total}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="session-progress">
          <div className="session-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        {/* Timer */}
        {timed && (
          <div className="session-timer">
            <Clock size={14} color="var(--ink-2)" strokeWidth={2} />
            <span>{formatTime(elapsed)}</span>
          </div>
        )}

        {/* Question Card */}
        <div className="session-question-card">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span
              style={{
                background: 'var(--brand-8)',
                borderRadius: 'var(--radius-full)',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brand)',
              }}
            >
              {current.id}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-3)' }}>
              {current.category}
            </span>
          </div>

          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: 1.6,
              color: 'var(--ink)',
              marginBottom: '12px',
            }}
          >
            {current.content}
          </p>

          <div className="flex items-center gap-1">
            <SignalMini />
            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-3)' }}>
              {difficultyLabel(current.difficulty)}
            </span>
          </div>
        </div>

        {/* Answer Options */}
        <div className="flex flex-col gap-3 mb-6">
          {current.options.map((opt) => {
            const isSelected = selected === opt.key
            const isCorrect = phase === 'feedback' && opt.key === current.answer
            const isWrong = phase === 'feedback' && isSelected && opt.key !== current.answer

            const stateClass = isCorrect ? ' correct' : isWrong ? ' wrong' : ''
            const selectedClass = isSelected && phase === 'answering' ? ' selected' : ''

            return (
              <button
                key={opt.key}
                onClick={() => phase === 'answering' && setSelected(opt.key)}
                disabled={phase === 'feedback'}
                className={`session-option${selectedClass}${stateClass}`}
              >
                <span className="session-option-badge">
                  {isCorrect ? <Check size={14} strokeWidth={3} /> : opt.key}
                </span>
                <span className="session-option-text">
                  {opt.text}
                </span>
              </button>
            )
          })}
        </div>

        {/* Feedback explanation */}
        {phase === 'feedback' && (
          <div
            className="animate-fade-in-up"
            style={{
              background: 'var(--surface-2)',
              borderLeft: '3px solid var(--brand)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--brand)',
                marginBottom: '6px',
              }}
            >
              {current.userAnswer === current.answer ? '回答正确' : '回答错误'}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6, margin: 0 }}>
              {current.explanation}
            </p>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          {phase === 'answering' ? (
            <>
              <button
                onClick={skip}
                className="flex items-center gap-1"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--ink-3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 4px',
                }}
              >
                <SkipForward size={16} strokeWidth={2} />
                跳过此题
              </button>
              <button
                onClick={confirm}
                disabled={!selected}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  background: selected ? 'var(--brand)' : 'var(--surface-3)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 24px',
                  cursor: selected ? 'pointer' : 'not-allowed',
                  transition: 'opacity 0.2s ease',
                }}
              >
                确认答案
              </button>
            </>
          ) : (
            <button
              onClick={goNext}
              style={{
                width: '100%',
                fontSize: '15px',
                fontWeight: 600,
                color: '#FFFFFF',
                background: 'var(--brand)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '14px 24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {index + 1 >= total ? '查看结果' : '下一题'}
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Bottom Info Hint */}
        {phase === 'answering' && (
          <p
            className="text-center"
            style={{ fontSize: '12px', fontWeight: 400, color: 'var(--ink-3)' }}
          >
            选择一个答案后点击确认
          </p>
        )}
      </div>
    </AppShell>
  )
}

/* ── Result Screen ── */
function ResultScreen({
  answers,
  elapsed,
  timed,
  onBackHome,
  onPracticeAgain,
}: {
  answers: SessionQuestion[]
  elapsed: number
  timed: boolean
  onBackHome: () => void
  onPracticeAgain: () => void
}) {
  const total = answers.length
  const correct = answers.filter((a) => a.userAnswer === a.answer).length
  const wrong = answers.filter((a) => a.userAnswer && a.userAnswer !== a.answer).length
  const skipped = answers.filter((a) => a.skipped || !a.userAnswer).length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <AppShell hideNav>
      <div className="px-4 pt-16 pb-8">
        {/* Trophy / Score */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'var(--brand-8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <span
              style={{
                fontSize: '36px',
                fontWeight: 700,
                color: 'var(--brand)',
              }}
            >
              {accuracy}
            </span>
          </div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--ink)',
              margin: '0 0 4px',
            }}
          >
            {accuracy >= 80 ? '太棒了！' : accuracy >= 60 ? '继续加油！' : '需要再练习'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--ink-2)', margin: 0 }}>本次练习正确率</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <ResultStat value={String(correct)} label="答对" color="var(--state-success)" />
          <ResultStat value={String(wrong)} label="答错" color="var(--state-error)" />
          <ResultStat value={String(skipped)} label="跳过" color="var(--ink-3)" />
        </div>

        {/* Time */}
        {timed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '32px',
              fontSize: '14px',
              color: 'var(--ink-2)',
            }}
          >
            <Clock size={16} strokeWidth={2} />
            <span>用时 {formatTime(elapsed)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onPracticeAgain}
            style={{
              width: '100%',
              padding: '16px',
              background: 'var(--brand)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px -3px rgba(47, 107, 255, 0.4)',
            }}
          >
            <RotateCcw size={18} strokeWidth={2.5} />
            再来一组
          </button>
          <button
            onClick={onBackHome}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--surface)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            返回首页
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function ResultStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--inner-hl), var(--shadow-1)',
        padding: '16px 8px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '24px', fontWeight: 700, color, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

/* ── helpers ── */
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function SignalMini() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--ink-3)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 20h.01" />
      <path d="M7 20v-4" />
      <path d="M12 20v-8" />
      <path d="M17 20V8" />
      <path d="M22 4v16" />
    </svg>
  )
}
