// 公共 UI 原语 — 表单行 / 字段错误 / 输入样式 / 关闭圆钮 / 分段选择
// 消除 AiChat / QuestionBank / DailyGoal / ExamUploader 中的重复实现

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/* ── 表单行：label + 控件 ── */
export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

/* ── 字段校验错误提示 ── */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p style={{ fontSize: '11px', color: 'var(--state-error)', margin: '4px 0 0' }}>{children}</p>
  )
}

/* ── 弹层右上角 32px 圆形关闭按钮 ── */
export function SheetCloseButton({ onClick, label = '关闭' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="icon-btn"
      style={{ borderRadius: '50%' }}
    >
      <X size={18} strokeWidth={2} />
    </button>
  )
}

/* ── 分段选择（激活项品牌色底 / 白字） ── */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { id: T; label: ReactNode; count?: number }[]
  onChange: (id: T) => void
}) {
  return (
    <div className="segmented">
      {options.map((opt) => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={active ? 'active' : ''}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span style={{ fontSize: '11px', opacity: 0.85, marginLeft: '2px' }}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
