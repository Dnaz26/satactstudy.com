'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { MISTAKE_TYPE_LABELS } from '@/lib/schema'

export type MistakeRow = {
  id: string
  selected_answer: string | null
  mistake_type: string | null
  created_at: string | null
  questions: {
    id: string
    question_text: string
    correct_answer: string
    official_explanation: string | null
    topic_name: string | null
    topic_id?: string | null
  } | null
}

export function MistakesList({ mistakes }: { mistakes: MistakeRow[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null)

  if (mistakes.length === 0) {
    return <p className="text-sm text-fog">No misses yet.</p>
  }

  return (
    <div className="space-y-2">
      {mistakes.map((m) => {
        const open = openId === m.id
        return (
          <div key={m.id} className="neu-sm overflow-hidden">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setOpenId(open ? null : m.id)}
            >
              <p className="line-clamp-2 text-sm text-paper">{m.questions?.question_text ?? 'Question'}</p>
              <span className="shrink-0 font-mono text-[10px] text-fog">{m.questions?.topic_name ?? ''}</span>
            </button>
            {open && (
              <div className="space-y-2 px-4 pb-4 text-sm">
                <p className="text-bad">You: {m.selected_answer}</p>
                <p className="text-ok">Correct: {m.questions?.correct_answer ?? '—'}</p>
                {m.mistake_type && (
                  <p className="text-xs text-fog">{MISTAKE_TYPE_LABELS[m.mistake_type] ?? m.mistake_type}</p>
                )}
                {m.questions?.official_explanation && (
                  <p className="text-xs text-fog">{m.questions.official_explanation}</p>
                )}
                {m.created_at && <p className="font-mono text-[10px] text-fog">{formatDate(m.created_at)}</p>}
                <Link href={`/practice/session?topicId=${m.questions?.topic_id ?? ''}&count=25`}>
                  <Button size="sm">Retry</Button>
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
