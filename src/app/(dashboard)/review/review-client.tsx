'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'
import { MISTAKE_TYPE_LABELS } from '@/lib/schema'
import { CheckCircle, XCircle } from 'lucide-react'

export type AttemptRow = {
  id: string
  correct: boolean | null
  selected_answer: string | null
  mistake_type: string | null
  time_spent_seconds: number | null
  created_at: string | null
  questions: {
    id: string
    question_text: string
    correct_answer: string
    official_explanation: string | null
    topic_name: string | null
  } | null
}

export function ReviewClient({ attempts }: { attempts: AttemptRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null)
  const misses = attempts.filter((a) => !a.correct)
  const accuracy = attempts.length ? Math.round((attempts.filter((a) => a.correct).length / attempts.length) * 100) : 0

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 pt-2">
      <h1 className="font-display text-2xl">Review</h1>
      <p className="font-mono text-xs text-fog">{attempts.length} answers · {misses.length} misses · {accuracy}%</p>

      <Tabs defaultValue="misses">
        <TabsList className="w-full">
          <TabsTrigger value="misses" className="flex-1">Misses</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
        </TabsList>

        <TabsContent value="misses" className="mt-4 space-y-2">
          {misses.length === 0 ? (
            <p className="text-sm text-fog">No misses yet.</p>
          ) : misses.map((m) => {
            const open = openId === m.id
            return (
              <div key={m.id} className="neu-sm overflow-hidden">
                <button type="button" className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left" onClick={() => setOpenId(open ? null : m.id)}>
                  <p className="line-clamp-2 text-base">{m.questions?.question_text ?? 'Question'}</p>
                  <span className="shrink-0 font-mono text-[10px] text-fog">{m.questions?.topic_name ?? ''}</span>
                </button>
                {open && (
                  <div className="space-y-2 px-4 pb-4 text-sm">
                    <p className="text-bad">You: {m.selected_answer}</p>
                    <p className="text-ok">Correct: {m.questions?.correct_answer ?? '—'}</p>
                    {m.mistake_type && <p className="text-xs text-fog">{MISTAKE_TYPE_LABELS[m.mistake_type] ?? m.mistake_type}</p>}
                    {m.questions?.official_explanation && <p className="text-xs text-fog">{m.questions.official_explanation}</p>}
                    {m.created_at && <p className="font-mono text-[10px] text-fog">{formatDate(m.created_at)}</p>}
                    <Link href={`/practice?topicId=${m.questions?.id ?? ''}`}><Button size="sm">Retry</Button></Link>
                  </div>
                )}
              </div>
            )
          })}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-1">
          {attempts.length === 0 ? (
            <p className="text-sm text-fog">No answers yet.</p>
          ) : attempts.map((attempt) => (
            <div key={attempt.id} className="flex items-start gap-3 px-1 py-2">
              {attempt.correct
                ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-ok" />
                : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm">{attempt.questions?.question_text ?? 'Question'}</p>
                <p className="font-mono text-[10px] text-fog">
                  {attempt.questions?.topic_name ?? ''}
                  {attempt.created_at ? ` · ${formatDate(attempt.created_at)}` : ''}
                </p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
