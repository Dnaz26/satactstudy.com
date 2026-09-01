'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'
import { X, Send, Bot } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface AiTutorPanelProps {
  open: boolean
  onClose: () => void
  context?: {
    questionText?: string
    topicName?: string
  }
  className?: string
}

export function AiTutorPanel({ open, onClose, context, className }: AiTutorPanelProps) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm Nova, your AI tutor. ${context?.topicName ? `I can help you with ${context.topicName}.` : "Ask me anything about this question or topic!"} What would you like to know?`,
    },
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
        }),
      })

      const data = await res.json() as { message?: string; error?: string }
      if (data.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message! }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-80 neu border-l border-transparent flex flex-col z-40 transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
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
                  ? 'neu-raised text-white rounded-br-sm'
                  : 'neu-inset text-paper rounded-bl-sm'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="neu-inset border border-transparent rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-signal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-signal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-signal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-transparent">
        <div className="flex gap-2">
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
