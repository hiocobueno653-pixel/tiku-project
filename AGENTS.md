# AGENTS.md — 智能题库（tiku-app）

本地优先的 React 18 + TypeScript + Vite 题库应用，带 Capacitor Android 壳。

## 命令

- 安装依赖：`npm install`
- 开发：`npm run dev`
- 测试：`npm test`（Vitest，收集 `src/**/*.test.ts`）
- 构建：`npm run build`（`tsc -b && vite build`，先做类型检查）
- 本地预览：`npm run preview`
- Android 同步：`npx cap sync android`

## 目录

- `src/pages/` — 页面组件（Home、QuestionBank、PracticeSession、DailyGoal、Statistics、AiChat、PracticeSetup）
- `src/components/` — 通用组件（ExamUploader 是最大的组件，改动前先确认其上传/解析流程）
- `src/data/` — 数据层：`types.ts`（类型）、`persistence.ts`（localStorage）、`exam-parser.ts`（AI 解析/PDF）、`stats.ts`（统计）、`ai-config.ts`（AI 配置）
- `src/store/` — Zustand 全局状态（`useAppStore.ts`）
- `src/services/` — 原生能力封装（`camera.ts`）
- `android/` — Capacitor Android 工程，生成产物不要手改

## 规则

- 数据读写集中在 `src/data/persistence.ts`，页面不要直接操作 localStorage。
- 修改 `types.ts` 或持久化信封格式时，必须同步检查 `persistence.ts` 的迁移逻辑（`migrators`）。
- 新增解析/统计/持久化逻辑时，在 `src/data/` 下补充 Vitest 测试并运行 `npm test`。
- AI API Key 只保存在本机（Capacitor Preferences 优先，localStorage 兜底），禁止提交到仓库。
- 不要直接编辑 `android/` 下的生成文件，使用 `npx cap sync android` 同步。
- 修改 `exam-parser.ts` 后同时运行 `npm run build`，确认类型检查通过。