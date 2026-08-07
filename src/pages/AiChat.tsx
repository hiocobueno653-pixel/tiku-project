import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, ReactElement } from 'react'
import {
  Settings,
  Cpu,
  ArrowUp,
  Bot,
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Sparkles,
} from 'lucide-react'
import AppShell from '../components/AppShell'
import BottomSheet from '../components/BottomSheet'
import { FormRow, FieldError } from '../components/ui'
import { inputStyle } from '../components/ui-styles'
import { generateAiReply } from '../data/ai-chat'
import { loadAiConfig, saveAiConfig, clearAiConfig, AI_PROVIDER_PRESETS } from '../data/ai-config'
import { loadChatHistory, saveChatHistory, clearChatHistory } from '../data/persistence'
import type { AiApiConfig, AiProvider, ChatMessageRecord } from '../data/types'

const SYSTEM_PROMPT =
  '你是一位耐心的学习辅导老师，专注于中学数学、英语、物理、化学等学科的答疑。回答请：1) 先简明扼要地给出结论；2) 然后逐步讲解思路与原理；3) 必要时举一个贴近生活的例子；4) 最后用一句话总结。语言简洁、准确，避免冗长。'

export default function AiChat() {
  // 历史聊天记录 — 从 localStorage 加载，初始为空数组（无默认数据）
  const [records, setRecords] = useState<ChatMessageRecord[]>(() => loadChatHistory())
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [aiConfig, setAiConfig] = useState<AiApiConfig | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const isConfigured = !!(aiConfig && aiConfig.apiKey && aiConfig.model)

  // 异步加载 AI 配置（Capacitor Preferences）
  useEffect(() => {
    loadAiConfig().then(setAiConfig)
  }, [])

  // 消息变化时自动保存到 localStorage
  useEffect(() => {
    saveChatHistory(records)
  }, [records])

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [records, isThinking])

  const send = async () => {
    const text = input.trim()
    if (!text || isThinking) return
    setErrorMsg(null)

    // 1. 立即追加用户消息
    const userRecord: ChatMessageRecord = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      ts: Date.now(),
    }
    setRecords((prev) => [...prev, userRecord])
    setInput('')
    setIsThinking(true)

    // 2. 未配置 API：回退到本地 mock 回复
    if (!isConfigured) {
      setTimeout(() => {
        const reply = generateAiReply(text)
        const replyText = reactNodeToString(reply.content)
        const aiRecord: ChatMessageRecord = {
          id: `a-${Date.now()}`,
          role: 'ai',
          content: replyText,
          isLocalMock: true,
          ts: Date.now(),
        }
        setRecords((prev) => [...prev, aiRecord])
        setIsThinking(false)
      }, 600)
      return
    }

    // 3. 已配置 API：调用 OpenAI 兼容接口
    try {
      const history = records.map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }))

      const res = await fetch(`${aiConfig!.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig!.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig!.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: text },
          ],
          temperature: 0.7,
          stream: false,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status} ${errText.slice(0, 200)}`)
      }

      const data = await res.json()
      const replyText: string = data?.choices?.[0]?.message?.content ?? '(模型未返回内容)'

      const aiRecord: ChatMessageRecord = {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: replyText,
        ts: Date.now(),
      }
      setRecords((prev) => [...prev, aiRecord])
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      const reply = generateAiReply(text)
      const replyText = reactNodeToString(reply.content)
      const aiRecord: ChatMessageRecord = {
        id: `a-${Date.now()}`,
        role: 'ai',
        content: replyText,
        isError: true,
        errorDetail: reason,
        ts: Date.now(),
      }
      setRecords((prev) => [...prev, aiRecord])
      setErrorMsg(reason)
    } finally {
      setIsThinking(false)
    }
  }

  const handleClearHistory = () => {
    clearChatHistory()
    setRecords([])
    setShowClearConfirm(false)
  }

  const handleSaveConfig = async (cfg: AiApiConfig) => {
    await saveAiConfig(cfg)
    setAiConfig(cfg)
    setShowSettings(false)
    setErrorMsg(null)
  }

  const handleClearConfig = async () => {
    await clearAiConfig()
    setAiConfig(null)
    setShowSettings(false)
  }

  const statusLabel = useMemo(() => {
    if (!isConfigured) return { text: '未配置', color: 'var(--state-warning)', dotColor: 'var(--state-warning)' }
    return {
      text: aiConfig?.provider === 'custom' ? '自定义' : '已连接',
      color: 'var(--state-success)',
      dotColor: 'var(--state-success)',
    }
  }, [isConfigured, aiConfig])

  const isEmpty = records.length === 0

  return (
    <AppShell>
      {/* ── 顶部统一 Header（与 AppShell 一体，不割裂） ── */}
      <div
        className="ai-chat-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          background: 'linear-gradient(180deg, var(--bg) 0%, rgba(241, 242, 247, 0.85) 100%)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
        }}
      >
        <div className="screen-header" style={{ paddingBottom: 8 }}>
          <div className="flex items-center gap-2">
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 16px -4px rgba(47, 107, 255, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
              }}
            >
              <Sparkles size={18} color="#fff" strokeWidth={2.2} />
            </div>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: 0 }}>
                AI 问答
              </h1>
              <div className="flex items-center gap-1.5" style={{ marginTop: '2px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    display: 'inline-block',
                    background: statusLabel.dotColor,
                    boxShadow: `0 0 6px ${statusLabel.dotColor}`,
                  }}
                />
                <span style={{ fontSize: '11px', color: statusLabel.color, fontWeight: 500 }}>
                  {statusLabel.text}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {records.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                aria-label="清空对话"
                className="icon-btn"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              aria-label="API 设置"
              className="icon-btn"
              style={{
                color: 'var(--ink-2)',
                background: showSettings ? 'var(--surface-2)' : 'var(--surface)',
                borderColor: showSettings ? 'var(--line)' : 'var(--line)',
              }}
            >
              <Settings size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* API 状态条 */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSettings(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              background: isConfigured ? 'var(--brand-8)' : 'rgba(217, 119, 6, 0.10)',
              color: isConfigured ? 'var(--brand)' : 'var(--state-warning)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Cpu size={11} strokeWidth={2.2} />
            {isConfigured ? aiConfig?.model : '未配置 · 点击设置'}
          </button>
        </div>
      </div>

      {/* ── 聊天区域 ── */}
      <div
        ref={scrollRef}
        className="ai-chat-body"
        style={{
          padding: '16px 16px 140px',
          overflowY: 'auto',
          minHeight: 'calc(100vh - 180px)',
        }}
      >
        {isEmpty ? (
          <EmptyState
            isConfigured={isConfigured}
            onSuggest={(q) => {
              setInput(q)
            }}
            onOpenSettings={() => setShowSettings(true)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {records.map((m) => (
              <ChatBubble key={m.id} record={m} />
            ))}

            {isThinking && (
              <div className="chat-message">
                <div className="ai-avatar">
                  {isConfigured ? (
                    <Bot size={14} color="#fff" strokeWidth={2} />
                  ) : (
                    <Loader2 size={14} color="#fff" strokeWidth={2} className="animate-spin" />
                  )}
                </div>
                <div className="chat-bubble ai-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 错误提示条（紧贴输入框上方，不割裂） ── */}
      {errorMsg && (
        <div
          style={{
            margin: '0 16px 8px',
            padding: '8px 12px',
            background: 'rgba(220, 38, 38, 0.10)',
            color: 'var(--state-error)',
            borderRadius: '12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertTriangle size={12} strokeWidth={2} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {errorMsg}
          </span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--state-error)',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
            aria-label="关闭"
          >
            <X size={12} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* ── 输入区（与聊天区融为一体，不浮空） ── */}
      <div
        className="ai-chat-input-wrap"
        style={{
          padding: '10px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(180deg, rgba(241, 242, 247, 0.4) 0%, var(--bg) 60%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div
          className="ai-chat-input-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 4px 4px 14px',
            boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.8)',
          }}
        >
          <input
            type="text"
            placeholder={isConfigured ? '问 AI 任何学习问题...' : '未配置 API · 当前为本地示例回复'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
            style={{
              flex: 1,
              height: '40px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              color: 'var(--ink)',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || isThinking}
            aria-label="发送"
            style={{
              width: '40px',
              height: '40px',
              background:
                !input.trim() || isThinking
                  ? 'var(--surface-3)'
                  : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
              opacity: !input.trim() || isThinking ? 0.6 : 1,
              cursor: !input.trim() || isThinking ? 'not-allowed' : 'pointer',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow:
                !input.trim() || isThinking
                  ? 'none'
                  : '0 4px 12px -2px rgba(47, 107, 255, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowUp size={18} color="#fff" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── 清空对话确认弹窗 ── */}
      {showClearConfirm && (
        <div
          onClick={() => setShowClearConfirm(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '320px',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px 20px',
              textAlign: 'center',
              boxShadow: '0 24px 60px -16px rgba(15, 23, 42, 0.4)',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 14px',
                borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={22} color="var(--state-error)" strokeWidth={2} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px' }}>
              清空所有对话？
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
              将删除全部 {records.length} 条历史记录，此操作不可撤销
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'var(--surface-2)',
                  color: 'var(--ink)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  background: 'var(--state-error)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.4)',
                }}
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <ApiSettingsDrawer
          current={aiConfig}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveConfig}
          onClear={handleClearConfig}
        />
      )}

      <style>{`
        .chat-message { display: flex; gap: 8px; }
        .chat-message.user { justify-content: flex-end; }
        .chat-bubble {
          max-width: 85%;
          padding: 12px 16px;
          line-height: 1.6;
          font-size: 14px;
          word-break: break-word;
        }
        .chat-bubble.user-bubble {
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
          color: #FFFFFF;
          border-radius: 18px 18px 4px 18px;
          max-width: 80%;
          box-shadow: 0 4px 12px -3px rgba(47, 107, 255, 0.4);
        }
        .chat-bubble.ai-bubble {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 18px 18px 18px 4px;
          color: var(--ink);
          box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
        }
        .ai-avatar {
          width: 28px;
          height: 28px;
          min-width: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
          box-shadow: 0 3px 8px -2px rgba(47, 107, 255, 0.4);
        }
        .ai-meta-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 6px;
        }
      `}</style>
    </AppShell>
  )
}

/* ── 空状态引导 ── */
function EmptyState({
  isConfigured,
  onSuggest,
  onOpenSettings,
}: {
  isConfigured: boolean
  onSuggest: (q: string) => void
  onOpenSettings: () => void
}) {
  const suggestions = [
    { icon: '📐', title: '解释牛顿第二定律', q: '请帮我解释一下牛顿第二定律' },
    { icon: '📝', title: '定语从句的用法', q: '定语从句中 that 和 which 怎么选？' },
    { icon: '⚡', title: '函数求极值步骤', q: '如何求函数的极值？' },
    { icon: '🧪', title: '化学键的类型', q: '离子键和共价键有什么区别？' },
  ]
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '32px 16px 24px',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          margin: '0 auto 16px',
          borderRadius: '20px',
          background:
            'linear-gradient(135deg, rgba(47, 107, 255, 0.10) 0%, rgba(91, 140, 255, 0.14) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.6)',
        }}
      >
        <Sparkles size={28} color="var(--brand)" strokeWidth={2} />
      </div>
      <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px', letterSpacing: 0 }}>
        {isConfigured ? '开始和 AI 对话吧' : '配置 AI 后开始对话'}
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--ink-2)', margin: '0 0 20px', lineHeight: 1.5 }}>
        {isConfigured
          ? '我可以帮你解答学科问题、讲解知识点、举生活例子'
          : '尚无历史对话，配置 API 后即可开始你的第一次提问'}
      </p>

      {!isConfigured && (
        <button
          onClick={onOpenSettings}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 6px 16px -4px rgba(47, 107, 255, 0.4)',
            marginBottom: '20px',
          }}
        >
          前往配置 AI API
        </button>
      )}

      {isConfigured && (
        <div className="grid grid-cols-2 gap-2" style={{ textAlign: 'left' }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggest(s.q)}
              style={{
                padding: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'inherit',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <span style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 500, lineHeight: 1.4 }}>
                {s.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 单条消息气泡 ── */
function ChatBubble({ record }: { record: ChatMessageRecord }) {
  const time = new Date(record.ts).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  if (record.role === 'user') {
    return (
      <div className="chat-message user">
        <div className="chat-bubble user-bubble">
          <div style={{ whiteSpace: 'pre-wrap' }}>{record.content}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '4px', textAlign: 'right' }}>
            {time}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-message">
      <div className="ai-avatar">
        <Bot size={15} color="#fff" strokeWidth={2.2} />
      </div>
      <div className="chat-bubble ai-bubble">
        {record.isLocalMock && (
          <div
            className="ai-meta-tag"
            style={{
              background: 'rgba(217, 119, 6, 0.10)',
              color: 'var(--state-warning)',
            }}
          >
            <AlertTriangle size={10} strokeWidth={2.2} />
            本地示例（未配置 API）
          </div>
        )}
        {record.isError && (
          <div
            className="ai-meta-tag"
            style={{
              background: 'rgba(220, 38, 38, 0.10)',
              color: 'var(--state-error)',
            }}
          >
            <AlertTriangle size={10} strokeWidth={2.2} />
            调用失败，已回退本地示例
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap' }}>{record.content}</div>
        {record.isError && record.errorDetail && (
          <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '8px 0 0', wordBreak: 'break-all' }}>
            错误：{record.errorDetail}
          </p>
        )}
        <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginTop: '6px' }}>{time}</div>
      </div>
    </div>
  )
}

/* ── 工具：ReactNode → 字符串（用于本地 mock 序列化） ── */
function reactNodeToString(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (node == null || node === false) return ''
  if (Array.isArray(node)) return node.map(reactNodeToString).join('')
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as ReactElement).props as { children?: ReactNode }
    return reactNodeToString(props.children)
  }
  return ''
}

/* ── API 设置抽屉 ── */
function ApiSettingsDrawer({
  current,
  onClose,
  onSave,
  onClear,
}: {
  current: AiApiConfig | null
  onClose: () => void
  onSave: (cfg: AiApiConfig) => void
  onClear: () => void
}) {
  const [provider, setProvider] = useState<AiProvider>(current?.provider ?? 'openai')
  const [model, setModel] = useState(current?.model ?? AI_PROVIDER_PRESETS.openai.defaultModel)
  const [apiKey, setApiKey] = useState(current?.apiKey ?? '')
  const [baseUrl, setBaseUrl] = useState(current?.baseUrl ?? AI_PROVIDER_PRESETS.openai.defaultBaseUrl)
  const [showKey, setShowKey] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testMsg, setTestMsg] = useState<string>('')
  const [touched, setTouched] = useState(false)

  const valid = apiKey.trim().length > 0 && model.trim().length > 0 && baseUrl.trim().length > 0

  const switchProvider = (p: AiProvider) => {
    setProvider(p)
    const preset = AI_PROVIDER_PRESETS[p]
    if (p !== 'custom') {
      const oldPreset = AI_PROVIDER_PRESETS[provider]
      if (model === '' || model === oldPreset.defaultModel) {
        setModel(preset.defaultModel)
      }
      if (baseUrl === '' || baseUrl === oldPreset.defaultBaseUrl) {
        setBaseUrl(preset.defaultBaseUrl)
      }
    } else {
      setModel('')
      setBaseUrl('')
    }
  }

  const handleSave = () => {
    setTouched(true)
    if (!valid) return
    onSave({
      provider,
      model: model.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
    })
  }

  const handleTest = async () => {
    setTouched(true)
    if (!valid) return
    setTestStatus('testing')
    setTestMsg('')
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '你好，请回复"OK"' }],
          max_tokens: 10,
          stream: false,
        }),
      })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}${errText ? ': ' + errText.slice(0, 120) : ''}`)
      }
      const data = await res.json()
      const reply = data?.choices?.[0]?.message?.content ?? ''
      setTestStatus('ok')
      setTestMsg(`连接成功 · 模型回复：${String(reply).slice(0, 30)}`)
    } catch (err) {
      setTestStatus('fail')
      setTestMsg(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <BottomSheet
      title="AI 模型配置"
      icon={<Settings size={16} color="var(--brand)" strokeWidth={2.2} />}
      onClose={onClose}
    >
      {/* 隐私提示 */}
      <div
        style={{
          padding: '10px 12px',
          background: 'var(--surface-2)',
          borderRadius: '12px',
          fontSize: '12px',
          color: 'var(--ink-2)',
          lineHeight: 1.5,
          marginBottom: '16px',
          display: 'flex',
          gap: '8px',
        }}
      >
        <AlertTriangle size={14} color="var(--state-warning)" strokeWidth={2} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          API Key 仅保存在浏览器 <code style={{ fontSize: '11px', background: 'var(--surface-3)', padding: '0 4px', borderRadius: '2px' }}>localStorage</code> 中，请求从你的浏览器直接发往服务商。请勿在公共电脑上保存。
        </span>
      </div>

        <FormRow label="服务商">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(AI_PROVIDER_PRESETS) as AiProvider[]).map((p) => {
              const active = p === provider
              const label = AI_PROVIDER_PRESETS[p].label
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => switchProvider(p)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    background: active ? 'var(--brand)' : 'var(--surface-2)',
                    color: active ? '#fff' : 'var(--ink-2)',
                    border: active ? 'none' : '1px solid var(--line)',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </FormRow>

        <FormRow label="模型名称">
          <input
            type="text"
            placeholder="如 gpt-4o-mini / deepseek-chat"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={inputStyle}
          />
          {touched && !model.trim() && <FieldError>请填写模型名称</FieldError>}
        </FormRow>

        <FormRow label="API Key">
          <div style={{ position: 'relative' }}>
            <input
              type={showKey ? 'text' : 'password'}
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{ ...inputStyle, paddingRight: '40px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? '隐藏' : '显示'}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-3)',
              }}
            >
              {showKey ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
            </button>
          </div>
          {touched && !apiKey.trim() && <FieldError>请填写 API Key</FieldError>}
        </FormRow>

        <FormRow label="Base URL">
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            spellCheck={false}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
          />
          {touched && !baseUrl.trim() && <FieldError>请填写 Base URL</FieldError>}
          <p style={{ fontSize: '11px', color: 'var(--ink-3)', margin: '6px 0 0' }}>
            支持 OpenAI 兼容协议（路径末尾会自动拼接 <code style={{ fontSize: '11px' }}>/chat/completions</code>）
          </p>
        </FormRow>

        {testStatus !== 'idle' && (
          <div
            style={{
              marginTop: '8px',
              marginBottom: '12px',
              padding: '10px 12px',
              borderRadius: '12px',
              background:
                testStatus === 'ok'
                  ? 'rgba(22, 163, 74, 0.08)'
                  : testStatus === 'fail'
                  ? 'rgba(220, 38, 38, 0.08)'
                  : 'var(--surface-2)',
              color:
                testStatus === 'ok'
                  ? 'var(--state-success)'
                  : testStatus === 'fail'
                  ? 'var(--state-error)'
                  : 'var(--ink-2)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
            }}
          >
            {testStatus === 'testing' && <Loader2 size={14} strokeWidth={2} className="animate-spin" style={{ flexShrink: 0, marginTop: '1px' }} />}
            {testStatus === 'ok' && <CheckCircle2 size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />}
            {testStatus === 'fail' && <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: '1px' }} />}
            <span style={{ flex: 1, wordBreak: 'break-all' }}>
              {testStatus === 'testing' ? '正在测试连接...' : testMsg}
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-5">
          {current && (
            <button
              onClick={onClear}
              style={{
                padding: '12px 14px',
                background: 'rgba(220, 38, 38, 0.08)',
                color: 'var(--state-error)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              清除
            </button>
          )}
          <button
            onClick={handleTest}
            disabled={!valid || testStatus === 'testing'}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'var(--surface-2)',
              color: valid && testStatus !== 'testing' ? 'var(--ink)' : 'var(--ink-3)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: valid && testStatus !== 'testing' ? 'pointer' : 'not-allowed',
            }}
          >
            {testStatus === 'testing' ? '测试中...' : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-light) 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px -3px rgba(47, 107, 255, 0.4)',
            }}
          >
            保存
          </button>
        </div>
    </BottomSheet>
  )
}
