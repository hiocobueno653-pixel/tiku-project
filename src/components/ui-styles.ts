// 公共 UI 样式常量 — 与组件文件分离，保证组件文件可 Fast Refresh
import type { CSSProperties } from 'react'

/* ── 输入框通用样式（默认 / 紧凑两档） ── */
export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-md)',
  fontSize: '14px',
  color: 'var(--ink)',
  outline: 'none',
  fontFamily: 'inherit',
}

export const compactInputStyle: CSSProperties = {
  ...inputStyle,
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
}

export const selectStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  WebkitAppearance: 'none',
  cursor: 'pointer',
}
