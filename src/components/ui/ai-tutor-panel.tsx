'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { X, Send, Pencil, ImagePlus, Loader2, ChevronRight, CircleHelp, RefreshCw } from 'lucide-react'
import type { TutorTrigger } from '@/lib/tutor/types'
import { TutorRichText } from '@/components/practice/question-prompt'
import { formatTutorSteps } from '@/lib/tutor/output'
import { dedupeAgainstHistory } from '@/lib/tutor/anti-repeat'
import { useDesmosOptional } from '@/components/desmos/desmos-provider'
import type { DesmosAgentAction } from '@/types/desmos'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiTutorPanelProps {
  open: boolean
  onClose: () => void
  pendingTrigger?: { trigger: TutorTrigger; prompt: string } | null
  context?: {
    questionId?: string
    questionText?: string
    topicId?: string | null
    topicName?: string
    sectionName?: string
    selectedAnswer?: string
    correctAnswer?: string
    choices?: Array<{ key: string; text: string }>
    officialExplanation?: string | null
    questionType?: string
    submitted?: boolean
    isCorrect?: boolean
    desmosAvailable?: boolean
  }
  className?: string
}

async function readTutorStream(
  res: Response,
  onDelta: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = await res.json() as { message?: string; error?: string }
    const text = data.message ?? data.error ?? ''
    if (text) onDelta(text)
    return
  }

  if (!res.body) throw new Error('No stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (!signal?.aborted) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload) as { delta?: string; message?: string }
          if (json.delta) onDelta(json.delta)
          else if (json.message) onDelta(json.message)
        } catch {
          onDelta(payload)
        }
      }
    }
  }
}

function graphActionsFromText(text: string): DesmosAgentAction[] {
  const lines = text.match(/y\s*=\s*[0-9a-zA-Z+\-*/^(). ]{1,40}/g) ?? []
  const unique = [...new Set(lines.map((line) => line.replace(/\s+/g, '').replace(/×/g, '*')))]
  return unique.slice(0, 3).map((latex, index) => ({
    type: 'addExpression',
    latex: latex.replace(/y=/i, 'y='),
    id: `nova-${index}`,
    color: index === 0 ? '#ff6b57' : '#2b9ed9',
  }))
}

function dedupeSteps(steps: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const step of steps) {
    const key = step.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(step.trim())
  }
  return out
}

function stripRepeatedContent(next: string, priorAssistant: string[]): string {
  const cleaned = dedupeAgainstHistory(next, priorAssistant)
  return cleaned.trim() || 'Here is a new angle — what is the first number you notice in the question?'
}

function TutorBubble({
  content,
  streaming,
  onAsk,
  onSimplify,
  disabled,
}: {
  content: string
  streaming?: boolean
  onAsk?: (tip: string) => void
  onSimplify?: (tip: string) => void
  disabled?: boolean
}) {
  const [stepIndex, setStepIndex] = React.useState(0)

  const steps = React.useMemo(() => {
    if (!content.trim() || streaming) return null
    const parsed = formatTutorSteps(content)
    return parsed ? dedupeSteps(parsed) : null
  }, [content, streaming])

  React.useEffect(() => {
    setStepIndex(0)
  }, [content])

  if (!content.trim()) {
    return (
      <span className="inline-flex items-center gap-2 text-fog">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {streaming ? 'Nova is thinking…' : ''}
      </span>
    )
  }

  if (streaming || !steps || steps.length <= 1) {
    return (
      <div className="space-y-2">
        <TutorRichText text={content} className="text-[13px] leading-5" />
        {!streaming ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk?.(content)}
              aria-label="Ask about this tip"
              title="Ask about this"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white text-fog transition hover:border-signal/30 hover:text-signal disabled:opacity-50"
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSimplify?.(content)}
              aria-label="Explain this tip more simply"
              title="Say it simpler"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white text-fog transition hover:border-signal/30 hover:text-signal disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  const current = steps[Math.min(stepIndex, steps.length - 1)] ?? steps[0]!
  const hasMore = stepIndex < steps.length - 1

  return (
    <div className="space-y-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">
        Tip {stepIndex + 1} of {steps.length}
      </p>
      <TutorRichText text={current} className="text-[13px] leading-5" />
      <div className="flex flex-wrap items-center gap-1.5">
        {hasMore ? (
          <button
            type="button"
            onClick={() => setStepIndex((n) => Math.min(n + 1, steps.length - 1))}
            className="inline-flex items-center gap-1 rounded-full border border-black/5 bg-white px-2.5 py-1 text-[11px] font-semibold text-signal transition hover:border-signal/30"
          >
            Next tip
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAsk?.(current)}
          aria-label="Ask about this tip"
          title="Ask about this (?)"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white text-fog transition hover:border-signal/30 hover:text-signal disabled:opacity-50"
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSimplify?.(current)}
          aria-label="Explain this tip more simply"
          title="Refresh — say it simpler"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-black/5 bg-white text-fog transition hover:border-signal/30 hover:text-signal disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  { label: 'Hint', prompt: 'Give me a small hint only. Do not give the answer.', trigger: 'hint' as TutorTrigger },
  { label: 'Why?', prompt: 'Explain why the right answer works in short steps.', trigger: 'chat' as TutorTrigger },
  { label: 'Desmos', prompt: 'If Desmos helps, tell me exactly what to type.', trigger: 'chat' as TutorTrigger },
  { label: '? Ask', prompt: 'I have a question about what you just said. Let me ask it next — first, pause and invite my question.', trigger: 'chat' as TutorTrigger },
  { label: 'Simpler', prompt: 'Refresh mode: say what you just said again in easier, shorter words with a fresh tiny example. Do not move ahead.', trigger: 'help' as TutorTrigger },
]

export function AiTutorPanel({ open, onClose, pendingTrigger, context, className }: AiTutorPanelProps) {
  const desmos = useDesmosOptional()
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi — I'm Nova. ${context?.topicName ? `Let's work through ${context.topicName}.` : 'Ask me anything about this question.'}`,
    },
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [streaming, setStreaming] = React.useState(false)
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null)
  const handledTrigger = React.useRef<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)
  const messagesRef = React.useRef(messages)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  messagesRef.current = messages

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  React.useEffect(() => {
    handledTrigger.current = null
    abortRef.current?.abort()
    setMessages([
      {
        role: 'assistant',
        content: `Hi — I'm Nova. ${context?.topicName ? `Let's work through ${context.topicName}.` : 'Ask me anything about this question.'}`,
      },
    ])
  }, [context?.questionId, context?.topicName])

  const send = React.useCallback(async (text: string, trigger: TutorTrigger = 'chat') => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }])
    setLoading(true)
    setStreaming(true)

    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          trigger,
          stream: true,
          imageDataUrl: imageDataUrl ?? undefined,
          messages: [...messagesRef.current, userMsg].map((m) => ({ role: m.role, content: m.content })),
          context: {
            questionId: context?.questionId,
            questionText: context?.questionText,
            topicId: context?.topicId,
            topicName: context?.topicName,
            sectionName: context?.sectionName,
            selectedAnswer: context?.selectedAnswer,
            correctAnswer: context?.correctAnswer,
            choices: context?.choices,
            officialExplanation: context?.officialExplanation,
            submitted: context?.submitted,
            isCorrect: context?.isCorrect,
            desmosAvailable: Boolean(context?.desmosAvailable && desmos?.status !== 'error'),
          },
        }),
      })

      if (res.status === 403) {
        const data = await res.json() as { error?: string }
        setMessages((prev) => {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: data.error ?? 'AI limit reached for today.' }
          return next
        })
        return
      }

      let assembled = ''
      await readTutorStream(res, (chunk) => {
        assembled += chunk
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') {
            next[next.length - 1] = { role: 'assistant', content: last.content + chunk }
          }
          return next
        })
      }, controller.signal)

      const priorAssistant = messagesRef.current
        .filter((m) => m.role === 'assistant' && m.content.trim())
        .slice(0, -1)
        .map((m) => m.content)
      const cleaned = stripRepeatedContent(assembled, priorAssistant)

      const graphs = graphActionsFromText(cleaned)
      if (graphs.length && desmos) {
        desmos.setOpen(true)
        void desmos.applyActions(graphs)
      }

      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role !== 'assistant') return prev
        next[next.length - 1] = {
          role: 'assistant',
          content: cleaned.trim() || 'Try that again — I am here.',
        }
        return next
      })
    } catch (err) {
      if (controller.signal.aborted) return
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: 'Connection issue. You can keep answering while I recover.' }
        return next
      })
      void err
    } finally {
      setImageDataUrl(null)
      setLoading(false)
      setStreaming(false)
    }
  }, [context, desmos, imageDataUrl])

  React.useEffect(() => {
    if (!pendingTrigger || !open) return
    const key = `${pendingTrigger.trigger}:${pendingTrigger.prompt}`
    if (handledTrigger.current === key) return
    handledTrigger.current = key
    void send(pendingTrigger.prompt, pendingTrigger.trigger)
  }, [open, pendingTrigger, send])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    await send(text, 'chat')
  }

  function handleAskAboutTip(tip: string) {
    if (loading) return
    const snippet = tip.replace(/\s+/g, ' ').trim().slice(0, 140)
    setInput(`I have a question about this: "${snippet}" — `)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleSimplifyTip(tip: string) {
    if (loading) return
    const snippet = tip.replace(/\s+/g, ' ').trim().slice(0, 280)
    void send(
      `Refresh mode: say ONLY this last tip again in easier, shorter words with a fresh tiny example. Do not move ahead. Tip was: "${snippet}"`,
      'help',
    )
  }

  function onPickImage(file: File | undefined) {
    if (!file || !file.type.startsWith('image/') || file.size > 1_800_000) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageDataUrl(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'fixed right-0 top-0 z-50 flex h-full w-[min(100vw,24rem)] flex-col overflow-hidden border-l border-[var(--line)] bg-[linear-gradient(180deg,#fffaf5_0%,#f7f1ea_48%,#fff7f2_100%)] shadow-[-18px_0_48px_rgba(40,24,16,0.12)] transition-transform duration-300',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        className,
      )}
    >
      <div className="relative overflow-hidden px-4 pb-4 pt-5">
        <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-signal/20 blur-2xl" />
        <div className="pointer-events-none absolute left-8 top-0 h-20 w-20 rounded-full bg-[#2b9ed9]/15 blur-xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-signal text-white shadow-[0_12px_28px_rgba(255,107,87,0.35)]">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg leading-none text-paper">Nova</p>
              <p className="mt-1 text-xs text-fog">
                {context?.sectionName || context?.topicName || 'Your SAT / ACT tutor'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-fog transition hover:text-paper"
            aria-label="Close tutor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {context?.questionText && (
          <div className="relative mt-4 rounded-2xl border border-white/70 bg-white/65 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fog">This question</p>
            <p className="line-clamp-3 text-xs leading-5 text-paper">{context.questionText}</p>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {(() => {
          const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
          const latestUser = [...messages].reverse().find((m) => m.role === 'user')
          const visible: Message[] = []
          if (latestUser) visible.push(latestUser)
          if (latestAssistant) visible.push(latestAssistant)
          if (visible.length === 0 && messages[0]) visible.push(messages[0])
          return visible.map((msg, i) => (
            <div
              key={`${msg.role}-${i}-${msg.content.slice(0, 24)}`}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-[1.35rem] px-3.5 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'rounded-br-md bg-signal text-white shadow-[0_10px_24px_rgba(255,107,87,0.28)]'
                    : 'rounded-bl-md border border-white/80 bg-white/80 text-paper shadow-[0_8px_20px_rgba(40,24,16,0.06)]',
                )}
              >
                {msg.role === 'assistant' ? (
                  <TutorBubble
                    content={msg.content}
                    streaming={streaming && msg === messages[messages.length - 1]}
                    onAsk={handleAskAboutTip}
                    onSimplify={handleSimplifyTip}
                    disabled={loading}
                  />
                ) : (
                  <span className="whitespace-pre-wrap text-[13px] leading-5">{msg.content}</span>
                )}
              </div>
            </div>
          ))
        })()}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-[var(--line)] bg-white/55 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={loading}
              onClick={() => void send(item.prompt, item.trigger)}
              className="rounded-full border border-black/5 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-paper transition hover:border-signal/30 hover:text-signal disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
        {imageDataUrl && <p className="text-xs text-ok">Image attached for Nova</p>}
        <div className="flex items-end gap-2">
          <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-black/5 bg-white text-fog transition hover:text-paper">
            <ImagePlus className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
          </label>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            rows={1}
            placeholder="Ask Nova…"
            className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-black/5 bg-white px-3.5 py-2.5 text-sm text-paper placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-signal/35"
          />
          <Button
            size="icon"
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
            className="h-11 w-11 rounded-2xl shadow-[0_10px_22px_rgba(255,107,87,0.28)]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
