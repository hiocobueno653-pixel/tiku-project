import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Bookmark, Edit2, Trash2, Upload, FileQuestion } from 'lucide-react'
import AppShell from '../components/AppShell'
import BottomSheet from '../components/BottomSheet'
import { FormRow, FieldError, SegmentedControl } from '../components/ui'
import { inputStyle, selectStyle } from '../components/ui-styles'
import ExamUploader from '../components/ExamUploader'
import { useAppStore } from '../store/useAppStore'
import {
  QUESTIONS,
  CATEGORIES,
  SUBJECTS,
  SUBJECT_COLORS,
  SUBJECT_LABELS,
  difficultyLabel,
} from '../data/sample-data'
import { loadAiConfig } from '../data/ai-config'
import type {
  AiApiConfig,
  Difficulty,
  ParsedQuestion,
  Question,
  SubjectId,
} from '../data/types'

const DIFFICULTY_COLOR: Record<Difficulty, { bg: string; fg: string }> = {
  simple: { bg: 'rgba(22, 163, 74, 0.10)', fg: 'var(--state-success)' },
  medium: { bg: 'var(--brand-8)', fg: 'var(--brand)' },
  hard: { bg: 'rgba(220, 38, 38, 0.10)', fg: 'var(--state-error)' },
}

// Map Chinese category label → subject id (生物 has no matching subject yet)
const CATEGORY_TO_SUBJECT: Record<string, SubjectId | undefined> = {
  数学: 'math',
  英语: 'english',
  物理: 'physics',
  化学: 'chemistry',
  生物: undefined,
}

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'simple', label: '简单' },
  { id: 'medium', label: '中等' },
  { id: 'hard', label: '困难' },
]

export default function QuestionBank() {
  const navigate = useNavigate()
  const questions = useAppStore((s) => s.questions)
  const favoriteIds = useAppStore((s) => s.favoriteIds)
  const addQuestion = useAppStore((s) => s.addQuestion)
  const updateQuestion = useAppStore((s) => s.updateQuestion)
  const deleteQuestion = useAppStore((s) => s.deleteQuestion)
  const batchImport = useAppStore((s) => s.batchImport)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('全部')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [showUploader, setShowUploader] = useState(false)
  // 题库页只读取配置（配置在 AI 问答页完成）；每次打开上传组件时重新读取最新值
  const [aiConfig, setAiConfig] = useState<AiApiConfig | null>(null)

  // 异步加载 AI 配置（Capacitor Preferences）
  useEffect(() => {
    loadAiConfig().then(setAiConfig)
  }, [])

  // 每次打开 uploader 前刷新一次配置（用户可能刚在 AI 问答页改过）
  const openUploader = async () => {
    const cfg = await loadAiConfig()
    setAiConfig(cfg)
    setShowUploader(true)
  }

  const allQuestions = useMemo(
    () => [...questions, ...QUESTIONS],
    [questions],
  )

  const filtered = useMemo(() => {
    const subjectId = CATEGORY_TO_SUBJECT[category]
    return allQuestions.filter((q) => {
      if (favoritesOnly && !favoriteIds.includes(q.id)) return false
      const matchCat =
        category === '全部' || (subjectId !== undefined && q.subject === subjectId)
      const matchQuery =
        !query ||
        q.content.includes(query) ||
        q.category.includes(query) ||
        q.id.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQuery
    })
  }, [query, category, allQuestions, favoritesOnly, favoriteIds])

  const favoriteCount = useMemo(
    () => allQuestions.filter((q) => favoriteIds.includes(q.id)).length,
    [favoriteIds, allQuestions],
  )

  const openAdd = () => {
    setEditing(null)
    setShowAdd(true)
  }

  const openEdit = (q: Question) => {
    // 只允许编辑用户自己添加的题目
    if (!questions.some((uq) => uq.id === q.id)) return
    setEditing(q)
    setShowAdd(true)
  }

  const handleDelete = (q: Question) => {
    if (!questions.some((uq) => uq.id === q.id)) return
    if (!window.confirm(`确定删除题目 ${q.id} 吗？`)) return
    deleteQuestion(q.id)
  }

  const handleSubmit = (data: Omit<Question, 'id' | 'createdAt' | 'favorite'>) => {
    if (editing) {
      updateQuestion({ ...editing, ...data })
    } else {
      addQuestion(data)
    }
    setShowAdd(false)
    setEditing(null)
  }

  // 从试卷上传批量导入
  const handleBatchImport = (parsed: ParsedQuestion[]) => {
    if (parsed.length === 0) return
    batchImport(parsed)
    setShowUploader(false)
  }

  return (
    <AppShell>
      {/* Top Bar */}
      <div className="screen-header">
        <h1 className="page-title">题库管理</h1>
        <div className="screen-header-actions">
          <button
            onClick={openUploader}
            className="outline-btn"
            aria-label="上传试卷"
          >
            <Upload size={14} strokeWidth={2} />
            上传试卷
          </button>
          <button
            onClick={openAdd}
            className="icon-btn icon-btn-primary"
            aria-label="手动新增题目"
          >
            <Plus size={18} color="#fff" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-4">
        <div className="search-field">
          <Search
            size={16}
            color="var(--ink-3)"
            strokeWidth={2}
            style={{ flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="搜索题目、知识点..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-4 mt-3 no-scrollbar">
        <div className="chip-row">
          {CATEGORIES.map((c) => {
            const active = c === category
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={active ? 'chip active' : 'chip'}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 mt-3 stats-bar">
        <span>
          共 {filtered.length} 题（自建 {questions.length}）
        </span>
        <div className="stats-actions">
          <button
            onClick={() => setFavoritesOnly((v) => !v)}
            aria-label={favoritesOnly ? '显示全部题目' : '只看收藏'}
            className={favoritesOnly ? 'chip active' : 'chip'}
            style={{ padding: '3px 10px', fontSize: '11px' }}
          >
            <Bookmark
              size={13}
              strokeWidth={2}
              fill={favoritesOnly ? 'var(--brand)' : 'none'}
            />
            {favoritesOnly ? '取消筛选' : '只看收藏'}
          </button>
          <span>已收藏 {favoriteCount}</span>
        </div>
      </div>

      {/* Question List */}
      <div className="px-4 pb-24 mt-3">
        {filtered.length === 0 && (
          <div className="empty-state" style={{ padding: '48px 16px' }}>
            <div className="empty-state-icon" style={{ width: '56px', height: '56px', borderRadius: '16px' }}>
              <FileQuestion size={26} strokeWidth={1.8} color="var(--brand)" />
            </div>
            <p className="empty-state-title">没有找到匹配的题目</p>
            <p className="empty-state-desc">
              试试更换关键词，或点击右上角「上传试卷」批量导入新题目
            </p>
          </div>
        )}
        {filtered.map((q) => (
          <QuestionCard
            key={q.id}
            q={q}
            favorite={favoriteIds.includes(q.id)}
            onToggleFavorite={() => toggleFavorite(q.id)}
            onEdit={() => openEdit(q)}
            onDelete={() => handleDelete(q)}
            isUserCreated={questions.some((uq) => uq.id === q.id)}
          />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        className="fab"
        aria-label="新增题目"
      >
        <Plus size={24} color="#fff" strokeWidth={2.5} />
      </button>

      {showAdd && (
        <QuestionFormModal
          initial={editing}
          onClose={() => {
            setShowAdd(false)
            setEditing(null)
          }}
          onSubmit={handleSubmit}
        />
      )}

      {showUploader && (
        <ExamUploader
          aiConfig={aiConfig}
          onClose={() => setShowUploader(false)}
          onImport={handleBatchImport}
          onOpenSettings={() => {
            setShowUploader(false)
            // 跳转到 AI 问答页让用户配置（题库页本身没有设置入口）
            navigate('/ai-chat')
          }}
        />
      )}
    </AppShell>
  )
}

function QuestionCard({  q,
  favorite,
  onToggleFavorite,
  onEdit,
  onDelete,
  isUserCreated,
}: {
  q: Question
  favorite: boolean
  onToggleFavorite: () => void
  onEdit: () => void
  onDelete: () => void
  isUserCreated: boolean
}) {
  const diffColor = DIFFICULTY_COLOR[q.difficulty]
  return (
    <div className="question-card">
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{q.id}</span>
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: `${SUBJECT_COLORS[q.subject]}14`,
              color: SUBJECT_COLORS[q.subject],
              fontWeight: 600,
            }}
          >
            {SUBJECT_LABELS[q.subject]}
          </span>
          {isUserCreated && (
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(22, 163, 74, 0.10)',
                color: 'var(--state-success)',
                fontWeight: 500,
              }}
            >
              自建
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: diffColor.bg,
            color: diffColor.fg,
            fontWeight: 500,
          }}
        >
          {difficultyLabel(q.difficulty)}
        </span>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--ink)',
          lineHeight: 1.5,
          margin: '0 0 12px 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {q.content}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-2)',
              color: 'var(--ink-2)',
            }}
          >
            {q.category}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{q.createdAt}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFavorite}
            aria-label="收藏"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            <Bookmark
              size={16}
              color={favorite ? 'var(--brand)' : 'var(--ink-3)'}
              fill={favorite ? 'var(--brand)' : 'none'}
              strokeWidth={2}
            />
          </button>
          <button
            onClick={onEdit}
            disabled={!isUserCreated}
            aria-label={isUserCreated ? '编辑' : '内置题目不可编辑'}
            style={{
              background: 'none',
              border: 'none',
              cursor: isUserCreated ? 'pointer' : 'not-allowed',
              padding: 0,
              display: 'flex',
              opacity: isUserCreated ? 1 : 0.35,
            }}
          >
            <Edit2 size={16} color="var(--ink-3)" strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            disabled={!isUserCreated}
            aria-label={isUserCreated ? '删除' : '内置题目不可删除'}
            style={{
              background: 'none',
              border: 'none',
              cursor: isUserCreated ? 'pointer' : 'not-allowed',
              padding: 0,
              display: 'flex',
              opacity: isUserCreated ? 1 : 0.35,
            }}
          >
            <Trash2 size={16} color="var(--ink-3)" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── 新增/编辑题目模态框 ── */
interface FormState {
  subject: SubjectId
  category: string
  difficulty: Difficulty
  content: string
  options: [string, string, string, string]
  answer: string
  explanation: string
}

function QuestionFormModal({
  initial,
  onClose,
  onSubmit,
}: {
  initial: Question | null
  onClose: () => void
  onSubmit: (data: Omit<Question, 'id' | 'createdAt' | 'favorite'>) => void
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        subject: initial.subject,
        category: initial.category,
        difficulty: initial.difficulty,
        content: initial.content,
        options: [
          initial.options[0]?.text ?? '',
          initial.options[1]?.text ?? '',
          initial.options[2]?.text ?? '',
          initial.options[3]?.text ?? '',
        ],
        answer: initial.answer,
        explanation: initial.explanation,
      }
    }
    return {
      subject: 'math',
      category: '',
      difficulty: 'medium',
      content: '',
      options: ['', '', '', ''],
      answer: 'A',
      explanation: '',
    }
  })

  const [touched, setTouched] = useState(false)

  const valid =
    form.content.trim().length > 0 &&
    form.category.trim().length > 0 &&
    form.options.every((o) => o.trim().length > 0) &&
    !!form.answer

  const submit = () => {
    setTouched(true)
    if (!valid) return
    onSubmit({
      subject: form.subject,
      category: form.category.trim(),
      difficulty: form.difficulty,
      content: form.content.trim(),
      options: [
        { key: 'A', text: form.options[0].trim() },
        { key: 'B', text: form.options[1].trim() },
        { key: 'C', text: form.options[2].trim() },
        { key: 'D', text: form.options[3].trim() },
      ],
      answer: form.answer,
      explanation: form.explanation.trim(),
    })
  }

  return (
    <BottomSheet title={initial ? '编辑题目' : '新增题目'} onClose={onClose}>
      <FormRow label="科目">
        <select
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value as SubjectId }))}
          style={selectStyle}
        >
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormRow>

      <FormRow label="知识点分类">
        <input
          type="text"
          placeholder="如：函数与导数 / 定语从句"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          style={inputStyle}
        />
        {touched && !form.category.trim() && <FieldError>请填写知识点分类</FieldError>}
      </FormRow>

      <FormRow label="难度">
        <SegmentedControl
          value={form.difficulty}
          options={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))}
          onChange={(id) => setForm((f) => ({ ...f, difficulty: id }))}
        />
      </FormRow>

      <FormRow label="题目内容">
        <textarea
          placeholder="请输入完整的题目描述..."
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
        />
        {touched && !form.content.trim() && <FieldError>请填写题目内容</FieldError>}
      </FormRow>

      <FormRow label="选项（请填写 4 个选项的内容）">
        <div className="flex flex-col gap-2">
          {(['A', 'B', 'C', 'D'] as const).map((key, i) => {
            const isAnswer = form.answer === key
            return (
              <div key={key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, answer: key }))}
                  aria-label={`设为正确答案 ${key}`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    background: isAnswer ? 'var(--state-success)' : 'var(--surface-2)',
                    color: isAnswer ? '#fff' : 'var(--ink-2)',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {key}
                </button>
                <input
                  type="text"
                  placeholder={`选项 ${key} 内容`}
                  value={form.options[i]}
                  onChange={(e) => {
                    const next = [...form.options] as FormState['options']
                    next[i] = e.target.value
                    setForm((f) => ({ ...f, options: next }))
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>
            )
          })}
        </div>
        <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '6px 0 0' }}>
          点击左侧字母圆圈可设为正确答案（绿色）
        </p>
        {touched && !form.options.every((o) => o.trim()) && (
          <FieldError>4 个选项均需填写</FieldError>
        )}
      </FormRow>

      <FormRow label="解析（可选）">
        <textarea
          placeholder="解题思路、知识点说明..."
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '56px' }}
        />
      </FormRow>

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'var(--surface-2)',
            color: 'var(--ink)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          取消
        </button>
        <button
          onClick={submit}
          style={{
            flex: 1,
            padding: '12px 0',
            background: 'var(--brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-brand)',
          }}
        >
          {initial ? '保存修改' : '添加题目'}
        </button>
      </div>
    </BottomSheet>
  )
}
