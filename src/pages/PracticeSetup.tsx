import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  BookOpen,
  Signal,
  Settings as SettingsIcon,
  Play,
  Minus,
  Plus,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import { useAppStore } from '../store/useAppStore'
import {
  computeSubjectCounts,
  computeDifficultyCounts,
  SUBJECT_COLORS,
  type SubjectId,
  type Difficulty,
} from '../data/questions'

type SubjectIcon = 'math' | 'english' | 'physics' | 'chemistry'
type IconProps = { size: number; color: string; strokeWidth: number }
type IconComp = (props: IconProps) => JSX.Element

const SUBJECT_ICON_MAP: Record<SubjectIcon, IconComp> = {
  math: MathIcon,
  english: EnglishIcon,
  physics: PhysicsIcon,
  chemistry: ChemistryIcon,
}

export default function PracticeSetup() {
  const navigate = useNavigate()
  const [subject, setSubject] = useState<SubjectId>('math')
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all')
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(true)

  // 从用户题库动态计算科目数与难度数（使用 useMemo 缓存，避免每次渲染读 localStorage）
  const userQuestions = useAppStore((s) => s.questions)
  const subjectList = useMemo(() => computeSubjectCounts(userQuestions), [userQuestions])
  const diffCounts = useMemo(() => computeDifficultyCounts(userQuestions), [userQuestions])
  const DIFFICULTIES: { id: Difficulty | 'all'; label: string; count: number }[] = [
    { id: 'all', label: '全部', count: diffCounts.all },
    { id: 'simple', label: '简单', count: diffCounts.simple },
    { id: 'medium', label: '中等', count: diffCounts.medium },
    { id: 'hard', label: '困难', count: diffCounts.hard },
  ]

  const startPractice = () => {
    const params = new URLSearchParams({
      subject,
      difficulty,
      count: String(count),
      timed: String(timed),
    })
    navigate(`/practice?${params.toString()}`)
  }

  return (
    <AppShell>
      {/* Top Bar */}
      <div className="screen-header">
        <button
          onClick={() => navigate(-1)}
          className="icon-btn"
          aria-label="返回"
        >
          <ChevronLeft size={18} color="var(--ink-2)" strokeWidth={2} />
        </button>
        <h1 className="page-title">
          开始练习
        </h1>
        <span className="header-spacer" />
      </div>

      {/* Subject Selection */}
      <div className="px-4 mt-6">
        <div className="section-heading">
          <BookOpen size={18} color="var(--brand)" strokeWidth={2} />
          <h2>选择科目</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {subjectList.map((s) => {
            const selected = s.id === subject
            const Icon = SUBJECT_ICON_MAP[s.icon]
            return (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className="subject-card"
                style={{
                  background: selected ? `${SUBJECT_COLORS[s.id]}12` : 'var(--surface)',
                  border: `1.5px solid ${selected ? SUBJECT_COLORS[s.id] : 'var(--line)'}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: selected ? '0 4px 14px -4px rgba(23, 35, 58, 0.10)' : 'none',
                  padding: '16px 12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    background: selected ? SUBJECT_COLORS[s.id] : `${SUBJECT_COLORS[s.id]}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <Icon
                    size={20}
                    color={selected ? '#FFFFFF' : 'var(--ink-2)'}
                    strokeWidth={2}
                  />
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: selected ? SUBJECT_COLORS[s.id] : 'var(--ink)',
                  }}
                >
                  {s.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '2px' }}>
                  {s.count} 题
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="px-4 mt-6">
        <div className="section-heading">
          <Signal size={18} color="var(--brand)" strokeWidth={2} />
          <h2>选择难度</h2>
        </div>

        <div className="segmented">
          {DIFFICULTIES.map((d) => {
            const selected = d.id === difficulty
            return (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={selected ? 'active' : undefined}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: selected ? 600 : 500,
                    color: selected ? 'var(--brand)' : 'var(--ink)',
                    textAlign: 'center',
                  }}
                >
                  {d.label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: selected ? 'rgba(47, 107, 255, 0.7)' : 'var(--ink-3)',
                    textAlign: 'center',
                    marginTop: '2px',
                  }}
                >
                  {d.count} 题
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Settings Row */}
      <div className="px-4 mt-6">
        <div className="section-heading">
          <SettingsIcon size={18} color="var(--brand)" strokeWidth={2} />
          <h2>练习设置</h2>
        </div>

        <div className="setting-card">
          {/* Number of questions */}
          <div
            className="setting-row"
          >
            <span className="setting-row-label">每轮题数</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount((c) => Math.max(5, c - 5))}
                className="qty-btn"
                aria-label="减少题数"
              >
                <Minus size={16} strokeWidth={2} />
              </button>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  minWidth: '24px',
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
              <button
                onClick={() => setCount((c) => Math.min(50, c + 5))}
                className="qty-btn"
                aria-label="增加题数"
              >
                <Plus size={16} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Timer toggle */}
          <div
            className="setting-row"
          >
            <span className="setting-row-label">计时模式</span>
            <button
              onClick={() => setTimed((t) => !t)}
              aria-label="切换计时模式"
              role="switch"
              aria-checked={timed}
              className="toggle"
            />
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="px-4 mt-6 mb-6">
        <button
          onClick={startPractice}
          className="primary-btn"
        >
          <Play size={18} color="#fff" strokeWidth={2.5} fill="#fff" />
          开始练习
        </button>
      </div>
    </AppShell>
  )
}

/* ── Custom subject icons (matching design's lucide-style strokes) ── */

function MathIcon({ size, color, strokeWidth }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function EnglishIcon({ size, color, strokeWidth }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  )
}

function PhysicsIcon({ size, color, strokeWidth }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m-7.07-3.93 4.24-4.24m5.66-5.66 4.24-4.24M1 12h6m6 0h6m-3.93 7.07-4.24-4.24M9.17 7.83 4.93 3.59" />
    </svg>
  )
}

function ChemistryIcon({ size, color, strokeWidth }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6" />
      <path d="M10 9V3h4v6" />
      <path d="M5 9h14" />
      <path d="M6 3h12v4a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V3" />
      <path d="M12 9v12" />
      <path d="M5 21h14" />
    </svg>
  )
}
