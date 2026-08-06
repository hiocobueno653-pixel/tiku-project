// 静态示例/展示数据 — 与设计稿一致的静态常量

import type { Difficulty, Question, Subject, SubjectId } from './types'

export const SUBJECTS: Subject[] = [
  { id: 'math', name: '高中数学', count: 0, icon: 'math' },
  { id: 'english', name: '英语语法', count: 0, icon: 'english' },
  { id: 'physics', name: '物理力学', count: 0, icon: 'physics' },
  { id: 'chemistry', name: '化学反应', count: 0, icon: 'chemistry' },
]

export const CATEGORIES = ['全部', '数学', '英语', '物理', '化学'] as const

/**
 * 内置题目库已清空 —— 所有题目均由用户自行添加（手动新增 / 上传试卷）。
 * 数据持久化在 localStorage（见 persistence.ts 的 loadUserQuestions / saveUserQuestions）。
 */
export const QUESTIONS: Question[] = []

export const SUBJECT_COLORS: Record<SubjectId, string> = {
  math: '#2F6BFF',
  english: '#00B578',
  physics: '#FF8F1F',
  chemistry: '#F54A45',
}

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

export function difficultyLabel(d: Difficulty): string {
  return d === 'simple' ? '简单' : d === 'medium' ? '中等' : '困难'
}
