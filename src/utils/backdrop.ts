/**
 * 检测当前环境是否真正支持 backdrop-filter。
 * CSS @supports 只能检测语法；这里用属性赋值 + 读回验证，覆盖 WebKit 前缀差异。
 * 结果写入 <html data-backdrop="yes|no">，供 CSS 选择双态材质。
 */
export function detectBackdropFilterSupport(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.createElement('div')
  const props: Array<'backdropFilter' | 'webkitBackdropFilter'> = [
    'backdropFilter',
    'webkitBackdropFilter',
  ]
  for (const prop of props) {
    try {
      const style = el.style as unknown as Record<string, string>
      if (prop in style) {
        style[prop] = 'blur(2px)'
        if (style[prop] === 'blur(2px)') return true
      }
    } catch {
      // 某些环境赋值会抛错，视为不支持
    }
  }
  return false
}

/** 启动时调用一次：写入 data-backdrop 标记 */
export function applyBackdropDetection(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.backdrop = detectBackdropFilterSupport()
    ? 'yes'
    : 'no'
}
