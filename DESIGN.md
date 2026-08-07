# DESIGN.md — 智能题库（tiku-app）设计契约

本文件是 UI 视觉的权威来源（source of truth）。实现 token 位于 `src/index.css`
的 `@theme` 与 `:root` 块；**两处必须保持一致**。改样式前先读本契约，改完
同步更新 `src/index.css` 对应 token。

## 1. 设计语言：暖色底 + 液态玻璃 + 环境光斑

- **暖中性底**：背景 `#F6F5F2`（暗色 `#0F0F12`），比冷灰更柔和。
- **液态玻璃**：高不透明度渐变基底（导航 0.82–0.90）+ `backdrop-filter` 重模糊
  （导航栏 48px、弹层 32px）作为增强，配多层内阴影模拟折射高光；用于底部导航、
  底部弹层、计时胶囊。基底不透明度保证 Android WebView 不支持 backdrop-filter
  时导航仍可读。
- **环境光斑**：body 上 5 个径向渐变光斑（品牌蓝/紫/青），卡片右上角有小光斑
  呼应；玻璃元素靠背后的光斑产生"透光"感。
- **卡片语言**：顶部 1px 白色内高光（`--inner-hl`）+ 双层柔和投影；重点卡片顶部
  有一条品牌色渐变装饰线。
- **交互动效**：按压 `scale(0.97)`、选中弹性弹出 `cubic-bezier(0.34,1.56,0.64,1)`、
  答错左右抖动；页面切换用淡入+上移+轻微缩放+模糊消散。

## 2. 语义 token（与 index.css 对齐）

| Token | 值（浅色） | 用途 |
| --- | --- | --- |
| `--brand` | `#2563EB` | 主品牌色：按钮、激活态、链接 |
| `--brand-light` | `#60A5FA` | 渐变端点、hover 辅助 |
| `--brand-dark` | `#1D4ED8` | 按压态 |
| `--bg` | `#F6F5F2` | 页面背景 |
| `--surface` | `#FFFFFF` | 卡片/输入框表面 |
| `--surface-2` | `#F0EFEB` | 次级表面（分段控件底、徽章底） |
| `--ink` | `#1A1A1F` | 主文字 |
| `--ink-2` | `#52525B` | 次级文字 |
| `--ink-3` | `#8E8E93` | 弱化文字/占位 |
| `--line` | `#DDD9D4` | 边框 |
| `--state-success` | `#16A34A` | 正确/成功 |
| `--state-warning` | `#F59E0B` | 警告 |
| `--state-error` | `#DC2626` | 错误/答错 |

圆角阶梯：`--radius-sm 8 / md 12 / lg 16 / xl 20 / 2xl 24 / full 9999`。
阴影阶梯：`--shadow-1..4`（1 最轻，4 最重，暖色黑 `rgba(26,26,31,…)`）。

## 3. 暗色模式

`.dark` 类切换全部 token：背景 `#0F0F12`、表面 `#1A1A1F`、文字反白、
`--brand` 变亮蓝 `#60A5FA`、阴影改纯黑。新样式必须提供暗色覆盖。

## 4. 组件类清单（index.css）

- **导航**：`.bottom-nav-bar`（液态玻璃）、`.nav-active-indicator`（物理滑块）、
  `.nav-shimmer`（微光扫过）、`.nav-tucked`（滚动收起）
- **卡片**：`.card` / `.card-bordered` / `.card-elevated` / `.progress-card` /
  `.chart-card` / `.stat-card` / `.question-card` / `.activity-row` /
  `.recommend-card` / `.session-question-card` / `.setting-card`
- **控件**：`.icon-btn` / `.primary-btn` / `.outline-btn` / `.chip` /
  `.segmented` / `.search-field` / `.toggle` / `.qty-btn` / `.fab` / `.progress-continue`
- **反馈**：`.empty-state`（+ `.empty-state-icon/title/desc/cta`）、`.session-option`
  （+ `.selected/.correct/.wrong`）
- **弹层**：`.sheet-overlay` / `.sheet`

## 5. Do / Don't

**Do**
- 数字用 `font-variant-numeric: tabular-nums` 对齐
- 标题用 `letter-spacing: -0.02em`；交互元素都加 `transition`
- 重要按钮用品牌渐变 + `--shadow-brand` 光晕
- 新视觉元素优先复用上述类，避免重复 inline style

**Don't**
- 不要新增第二个蓝色系（如 Indigo `#4F46E5`）——统一用 `--brand`
- 不要用纯白卡片堆叠：卡片至少带 `--inner-hl` 顶部高光
- 不要在暗色模式漏掉覆盖（对比度会崩）
- 不要为 0 个元素的页面写死空壳，用 `.empty-state` 引导

## 6. 变更流程

1. 改 `src/index.css` 的 token 或组件类后，同步更新本文档对应条目
2. 涉及新视觉语言（新材质/新动效），先在本文件补一节再实现
