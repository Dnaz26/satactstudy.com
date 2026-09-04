'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { X, Send, Bot, ImagePlus } from 'lucide-react'
import type { TutorTrigger } from '@/lib/tutor/types'
import { TutorRichText } from '@/components/practice/question-prompt'
import { formatTutorSteps } from '@/lib/tutor/output'
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

function TutorBubble({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content.trim()) return <>{streaming ? '…' : ''}</>
  const steps = formatTutorSteps(content)
  if (!steps) {
    return <TutorRichText text={content} className="text-sm leading-5" />
  }
  return (
    <ol className="list-decimal space-y-2 pl-4">
      {steps.map((step, index) => (
        <li key={index}>
          <TutorRichText text={step} className="text-sm leading-5" />
        </li>
      ))}
    </ol>
  )
}

export function AiTutorPanel({ open, onClose, pendingTrigger, context, className }: AiTutorPanelProps) {
  const desmos = useDesmosOptional()
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm Nova. ${context?.topicName ? `We can work on ${context.topicName}.` : 'Ask me about this question.'}`,
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
        content: `Hi! I'm Nova. ${context?.topicName ? `We can work on ${context.topicName}.` : 'Ask me about this question.'}`,
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
          next[next.length - 1] = { role: 'assistant', content: data.error ?? 'Daily AI limit reached.' }
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

      const graphs = graphActionsFromText(assembled)
      if (graphs.length && desmos) {
        desmos.setOpen(true)
        void desmos.applyActions(graphs)
      }

      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && !last.content.trim()) {
          const next = [...prev]
          next[next.length - 1] = { role: 'assistant', content: 'Try that again — I am here.' }
          return next
        }
        return prev
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
        'fixed right-0 top-0 h-full w-80 neu border-l border-transparent flex flex-col z-50 transition-transform duration-300',
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-transparent">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-signal" />
          <span className="font-semibold text-paper">Nova AI Tutor</span>
        </div>
        <button onClick={onClose} className="text-fog hover:text-paper transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                msg.role === 'user'
                  ? 'whitespace-pre-wrap neu-raised text-white rounded-br-sm'
                  : 'neu-inset text-paper rounded-bl-sm'
              )}
            >
              {msg.role === 'assistant' ? (
                <TutorBubble
                  content={msg.content}
                  streaming={streaming && i === messages.length - 1}
                />
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-transparent space-y-2">
        {imageDataUrl && <p className="text-xs text-ok">Image attached for Nova</p>}
        <div className="flex gap-2">
          <label className="neu-sm flex h-10 w-10 cursor-pointer items-center justify-center text-fog hover:text-paper">
            <ImagePlus className="h-4 w-4" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPickImage(e.target.files?.[0])}
            />
          </label>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask Nova anything..."
            className="flex-1 h-10 rounded-xl border border-transparent neu-inset px-3 text-sm text-paper placeholder:text-fog focus:outline-none focus:ring-2 focus:ring-signal/40"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
