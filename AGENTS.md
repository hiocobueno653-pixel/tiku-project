# AGENTS.md — 智能题库（tiku-app）

本地优先的 React 18 + TypeScript + Vite 题库应用，带 Capacitor Android 壳。

## 命令

- 安装依赖：`npm install`
- 开发：`npm run dev`
- 测试：`npm test`（Vitest，收集 `src/**/*.test.{ts,tsx}`）
- 聚焦测试：`npx vitest run <file>.test.ts(x)`（改动单模块时的低成本验证入口）
- 构建：`npm run build`（`tsc -b && vite build`，先做类型检查）
- 本地预览：`npm run preview`
- Android 同步：`npx cap sync android`
- 推送前校验：`node scripts/pre-push-check.mjs`（已接入 Git hook，见下）

## 目录

- `src/pages/` — 页面组件（Home、QuestionBank、PracticeSession、DailyGoal、Statistics、AiChat、PracticeSetup）
- `src/components/` — 通用组件（ExamUploader 是最大的组件，改动前先确认其上传/解析流程）
- `src/data/` — 数据层：`types.ts`（类型）、`persistence.ts`（localStorage）、`exam-parser.ts`（AI 解析/PDF）、`stats.ts`（统计）、`ai-config.ts`（AI 配置）
- `src/store/` — Zustand 全局状态（`useAppStore.ts`）
- `src/services/` — 原生能力封装（`camera.ts`）
- `android/` — Capacitor Android 工程，生成产物不要手改

## 设计契约

- `DESIGN.md` 是 UI 视觉的权威来源（设计 token、液态玻璃语言、组件类清单、暗色规则）。
  改 `src/index.css` 的 token/组件类后必须同步更新 `DESIGN.md` 对应条目。

## 规则

- 数据读写集中在 `src/data/persistence.ts`，页面不要直接操作 localStorage。
- 修改 `types.ts` 或持久化信封格式时，必须同步检查 `persistence.ts` 的迁移逻辑（`migrators`）。
- 新增解析/统计/持久化逻辑时，在 `src/data/` 下补充 Vitest 测试并运行 `npm test`。
- AI API Key 只保存在本机（Capacitor Preferences 优先，localStorage 兜底），禁止提交到仓库。
- 不要直接编辑 `android/` 下的生成文件，使用 `npx cap sync android` 同步。
- 修改 `src/data/` 下解析/统计/持久化代码后，运行 `npm test` 与 `npm run build`，确认测试与类型检查通过。
- 推送前会自动运行测试与构建（`git config core.hooksPath scripts/hooks` 已配置）；
  若换机器克隆后首次推送被拒，先执行 `git config core.hooksPath scripts/hooks`。
- 用户数据可导出/导入备份（统计页右上角按钮），存储损坏时会从 `.bak` 自动恢复。

## 诊断路线

- 页面异常：先看浏览器控制台；`[persistence]` 前缀日志表示本地存储读写/损坏问题，
  `[ErrorBoundary]` 前缀表示组件渲染异常（有兜底界面，不白屏）。
- 测试失败：`npm test` 定位文件，用 `npx vitest run <file>` 聚焦复现。
- 构建失败：`npm run build` 会先做类型检查，错误按 `tsc` 输出定位。
- Android 构建需要 JDK：本仓库提供 `scripts/download-jdk21.ps1` 下载脚本；
  APK 输出在 `android/app/build/outputs/apk/debug/`。
