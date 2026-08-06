// DESIGN.md 与 index.css 设计 token 一致性检查。
// 防止视觉契约与实现漂移（如历史 #4F46E5 vs #2563EB 问题）。
// 用法：node scripts/check-design-tokens.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(path.join(root, 'src', 'index.css'), 'utf8')
const md = readFileSync(path.join(root, 'DESIGN.md'), 'utf8')

// 从 index.css 的 :root 块提取 token
const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? ''
const cssTokens = new Map()
for (const m of rootBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  cssTokens.set(m[1], m[2].trim())
}

// 从 DESIGN.md 表格提取 token：| `--brand` | `#2563EB` | 用途 |
const mdTokens = new Map()
for (const m of md.matchAll(/\| `(--[a-z0-9-]+)` \| `([^`]+)` \|/g)) {
  mdTokens.set(m[1], m[2].trim())
}

const tracked = [
  'brand',
  'brand-light',
  'brand-dark',
  'bg',
  'surface',
  'surface-2',
  'ink',
  'ink-2',
  'ink-3',
  'line',
  'state-success',
  'state-warning',
  'state-error',
]

const failures = []
for (const name of tracked) {
  const cssValue = cssTokens.get(name)
  const mdValue = mdTokens.get(`--${name}`)
  if (cssValue === undefined) {
    failures.push(`index.css 缺少 token: --${name}`)
  } else if (mdValue !== undefined && mdValue.toLowerCase() !== cssValue.toLowerCase()) {
    failures.push(`token 漂移: --${name} DESIGN.md=${mdValue} index.css=${cssValue}`)
  }
}

if (failures.length > 0) {
  console.error('✗ 设计 token 一致性检查失败：')
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('✓ 设计 token 一致性检查通过（DESIGN.md 与 index.css 对齐）')
