'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

type ExamCard = {
  id: string
  examNumber: number
  title: string
  status: string
  unlocked: boolean
}

/**
 * Practice always auto-opens the current exam from the server page.
 * This client only handles the all-complete fallback (or a rare race while redirecting).
 */
export function PracticeExamsClient({ allComplete = false }: { allComplete?: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(!allComplete)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (allComplete) return
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
        const list = data.exams ?? []
        const inProgress = list.find((exam) => exam.status === 'in_progress' && exam.unlocked)
        const next = list.find((exam) => exam.unlocked && exam.status !== 'completed')
        const target = inProgress ?? next
        if (target) {
          router.replace(`/practice/session?examId=${target.id}&mode=exam&timed=1`)
          return
        }
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
  }, [allComplete, router])

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <LoadingSpinner size="lg" text="Opening your practice exam..." />
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
    <div className="mx-auto w-full max-w-lg space-y-4 py-16 text-center">
      <h1 className="font-display text-3xl text-paper">All practice exams done</h1>
      <p className="text-sm text-fog">
        You’ve finished every exam pack. Keep sharpening skills in Tutoring, or jump into Rapid fire.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button asChild>
          <Link href="/study">Open Tutoring</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/simulator">Rapid fire</Link>
        </Button>
      </div>
    </div>
  )
}
