// 底部弹层（Bottom Sheet）— 统一 4 处弹层实现：
// AiChat 设置抽屉 / QuestionBank 题目表单 / DailyGoal 添加目标 / ExamUploader 上传面板

import type { ReactNode } from 'react'
import { SheetCloseButton } from './ui'

interface BottomSheetProps {
  title: ReactNode
  /** 可选：标题左侧的品牌色图标块 */
  icon?: ReactNode
  onClose: () => void
  children: ReactNode
  /** 面板最大高度，默认 90vh */
  maxHeight?: string
}

export default function BottomSheet({
  title,
  icon,
  onClose,
  children,
  maxHeight = '90vh',
}: BottomSheetProps) {
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div
        className="sheet animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight }}
      >
        {/* Grabber — 原生 app 风格顶部拖动条 */}
        <div
          style={{
            width: '36px',
            height: '4px',
            background: 'var(--surface-3)',
            borderRadius: '999px',
            margin: '0 auto 16px',
          }}
        />
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {icon && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'var(--brand-8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h2>
          </div>
          <SheetCloseButton onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  )
}
