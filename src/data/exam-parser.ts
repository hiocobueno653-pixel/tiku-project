// 试卷解析模块：AI 识别（图片/文本）、JSON 提取与 PDF 渲染
import type {
  AiApiConfig,
  Difficulty,
  ExamParseResult,
  ParsedQuestion,
  SubjectId,
} from './types'

/** 文本解析结果缓存：相同输入避免重复调用 AI */
const examParseCache = new Map<string, ExamParseResult>()

/** PDF 渲染缓存：基于文件元信息哈希，避免重复处理相同文件 */
const pdfCache = new Map<string, string[]>()

const EXAM_PARSE_PROMPT = `你是一位试卷题目识别助手。请分析用户提供的试卷内容（图片或文本），识别出所有"选择题"（每题 4 个选项 A/B/C/D 的单选题），并以 JSON 数组格式返回。

输出格式要求：
- 仅返回 JSON 数组，不要任何 Markdown 代码块标记、不要任何说明文字
- 数组每项包含字段：
  - "subject": "math" | "english" | "physics" | "chemistry" 之一（按题目内容判断）
  - "category": 字符串，简短的知识点分类，如"函数与导数"
  - "difficulty": "simple" | "medium" | "hard" 之一
  - "content": 字符串，题目题干
  - "options": 数组，4 项，每项 { "key": "A"|"B"|"C"|"D", "text": "选项内容" }
  - "answer": "A"|"B"|"C"|"D"，正确答案。若试卷未给出答案，给出最可能的选择
  - "explanation": 字符串，解析说明；若试卷未给出，写""

规则：
1. 只识别选择题，跳过填空题/解答题/作文题
2. 选项内容保留原始文本，不要省略
3. 题干要完整，包含所有题号、材料背景
4. 如果识别不到任何选择题，返回空数组 []`

/**
 * 解析试卷图片为题目数组（调用 OpenAI 兼容的 vision API）
 * @param images base64 dataURL 数组，例如 ["data:image/jpeg;base64,..."]
 * @param onProgress 进度回调（当前批次数，总批次数）
 */
export async function parseExamImagesWithAi(
  cfg: AiApiConfig,
  images: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<ExamParseResult> {
  if (images.length === 0) {
    return { questions: [] }
  }

  // 多图分批发送（每批最多 3 张，避免 token 超限）
  const BATCH_SIZE = 3
  const allQuestions: ParsedQuestion[] = []

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE)
    onProgress?.(i, images.length)

    const userContent: Array<
      { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
    > = [
      {
        type: 'text',
        text: `${EXAM_PARSE_PROMPT}\n\n本次共 ${batch.length} 张图片，请合并识别为单个 JSON 数组。`,
      },
      ...batch.map((dataUrl) => ({
        type: 'image_url' as const,
        image_url: { url: dataUrl },
      })),
    ]

    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: userContent }],
        temperature: 0.1,
        stream: false,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.slice(0, 200) : ''}`)
    }

    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? ''
    allQuestions.push(...extractJsonArray(reply))
  }
  onProgress?.(images.length, images.length)

  return { questions: allQuestions, raw: '' }
}

/**
 * 解析试卷文本为题目数组（调用 OpenAI 兼容的 chat API）。
 * 相同文本命中缓存时不会重复请求。
 */
export async function parseExamTextWithAi(
  cfg: AiApiConfig,
  text: string,
): Promise<ExamParseResult> {
  const cacheKey = `text_${await calculateTextHash(text)}`
  const cached = examParseCache.get(cacheKey)
  if (cached) return cached

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: EXAM_PARSE_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      stream: false,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.slice(0, 200) : ''}`)
  }

  const data = await res.json()
  const reply: string = data?.choices?.[0]?.message?.content ?? ''
  const result: ExamParseResult = { questions: extractJsonArray(reply), raw: reply }
  examParseCache.set(cacheKey, result)
  return result
}

/**
 * 从 AI 返回的文本中提取 JSON 数组（兼容带 ```json 代码块、纯 JSON、首尾多余字符等情况）
 */
export function extractJsonArray(text: string): ParsedQuestion[] {
  if (!text) return []
  // 1. 优先尝试 ```json ... ``` 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    const parsed = tryParse(codeBlockMatch[1])
    if (parsed) return normalizeQuestions(parsed)
  }
  // 2. 尝试找到第一个 [ 到最后一个 ]
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    const parsed = tryParse(text.slice(start, end + 1))
    if (parsed) return normalizeQuestions(parsed)
  }
  // 3. 直接尝试整段
  const parsed = tryParse(text)
  if (parsed) return normalizeQuestions(parsed)
  return []
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s.trim())
  } catch {
    return null
  }
}

/** 规范化 AI 返回的题目：修正非法字段并丢弃不完整选项 */
export function normalizeQuestions(raw: unknown): ParsedQuestion[] {
  if (!Array.isArray(raw)) return []
  const validSubjects: SubjectId[] = ['math', 'english', 'physics', 'chemistry']
  const validDifficulties: Difficulty[] = ['simple', 'medium', 'hard']
  return raw
    .filter((q): q is Record<string, unknown> => !!q && typeof q === 'object')
    .map((q) => {
      const subject = validSubjects.includes(q.subject as SubjectId)
        ? (q.subject as SubjectId)
        : 'math'
      const difficulty = validDifficulties.includes(q.difficulty as Difficulty)
        ? (q.difficulty as Difficulty)
        : 'medium'
      const options = Array.isArray(q.options)
        ? (q.options as unknown[])
            .filter((o): o is Record<string, unknown> => !!o && typeof o === 'object')
            .map((o) => ({
              key: String(o.key ?? '').toUpperCase().slice(0, 1),
              text: String(o.text ?? ''),
            }))
            .filter((o) => /^[A-D]$/.test(o.key) && o.text.length > 0)
        : []
      const answer = String(q.answer ?? '').toUpperCase().slice(0, 1)
      return {
        subject,
        category: String(q.category ?? '').trim() || '未分类',
        difficulty,
        content: String(q.content ?? '').trim(),
        options,
        answer: /^[A-D]$/.test(answer) ? answer : 'A',
        explanation: String(q.explanation ?? '').trim(),
      }
    })
    .filter((q) => q.content.length > 0 && q.options.length === 4)
}

/** 简单的文本哈希（仅用于缓存键，非加密用途） */
async function calculateTextHash(text: string): Promise<string> {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为 32 位整数
  }
  return Math.abs(hash).toString(16)
}

/**
 * 将 PDF 文件的每一页渲染为图片 dataURL（动态加载 pdfjs-dist，避免首屏体积）。
 * 渲染比例 1.5、JPEG 质量 0.75；相同文件（名称/大小/修改时间）命中缓存。
 */
export async function pdfToImages(
  file: File,
  onProgress?: (current: number, total: number) => void,
  useWorker = false, // 可选：启用 Worker 路径（当前实现回退主线程，仅保留接口）
): Promise<string[]> {
  const fileHash = await calculateFileHash(file)
  const cached = pdfCache.get(fileHash)
  if (cached) {
    onProgress?.(0, 0) // 缓存命中：跳过进度指示
    return cached
  }

  // 动态导入 pdfjs-dist，仅在用户上传 PDF 时加载
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const total = pdf.numPages
  const images = useWorker && typeof window !== 'undefined' && window.Worker
    ? await renderPdfPagesWithWorker(pdf, total, onProgress)
    : await renderPdfPagesOnMainThread(pdf, total, onProgress)

  onProgress?.(total, total)
  pdfCache.set(fileHash, images)
  return images
}

/** 渲染单页 PDF 为 JPEG dataURL（白色背景，避免透明） */
async function renderPageToDataUrl(
  pdf: any,
  pageNumber: number,
  scale: number,
): Promise<string | null> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/jpeg', 0.75)
}

/** 主线程逐页渲染 */
async function renderPdfPagesOnMainThread(
  pdf: any,
  total: number,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  const images: string[] = []
  for (let i = 1; i <= total; i++) {
    onProgress?.(i, total)
    const dataUrl = await renderPageToDataUrl(pdf, i, 1.5)
    if (dataUrl) images.push(dataUrl)
  }
  return images
}

/**
 * Worker 版本 PDF 渲染。
 * 注意：Worker 中不能直接操作 DOM；当前实现回退到主线程逻辑，
 * 保留接口以避免破坏调用方，真正的 Worker 管道留待后续实现。
 */
async function renderPdfPagesWithWorker(
  pdf: any,
  total: number,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  return renderPdfPagesOnMainThread(pdf, total, onProgress)
}

/** 简单文件哈希（名称/大小/修改时间，仅用于缓存键，非加密用途） */
async function calculateFileHash(file: File): Promise<string> {
  const source = [file.name, file.size, file.lastModified].join('|')
  let hash = 0
  for (let i = 0; i < source.length; i++) {
    const char = source.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

/** 将 File（图片）转为 dataURL */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 读取文本文件内容 */
export async function fileToText(file: File): Promise<string> {
  return await file.text()
}