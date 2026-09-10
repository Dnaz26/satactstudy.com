'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn } from '@/lib/utils'
import { BookOpen, CheckCircle2, Lock, Play, RotateCcw } from 'lucide-react'

type ExamCard = {
  id: string
  examNumber: number
  title: string
  totalQuestions: number
  readingCount: number
  englishCount: number
  mathCount: number
  status: string
  unlocked: boolean
  correctCount: number | null
  completedQuestions: number | null
  timeSpentSeconds: number | null
}

export function PracticeExamsClient() {
  const router = useRouter()
  const [exams, setExams] = React.useState<ExamCard[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [starting, setStarting] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/practice/exams')
        const data = await res.json() as { exams?: ExamCard[]; error?: string; paywall?: boolean }
        if (cancelled) return
        if (data.paywall) {
          router.replace('/pricing')
          return
        }
        if (!res.ok) {
          setError(data.error ?? 'Could not load exams')
          setLoading(false)
          return
        }
        setExams(data.exams ?? [])
        setLoading(false)
      } catch {
        if (!cancelled) {
          setError('Could not load exams')
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [router])

  async function openExam(exam: ExamCard) {
    if (!exam.unlocked || exam.status === 'completed' || starting) return
    setStarting(exam.id)
    router.push(`/practice/session?examId=${exam.id}&mode=exam&timed=1`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading practice exams..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="mb-4 text-paper">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-10 pt-2">
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">Practice exams</p>
        <h1 className="font-display text-3xl text-paper">Exam 1 → {exams.length || '…'}</h1>
        <p className="max-w-2xl text-sm text-fog">
          Each exam is 100 unique questions: 25 Reading, 25 English, 50 Math. Questions never repeat across exams,
          tutoring, or past attempts. Finish an exam to unlock the next — incomplete exams keep your progress.
        </p>
      </header>

      <div className="grid gap-3">
        {exams.map((exam) => {
          const completed = exam.status === 'completed'
          const inProgress = exam.status === 'in_progress'
          const locked = !exam.unlocked
          return (
            <button
              key={exam.id}
              type="button"
              disabled={locked || completed || Boolean(starting)}
              onClick={() => void openExam(exam)}
              className={cn(
                'flex w-full items-center justify-between gap-4 rounded-3xl px-5 py-4 text-left transition',
                locked && 'cursor-not-allowed opacity-55',
                completed && 'cursor-default opacity-90',
                !locked && !completed && 'hover:-translate-y-0.5',
                'border border-[var(--line)] bg-white/70',
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {locked ? <Lock className="h-4 w-4 text-fog" /> : completed ? <CheckCircle2 className="h-4 w-4 text-ok" /> : <BookOpen className="h-4 w-4 text-signal" />}
                  <p className="font-display text-xl text-paper">{exam.title}</p>
                </div>
                <p className="mt-1 text-xs text-fog">
                  {exam.readingCount} Reading · {exam.englishCount} English · {exam.mathCount} Math
                  {completed && exam.correctCount != null
                    ? ` · Score ${exam.correctCount}/${exam.completedQuestions ?? exam.totalQuestions}`
                    : ''}
                  {inProgress ? ' · In progress — resume anytime' : ''}
                  {locked ? ' · Complete the previous exam to unlock' : ''}
                </p>
              </div>
              <div className="shrink-0">
                {completed ? (
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-paper">Done</span>
                ) : locked ? (
                  <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-fog">Locked</span>
                ) : inProgress ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-signal px-3 py-1.5 text-xs font-semibold text-white">
                    <RotateCcw className="h-3.5 w-3.5" /> Resume
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-signal px-3 py-1.5 text-xs font-semibold text-white">
                    <Play className="h-3.5 w-3.5" /> Start
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-center text-xs text-fog">
        Prefer a short topic drill?{' '}
        <Link href="/study" className="font-semibold text-signal underline-offset-2 hover:underline">
          Open Study
        </Link>
      </p>
    </div>
  )
}
