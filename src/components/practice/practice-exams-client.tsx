'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { ExamFocus } from '@/lib/schema'

export type PracticeExamCard = {
  id: string
  examNumber: number
  title: string
  totalQuestions: number
  status: string
  unlocked: boolean
  kind: 'SAT' | 'ACT' | 'ACT Science'
}

const KINDS = [
  { id: 'SAT' as const, label: 'SAT', hint: 'Reading, Writing, and Math', color: '#1cb0f6' },
  { id: 'ACT' as const, label: 'ACT', hint: 'English, Math, and Reading', color: '#ff9600' },
  { id: 'ACT Science' as const, label: 'ACT Science', hint: 'Optional science section', color: '#58cc02' },
]

export function PracticeExamsClient({ exams, examFocus = 'both', onPreviewExam }: { exams: PracticeExamCard[]; examFocus?: ExamFocus; onPreviewExam?: (exam: PracticeExamCard) => void }) {
  const router = useRouter()
  const [kind, setKind] = React.useState<PracticeExamCard['kind'] | null>(null)
  const [starting, setStarting] = React.useState(false)

  const forKind = exams.filter((exam) => exam.kind === kind)
  const current = forKind.find((exam) => exam.unlocked && exam.status === 'in_progress')
    ?? forKind.find((exam) => exam.unlocked && exam.status !== 'completed')
  const finished = forKind.length > 0 && forKind.every((exam) => exam.status === 'completed')

  function openKind(nextKind: PracticeExamCard['kind']) {
    const list = exams.filter((exam) => exam.kind === nextKind)
    const target = list.find((exam) => exam.unlocked && exam.status === 'in_progress')
      ?? list.find((exam) => exam.unlocked && exam.status !== 'completed')
    setKind(nextKind)
    if (!target) return
    if (onPreviewExam) {
      onPreviewExam(target)
      return
    }
    setStarting(true)
    router.push(`/practice/session?examId=${target.id}&mode=exam&timed=1`)
  }

  const kinds = KINDS.filter((option) => examFocus === 'SAT' ? option.id === 'SAT' : examFocus === 'ACT' ? option.id !== 'SAT' : true)

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 py-4">
      <p className="text-sm font-bold text-[#777]">
        {kinds.length === 1 ? `${kinds[0].label} forms only.` : 'Pick SAT, ACT, or the optional ACT Science section.'}
      </p>

      <div className="grid gap-3">
        {kinds.map((option) => {
          const count = exams.filter((exam) => exam.kind === option.id).length
          const selected = kind === option.id
          return (
            <button
              key={option.id}
              type="button"
              disabled={starting}
              onClick={() => openKind(option.id)}
              className="rounded-2xl border-2 px-4 py-4 text-left shadow-[0_4px_0_#e5e5e5] transition active:translate-y-1 active:shadow-none disabled:opacity-70"
              style={{
                borderColor: selected ? option.color : '#e5e5e5',
                background: selected ? option.color : '#fff',
                color: selected ? '#fff' : '#3c3c3c',
              }}
            >
              <span className="block font-display text-2xl">{option.label}</span>
              <span className="mt-1 block text-sm font-bold" style={{ color: selected ? '#fff' : '#777' }}>
                {option.hint}{count ? ` · ${count} form${count === 1 ? '' : 's'}` : ''}
              </span>
            </button>
          )
        })}
      </div>

      {kind && (
        <div className="rounded-2xl border-2 border-[#e5e5e5] bg-[#fffdf8] p-4">
          {!forKind.length && (
            <p className="text-sm font-bold text-[#3c3c3c]">No {kind} form is ready yet.</p>
          )}
          {finished && (
            <p className="text-sm font-bold text-[#3c3c3c]">You finished every {kind} form. Pick another test, or keep practicing in Tutoring.</p>
          )}
          {current && (
            <p className="text-sm font-bold text-[#3c3c3c]">Opening {current.title}…</p>
          )}
        </div>
      )}
    </div>
  )
}
