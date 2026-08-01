# 智能题库

一款面向高中生的本地优先智能题库应用，支持题目管理、试卷拍照/PDF 上传、AI 解析、随机练习、每日目标和学习统计。

## 功能

- 题库管理：手动新增、编辑、删除、搜索、收藏
- 试卷导入：图片/PDF/文本上传，由 OpenAI 兼容 API 自动识别选择题
- 随机练习：按科目、难度、题数生成练习，支持计时与解析反馈
- 每日目标：自定义题目目标，练习完成后自动推进进度
- 学习统计：做题量、正确率、学习时长、连续打卡、趋势图
- AI 问答：配置 OpenAI/DeepSeek/Moonshot/自定义接口后直接对话

## 技术栈

- React 18 + TypeScript
- Vite 5 + Tailwind CSS 4
- Zustand
- Chart.js
- Capacitor 8（Android）

## 开发

```bash
npm install
npm run dev
```

## 测试与构建

```bash
npm test
npm run build
npx cap sync android
```

## 目录结构

```text
src/
  components/   通用组件
  data/         数据层、持久化、AI 解析
  pages/        页面
  services/     原生能力封装
  store/        Zustand 全局状态
android/        Capacitor Android 工程
```

> AI API Key 仅保存在本机，数据默认存储在 localStorage，适合个人使用。
