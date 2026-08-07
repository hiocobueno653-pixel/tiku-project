import { useEffect, useRef, useState } from 'react'
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cpu,
  Type,
} from 'lucide-react'
import {
  parseExamImagesWithAi,
  parseExamTextWithAi,
  pdfToImages,
  fileToDataUrl,
  fileToText,
} from '../data/exam-parser'
import { AI_PROVIDER_PRESETS } from '../data/ai-config'
import type { AiApiConfig, ParsedQuestion, SubjectId, Difficulty } from '../data/types'
import BottomSheet from './BottomSheet'
import { compactInputStyle } from './ui-styles'
import { takePhoto, pickPhotos } from '../services/camera'

type Stage = 'input' | 'parsing' | 'review' | 'done'

interface PendingFile {
  id: string
  name: string
  type: 'image' | 'pdf' | 'text' | 'unknown'
  size: number
  file?: File // Web 端 file input 选中的文件；原生相机返回时为空
  previewUrl?: string
  // 原生相机/相册返回的 dataURL（Web file fallback 时为空，由 file 字段读取）
  dataUrl?: string
}

/** 审阅列表项：带稳定 key，避免删除中间项后展开态与卡片错位 */
interface ReviewItem extends ParsedQuestion {
  _key: string
}

const ACCEPTED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
const ACCEPTED_PDF = ['application/pdf']
const ACCEPTED_TEXT = ['text/plain', 'text/markdown']

const SUBJECT_LABELS: Record<SubjectId, string> = {
  math: '数学',
  english: '英语',
  physics: '物理',
  chemistry: '化学',
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  simple: '简单',
  medium: '中等',
  hard: '困难',
}

export default function ExamUploader({
  aiConfig,
  onClose,
  onImport,
  onOpenSettings,
}: {
  aiConfig: AiApiConfig | null
  onClose: () => void
  onImport: (questions: ParsedQuestion[]) => void
  onOpenSettings: () => void
}) {
  const [stage, setStage] = useState<Stage>('input')
  const [files, setFiles] = useState<PendingFile[]>([])
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ReviewItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number; label: string }>({
    current: 0,
    total: 0,
    label: '',
  })
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'camera' | 'file' | 'text'>('camera')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  // 追踪所有 blob URL，组件卸载时统一释放，防止内存泄漏
  const blobUrlsRef = useRef<Set<string>>(new Set())

  // 卸载时释放所有尚未 revoke 的 blob URL
  useEffect(() => {
    const blobUrls = blobUrlsRef.current
    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
      blobUrls.clear()
    }
  }, [])

  const isConfigured = !!(aiConfig && aiConfig.apiKey && aiConfig.model)

  const detectType = (file: File): PendingFile['type'] => {
    const t = file.type.toLowerCase()
    if (ACCEPTED_IMAGE.includes(t)) return 'image'
    if (ACCEPTED_PDF.includes(t)) return 'pdf'
    if (ACCEPTED_TEXT.includes(t)) return 'text'
    // 通过扩展名兜底
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (['txt', 'md', 'markdown'].includes(ext)) return 'text'
    return 'unknown'
  }

  const handleFileSelect = (selected: FileList | null) => {
    if (!selected) return
    const MAX_SIZE = 20 * 1024 * 1024 // 单文件最大 20MB
    const rejected: string[] = []
    const accepted: File[] = []
    Array.from(selected).forEach((f) => {
      if (f.size >= MAX_SIZE) rejected.push(f.name)
      else accepted.push(f)
    })
    if (rejected.length > 0) {
      setErrorMsg(`以下文件超过 20MB 限制，已忽略：${rejected.slice(0, 3).join('、')}${rejected.length > 3 ? ' 等' : ''}`)
    }
    const newFiles: PendingFile[] = accepted.map((f) => {
      const type = detectType(f)
      let previewUrl: string | undefined
      if (type === 'image') {
        previewUrl = URL.createObjectURL(f)
        blobUrlsRef.current.add(previewUrl)
      }
      return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        type,
        size: f.size,
        file: f,
        previewUrl,
      }
    })
    setFiles((prev) => [...prev, ...newFiles])
    setErrorMsg((prev) => prev ?? null)
  }

  // 原生相机拍照
  const handleTakePhoto = async () => {
    try {
      const dataUrl = await takePhoto()
      if (!dataUrl) return // 用户取消
      const newFile: PendingFile = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `拍照_${new Date().toLocaleTimeString('zh-CN', { hour12: false })}.jpg`,
        type: 'image',
        size: Math.ceil((dataUrl.length * 3) / 4), // base64 估算
        dataUrl,
        previewUrl: dataUrl,
      }
      setFiles((prev) => [...prev, newFile])
      setErrorMsg(null)
    } catch (err) {
      setErrorMsg(`拍照失败：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 从相册选择（原生多选 / Web 单选多选拖拽）
  const handlePickFromGallery = async () => {
    try {
      const dataUrls = await pickPhotos(9)
      if (dataUrls.length === 0) return
      const newFiles: PendingFile[] = dataUrls.map((dataUrl, i) => ({
        id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name: `相册图片_${i + 1}.jpg`,
        type: 'image' as const,
        size: Math.ceil((dataUrl.length * 3) / 4),
        dataUrl,
        previewUrl: dataUrl,
      }))
      setFiles((prev) => [...prev, ...newFiles])
      setErrorMsg(null)
    } catch (err) {
      setErrorMsg(`选择图片失败：${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id)
      // 仅 revoke 通过 URL.createObjectURL 创建的 blob URL；dataUrl 不需要 revoke
      if (target?.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
        blobUrlsRef.current.delete(target.previewUrl)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const canParse = files.length > 0 || text.trim().length > 0

  const startParse = async () => {
    if (!isConfigured) {
      onOpenSettings()
      return
    }
    setErrorMsg(null)
    setStage('parsing')

    try {
      const cfg = aiConfig!
      const allImages: string[] = []
      const allText: string[] = []

      // 处理文件
      for (let i = 0; i < files.length; i++) {
        const f = files[i]
        if (f.type === 'image') {
          setProgress({ current: i + 1, total: files.length, label: `读取图片 ${f.name}` })
          // 原生相机/相册返回的 dataUrl 直接用；否则从 File 读取
          const dataUrl = f.dataUrl ?? (f.file ? await fileToDataUrl(f.file) : '')
          if (dataUrl) allImages.push(dataUrl)
        } else if (f.type === 'pdf') {
          if (!f.file) continue
          setProgress({ current: i + 1, total: files.length, label: `解析 PDF ${f.name}（每页转图片）` })
          const imgs = await pdfToImages(f.file, (cur, total) => {
            setProgress({
              current: i + 1,
              total: files.length,
              label: `PDF ${f.name} 第 ${cur}/${total} 页`,
            })
          })
          allImages.push(...imgs)
        } else if (f.type === 'text') {
          if (!f.file) continue
          setProgress({ current: i + 1, total: files.length, label: `读取文本 ${f.name}` })
          const t = await fileToText(f.file)
          allText.push(t)
        } else {
          if (!f.file) continue
          // unknown 尝试当文本读取
          try {
            const t = await fileToText(f.file)
            allText.push(t)
          } catch {
            // ignore
          }
        }
      }

      // 处理粘贴的文本
      if (text.trim().length > 0) {
        allText.push(text.trim())
      }

      // 调用 AI 解析
      const result: { questions: ParsedQuestion[] } = { questions: [] }

      if (allImages.length > 0) {
        setProgress({
          current: 0,
          total: allImages.length,
          label: `AI 识别 ${allImages.length} 张图片中的题目...`,
        })
        const imgResult = await parseExamImagesWithAi(cfg, allImages, (cur, total) => {
          setProgress({
            current: cur,
            total,
            label: `AI 识别中 ${cur}/${total}`,
          })
        })
        result.questions.push(...imgResult.questions)
      }

      if (allText.length > 0) {
        for (let i = 0; i < allText.length; i++) {
          setProgress({
            current: i + 1,
            total: allText.length,
            label: `AI 解析文本 ${i + 1}/${allText.length}`,
          })
          const textResult = await parseExamTextWithAi(cfg, allText[i])
          result.questions.push(...textResult.questions)
        }
      }

      if (result.questions.length === 0) {
        setErrorMsg('未识别到任何选择题。请确认试卷包含 4 选项单选题，或换 clearer 的图片重试。')
        setStage('input')
        return
      }

      setParsed(
        result.questions.map((q) => ({
          ...q,
          _key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        })),
      )
      setStage('review')
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      setErrorMsg(`解析失败：${reason}`)
      setStage('input')
    }
  }

  const updateParsed = (key: string, patch: Partial<ParsedQuestion>) => {
    setParsed((prev) => prev.map((p) => (p._key === key ? { ...p, ...patch } : p)))
  }

  const removeParsed = (key: string) => {
    setParsed((prev) => prev.filter((p) => p._key !== key))
  }

  const handleConfirmImport = () => {
    if (parsed.length === 0) return
    onImport(parsed)
    setStage('done')
  }

  return (
    <BottomSheet
      title="上传试卷"
      icon={<Upload size={16} color="var(--brand)" strokeWidth={2.2} />}
      onClose={onClose}
    >
      {/* API 未配置提示 */}
        {!isConfigured && (
          <div
            onClick={onOpenSettings}
            style={{
              padding: '10px 12px',
              background: 'rgba(217, 119, 6, 0.08)',
              border: '1px dashed rgba(217, 119, 6, 0.4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={14} color="var(--state-warning)" strokeWidth={2} />
            <span style={{ fontSize: '12px', color: 'var(--ink-2)', flex: 1 }}>
              上传试卷需要 AI 视觉模型（如 gpt-4o）。点击前往配置 →
            </span>
          </div>
        )}

        {/* 模型提示 */}
        {isConfigured && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 10px',
              background: 'var(--brand-8)',
              color: 'var(--brand)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 500,
              marginBottom: '14px',
            }}
          >
            <Cpu size={11} strokeWidth={2} />
            {aiConfig?.model}
            <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '4px' }}>
              ({AI_PROVIDER_PRESETS[aiConfig!.provider].label})
            </span>
          </div>
        )}

        {/* 错误提示 */}
        {errorMsg && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(220, 38, 38, 0.08)',
              color: 'var(--state-error)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
            }}
          >
            <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span style={{ flex: 1, wordBreak: 'break-all' }}>{errorMsg}</span>
          </div>
        )}

        {/* === 阶段 1：输入 === */}
        {stage === 'input' && (
          <>
            {/* ── Tab 切换 ── 原生 app 风格的分段控制器 */}
            <div
              style={{
                display: 'flex',
                background: 'var(--surface-2)',
                borderRadius: '10px',
                padding: '3px',
                marginBottom: '14px',
              }}
            >
              <TabButton
                active={activeTab === 'camera'}
                onClick={() => setActiveTab('camera')}
                icon={<Camera size={14} strokeWidth={2} />}
                label="拍照/相册"
              />
              <TabButton
                active={activeTab === 'file'}
                onClick={() => setActiveTab('file')}
                icon={<FileText size={14} strokeWidth={2} />}
                label="文件"
              />
              <TabButton
                active={activeTab === 'text'}
                onClick={() => setActiveTab('text')}
                icon={<Type size={14} strokeWidth={2} />}
                label="粘贴文本"
              />
            </div>

            {/* ── Tab 内容：拍照/相册 ── */}
            {activeTab === 'camera' && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <SourceCard
                    icon={<Camera size={24} strokeWidth={1.8} />}
                    title="拍照"
                    desc="使用相机拍摄试卷"
                    accent="brand"
                    onClick={handleTakePhoto}
                  />
                  <SourceCard
                    icon={<ImageIcon size={24} strokeWidth={1.8} />}
                    title="从相册选择"
                    desc="选择已有的图片"
                    accent="soft"
                    onClick={handlePickFromGallery}
                  />
                </div>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-3)',
                    textAlign: 'center',
                    margin: '0 0 12px',
                  }}
                >
                  支持 JPG / PNG / WebP / HEIC，可多选
                </p>
              </>
            )}

            {/* ── Tab 内容：文件 ── */}
            {activeTab === 'file' && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--line)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--surface-2)',
                    marginBottom: '10px',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <Upload size={28} color="var(--ink-3)" strokeWidth={1.5} style={{ marginBottom: '6px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', margin: '0 0 4px' }}>
                    点击选择文件
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: 0 }}>
                    PDF / 图片 / TXT / Markdown
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '6px 0 0' }}>
                    单文件最大 20MB · 可多选
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf,text/plain,text/markdown,.jpg,.jpeg,.png,.webp,.heic,.pdf,.txt,.md"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* 仅图片选择快捷入口 */}
                <button
                  onClick={() => imageInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'var(--surface)',
                    color: 'var(--brand)',
                    border: '1px solid var(--brand-15)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '12px',
                  }}
                >
                  <ImageIcon size={14} strokeWidth={2} />
                  仅选择图片文件
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
              </>
            )}

            {/* ── Tab 内容：粘贴文本 ── */}
            {activeTab === 'text' && (
              <>
                <textarea
                  placeholder="粘贴试卷文本内容（每题以题号开头，包含 4 个选项 A/B/C/D）..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={6}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    color: 'var(--ink)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '160px',
                    lineHeight: 1.6,
                  }}
                />
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-3)',
                    margin: '8px 0 12px',
                  }}
                >
                  AI 将自动识别题目结构、选项和答案
                </p>
              </>
            )}

            {/* 文件列表（所有 Tab 共享） */}
            {files.length > 0 && (
              <div
                style={{
                  marginBottom: '12px',
                  background: 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-2)' }}>
                    已选 {files.length} 个文件
                  </span>
                  <button
                    onClick={() => {
                      files.forEach((f) => {
                        if (f.previewUrl?.startsWith('blob:')) {
                          URL.revokeObjectURL(f.previewUrl)
                          blobUrlsRef.current.delete(f.previewUrl)
                        }
                      })
                      setFiles([])
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--state-error)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    全部清除
                  </button>
                </div>
                {files.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 8px',
                      background: 'var(--surface)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '6px',
                    }}
                  >
                    {f.type === 'image' && f.previewUrl ? (
                      <img
                        src={f.previewUrl}
                        alt={f.name}
                        style={{
                          width: '36px',
                          height: '36px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          background: 'var(--surface-3)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {f.type === 'pdf' ? (
                          <FileText size={16} color="var(--state-error)" strokeWidth={2} />
                        ) : f.type === 'text' ? (
                          <Type size={16} color="var(--ink-2)" strokeWidth={2} />
                        ) : (
                          <ImageIcon size={16} color="var(--ink-2)" strokeWidth={2} />
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--ink)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        {f.name}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--ink-3)', margin: '2px 0 0' }}>
                        {f.type === 'pdf'
                          ? `PDF · ${(f.size / 1024).toFixed(0)}KB · 每页转图片`
                          : f.type === 'image'
                          ? `图片 · ${(f.size / 1024).toFixed(0)}KB`
                          : f.type === 'text'
                          ? `文本 · ${(f.size / 1024).toFixed(0)}KB`
                          : '未知类型'}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      aria-label="移除"
                      style={{
                        width: '26px',
                        height: '26px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-3)',
                      }}
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 底部固定按钮 */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '8px',
                paddingBottom: '4px',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  flex: '0 0 auto',
                  padding: '12px 20px',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={startParse}
                disabled={!canParse}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: canParse ? 'var(--brand)' : 'var(--surface-3)',
                  color: canParse ? '#fff' : 'var(--ink-3)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: canParse ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: canParse
                    ? '0 4px 14px -3px rgba(47, 107, 255, 0.4)'
                    : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <Sparkles size={16} strokeWidth={2} />
                {isConfigured ? 'AI 识别题目' : '需先配置 AI'}
              </button>
            </div>
          </>
        )}

        {/* === 阶段 2：解析中 === */}
        {stage === 'parsing' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Loader2
              size={48}
              color="var(--brand)"
              strokeWidth={2}
              className="animate-spin"
              style={{ marginBottom: '16px' }}
            />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
              {progress.label || '正在解析...'}
            </p>
            {progress.total > 0 && (
              <>
                <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: '0 0 12px' }}>
                  进度 {progress.current} / {progress.total}
                </p>
                <div
                  style={{
                    width: '100%',
                    height: '4px',
                    background: 'var(--surface-3)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(progress.current / Math.max(progress.total, 1)) * 100}%`,
                      height: '100%',
                      background: 'var(--brand)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </>
            )}
            <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '16px 0 0' }}>
              PDF 每页转图片后逐页识别，可能需要 30 秒～数分钟，请耐心等待
            </p>
          </div>
        )}

        {/* === 阶段 3：审阅 === */}
        {stage === 'review' && (
          <>
            <div
              style={{
                padding: '10px 12px',
                background: 'rgba(22, 163, 74, 0.08)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} color="var(--state-success)" strokeWidth={2} />
              <span style={{ fontSize: '13px', color: 'var(--ink)', flex: 1 }}>
                识别到 <strong>{parsed.length}</strong> 道选择题，请审阅后导入
              </span>
            </div>

            {/* 题目列表 */}
            <div style={{ marginBottom: '16px' }}>
              {parsed.map((q, idx) => (
                <ParsedQuestionCard
                  key={q._key}
                  idx={idx}
                  q={q}
                  expanded={expandedKey === q._key}
                  onToggle={() => setExpandedKey(expandedKey === q._key ? null : q._key)}
                  onUpdate={(patch) => updateParsed(q._key, patch)}
                  onRemove={() => removeParsed(q._key)}
                />
              ))}
            </div>

            {/* 操作按钮 */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginTop: '8px',
                paddingBottom: '4px',
              }}
            >
              <button
                onClick={() => {
                  setParsed([])
                  setStage('input')
                }}
                style={{
                  flex: '0 0 auto',
                  padding: '12px 20px',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                重新识别
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={parsed.length === 0}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: parsed.length > 0 ? 'var(--brand)' : 'var(--surface-3)',
                  color: parsed.length > 0 ? '#fff' : 'var(--ink-3)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: parsed.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow:
                    parsed.length > 0 ? '0 4px 14px -3px rgba(47, 107, 255, 0.4)' : 'none',
                }}
              >
                导入 {parsed.length} 道题
              </button>
            </div>
          </>
        )}

        {/* === 阶段 4：完成 === */}
        {stage === 'done' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle2
              size={48}
              color="var(--state-success)"
              strokeWidth={2}
              style={{ marginBottom: '16px' }}
            />
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 8px' }}>
              导入成功
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ink-3)', margin: '0 0 20px' }}>
              题目已加入题库，可在列表中查看
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 32px',
                background: 'var(--brand)',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px -3px rgba(47, 107, 255, 0.4)',
              }}
            >
              完成
            </button>
          </div>
        )}
    </BottomSheet>
  )
}

/* ── Tab 切换按钮 ── */
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '8px 4px',
        background: active ? 'var(--surface)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--ink-3)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.08)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

/* ── 拍照/相册 选择卡片 ── */
function SourceCard({
  icon,
  title,
  desc,
  accent,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  accent: 'brand' | 'soft'
  onClick: () => void
}) {
  const isBrand = accent === 'brand'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '18px 12px',
        background: isBrand
          ? 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)'
          : 'var(--surface)',
        color: isBrand ? '#fff' : 'var(--brand)',
        border: isBrand ? 'none' : '1px solid var(--brand-15)',
        borderRadius: 'var(--radius-lg)',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '110px',
        boxShadow: isBrand ? '0 6px 18px -4px rgba(47, 107, 255, 0.45)' : 'none',
        transition: 'transform 0.15s ease',
      }}
    >
      <span style={{ display: 'flex' }}>{icon}</span>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{title}</div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 400,
            opacity: 0.85,
            marginTop: '2px',
          }}
        >
          {desc}
        </div>
      </div>
    </button>
  )
}

/* ── 解析后的题目卡片（可编辑、可删除、可展开/收起） ── */
function ParsedQuestionCard({
  idx,
  q,
  expanded,
  onToggle,
  onUpdate,
  onRemove,
}: {
  idx: number
  q: ParsedQuestion
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<ParsedQuestion>) => void
  onRemove: () => void
}) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '8px',
        background: 'var(--surface)',
        overflow: 'hidden',
      }}
    >
      {/* 折叠态 header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'var(--brand-8)',
            color: 'var(--brand)',
            fontSize: '11px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {idx + 1}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--brand-8)',
            color: 'var(--brand)',
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {SUBJECT_LABELS[q.subject]}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--surface-2)',
            color: 'var(--ink-2)',
            flexShrink: 0,
          }}
        >
          {DIFFICULTY_LABELS[q.difficulty]}
        </span>
        <p
          style={{
            flex: 1,
            fontSize: '12px',
            color: 'var(--ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {q.content}
        </p>
        {expanded ? (
          <ChevronUp size={14} color="var(--ink-3)" strokeWidth={2} />
        ) : (
          <ChevronDown size={14} color="var(--ink-3)" strokeWidth={2} />
        )}
      </div>

      {/* 展开态编辑区 */}
      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--line)' }}>
          {/* 题干 */}
          <div style={{ marginTop: '10px' }}>
            <label style={labelStyle}>题干</label>
            <textarea
              value={q.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={3}
              style={{ ...compactInputStyle, resize: 'vertical', minHeight: '70px' }}
            />
          </div>

          {/* 科目 + 难度 */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label style={labelStyle}>科目</label>
              <select
                value={q.subject}
                onChange={(e) => onUpdate({ subject: e.target.value as SubjectId })}
                style={compactInputStyle}
              >
                {Object.entries(SUBJECT_LABELS).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>难度</label>
              <select
                value={q.difficulty}
                onChange={(e) => onUpdate({ difficulty: e.target.value as Difficulty })}
                style={compactInputStyle}
              >
                {Object.entries(DIFFICULTY_LABELS).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 知识点 */}
          <div className="mt-2">
            <label style={labelStyle}>知识点分类</label>
            <input
              type="text"
              value={q.category}
              onChange={(e) => onUpdate({ category: e.target.value })}
              style={compactInputStyle}
            />
          </div>

          {/* 选项 + 正确答案 */}
          <div className="mt-2">
            <label style={labelStyle}>选项（点击圆圈设为正确答案）</label>
            <div className="flex flex-col gap-2 mt-1">
              {q.options.map((opt, i) => {
                const isAnswer = q.answer === opt.key
                return (
                  <div key={opt.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ answer: opt.key })}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: isAnswer ? 'var(--state-success)' : 'var(--surface-2)',
                        color: isAnswer ? '#fff' : 'var(--ink-2)',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {opt.key}
                    </button>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const next = [...q.options]
                        next[i] = { ...opt, text: e.target.value }
                        onUpdate({ options: next })
                      }}
                      style={{ ...compactInputStyle, flex: 1, padding: '6px 10px', fontSize: '13px' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 解析 */}
          <div className="mt-2">
            <label style={labelStyle}>解析</label>
            <textarea
              value={q.explanation}
              onChange={(e) => onUpdate({ explanation: e.target.value })}
              rows={2}
              style={{ ...compactInputStyle, resize: 'vertical', minHeight: '50px' }}
            />
          </div>

          {/* 删除按钮 */}
          <button
            onClick={onRemove}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              background: 'rgba(220, 38, 38, 0.08)',
              color: 'var(--state-error)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={12} strokeWidth={2} />
            移除该题
          </button>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  color: 'var(--ink-2)',
  marginBottom: '4px',
}
