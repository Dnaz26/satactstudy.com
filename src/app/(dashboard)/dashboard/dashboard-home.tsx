'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StudyTimer } from '@/components/ui/study-timer'
import { cn } from '@/lib/utils'
import { msUntil, splitCountdown } from '@/lib/dashboard/pacing'

type GrowthPoint = { at: string; correct: boolean; difficulty: string }
type Snapshot = { date: string; ovr: number | null; predicted: number | null; correct: number | null; total: number | null }

type Pacing = {
  sessionsLeft: number
  practiceTotal: number
  practiceRemaining: number
  practiceToday: number
  lessonsTotal: number
  lessonsRemaining: number
  lessonsToday: number
  studyMinutesPerDay: number
  studyDaysPerWeek: number
}

function accuracyInRange(points: GrowthPoint[], startMs: number, endMs: number) {
  const slice = points.filter((p) => {
    const t = Date.parse(p.at)
    return Number.isFinite(t) && t >= startMs && t < endMs
  })
  if (!slice.length) return null
  const correct = slice.filter((p) => p.correct).length
  return correct / slice.length
}

function growthLabel(delta: number | null, unit: 'acc' | 'score') {
  if (delta == null) return '—'
  const rounded = Math.round(delta * 10) / 10
  const prefix = rounded > 0 ? '+' : ''
  return unit === 'acc' ? `${prefix}${rounded}%` : `${prefix}${rounded}`
}

export function DashboardHome({
  firstName,
  testType,
  studyStart,
  dailyMinutes,
  todayMinutes,
  streak,
  testDate,
  targetScore,
  readyRate,
  expectedScore,
  scoreLow,
  scoreHigh,
  pacing,
  todayPracticeDone,
  todayLessonsDone,
  lessonsDone,
  lessonsTotal,
  growthPoints,
  snapshots,
}: {
  firstName: string
  testType: string
  studyStart: string
  dailyMinutes: number
  todayMinutes: number
  streak: number
  testDate: string | null
  targetScore: number | null
  readyRate: number | null
  expectedScore: number | null
  scoreLow: number | null
  scoreHigh: number | null
  pacing: Pacing
  todayPracticeDone: number
  todayLessonsDone: number
  lessonsDone: number
  lessonsTotal: number
  growthPoints: GrowthPoint[]
  snapshots: Snapshot[]
}) {
  const [now, setNow] = React.useState(() => Date.now())
  const [timing, setTiming] = React.useState(false)
  const [intervalDays, setIntervalDays] = React.useState(7)
  const [customDays, setCustomDays] = React.useState('7')

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const left = msUntil(testDate, now)
  const parts = splitCountdown(left)
  const examProgress = (() => {
    if (!testDate) return 0
    const end = new Date(`${testDate}T23:59:59`).getTime()
    const start = end - 120 * 86400_000
    if (now <= start) return 0
    if (now >= end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  })()

  const endMs = now
  const startMs = now - intervalDays * 86400_000
  const prevStart = startMs - intervalDays * 86400_000
  const recentAcc = accuracyInRange(growthPoints, startMs, endMs)
  const priorAcc = accuracyInRange(growthPoints, prevStart, startMs)
  const growth = recentAcc != null && priorAcc != null ? (recentAcc - priorAcc) * 100 : null

  const snapGrowth = (() => {
    if (snapshots.length < 2) return null
    const cutoff = new Date(now - intervalDays * 86400_000).toISOString().slice(0, 10)
    const recent = snapshots.filter((s) => s.date >= cutoff)
    const older = snapshots.filter((s) => s.date < cutoff)
    if (!recent.length || !older.length) return null
    const a = recent[0]?.ovr
    const b = older[0]?.ovr
    if (a == null || b == null) return null
    return a - b
  })()

  const growthFromAccuracy = growth != null
  const growthDisplay = growth ?? snapGrowth
  const practiceGoal = pacing.practiceToday
  const lessonGoal = pacing.lessonsToday
  const practicePct = Math.min(100, Math.round((todayPracticeDone / Math.max(1, practiceGoal)) * 100))
  const lessonPct = Math.min(100, Math.round((todayLessonsDone / Math.max(1, lessonGoal)) * 100))

  return (
    <div className="mx-auto w-full max-w-3xl space-y-12 pb-16 pt-4">
      <header className="space-y-2">
        <p className="text-sm text-fog">
          {testType}
          {targetScore != null ? ` · target ${targetScore}` : ''}
          {streak > 0 ? ` · ${streak}-day streak` : ''}
        </p>
        <h1 className="font-display text-4xl tracking-tight text-paper sm:text-5xl">{firstName}</h1>
        <p className="text-sm text-fog">
          Study window {studyStart} · {dailyMinutes} min · {pacing.studyDaysPerWeek} days / week
        </p>
      </header>

      <section className="grid gap-10 border-y border-line py-8 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-fog">Study time</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              {timing ? (
                <StudyTimer running label="Session" className="!shadow-none !border-0 !bg-transparent !px-0" />
              ) : (
                <p className="font-mono text-4xl tabular-nums text-paper">
                  {String(Math.floor(todayMinutes / 60)).padStart(2, '0')}:{String(todayMinutes % 60).padStart(2, '0')}
                </p>
              )}
              <p className="mt-2 text-sm text-fog">{todayMinutes} min logged today</p>
            </div>
            {!timing ? (
              <Button type="button" onClick={() => setTiming(true)} className="rounded-full px-5">
                Begin
              </Button>
            ) : (
              <button type="button" onClick={() => setTiming(false)} className="text-sm text-fog underline-offset-4 hover:underline">
                Stop
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-fog">Exam</p>
          {testDate ? (
            <>
              <p className="mt-3 font-display text-3xl text-paper">{testDate}</p>
              <p className="mt-2 font-mono text-base tabular-nums text-fog">
                {parts.days}d {String(parts.hours).padStart(2, '0')}h {String(parts.minutes).padStart(2, '0')}m {String(parts.seconds).padStart(2, '0')}s
              </p>
              <div className="mt-4 h-px w-full bg-line">
                <div className="h-0.5 bg-signal" style={{ width: `${examProgress}%` }} />
              </div>
              <p className="mt-3 text-sm text-fog">
                {pacing.sessionsLeft} sessions left · {pacing.practiceRemaining} practice Q left
              </p>
            </>
          ) : (
            <Link href="/customize" className="mt-3 inline-block text-sm font-medium text-signal">
              Set exam date →
            </Link>
          )}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl text-paper">Today</h2>
          <p className="text-xs text-fog">
            {pacing.practiceTotal} Q + {pacing.lessonsTotal} lessons before exam
          </p>
        </div>
        <ol className="divide-y divide-line border-y border-line">
          <li>
            <Link href="/practice" className="flex items-center justify-between gap-4 py-5 transition hover:bg-panel-2/60">
              <div>
                <p className="text-base font-medium text-paper">1. Practice questions</p>
                <p className="mt-1 text-sm text-fog">
                  {todayPracticeDone} of {practiceGoal} today
                </p>
                <div className="mt-3 h-px w-48 max-w-full bg-line">
                  <div className="h-0.5 bg-signal" style={{ width: `${practicePct}%` }} />
                </div>
              </div>
              <span className="text-sm text-signal">Open</span>
            </Link>
          </li>
          <li>
            <Link href="/study" className="flex items-center justify-between gap-4 py-5 transition hover:bg-panel-2/60">
              <div>
                <p className="text-base font-medium text-paper">2. Tutoring</p>
                <p className="mt-1 text-sm text-fog">
                  {lessonsDone}/{lessonsTotal} lessons · {todayLessonsDone}/{lessonGoal} today
                </p>
                <div className="mt-3 h-px w-48 max-w-full bg-line">
                  <div className="h-0.5 bg-ok" style={{ width: `${lessonPct}%` }} />
                </div>
              </div>
              <span className="text-sm text-signal">Open</span>
            </Link>
          </li>
        </ol>
      </section>

      <section className="space-y-6">
        <h2 className="font-display text-2xl text-paper">Standing</h2>
        <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-fog">Ready rate</dt>
            <dd className="mt-2 font-display text-4xl tabular-nums text-paper">
              {readyRate != null ? `${Math.round(readyRate)}%` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-fog">Expected score</dt>
            <dd className="mt-2 font-display text-4xl tabular-nums text-paper">
              {expectedScore != null ? expectedScore : '—'}
            </dd>
            {scoreLow != null && scoreHigh != null && (
              <p className="mt-1 text-sm text-fog">{scoreLow}–{scoreHigh}</p>
            )}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-fog">Growth</dt>
            <dd className={cn('mt-2 font-display text-4xl tabular-nums', (growthDisplay ?? 0) >= 0 ? 'text-ok' : 'text-signal')}>
              {growthLabel(growthDisplay, growthFromAccuracy ? 'acc' : 'score')}
            </dd>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[7, 14, 30, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setIntervalDays(d)
                    setCustomDays(String(d))
                  }}
                  className={cn(
                    'text-xs',
                    intervalDays === d ? 'font-semibold text-signal' : 'text-fog hover:text-paper',
                  )}
                >
                  {d === 7 ? '1w' : d === 14 ? '2w' : d === 30 ? '1m' : '2m'}
                </button>
              ))}
              <input
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value.replace(/[^\d]/g, ''))}
                onBlur={() => {
                  const n = Math.max(1, Math.min(180, Number(customDays) || 7))
                  setCustomDays(String(n))
                  setIntervalDays(n)
                }}
                className="h-7 w-12 border-b border-line bg-transparent font-mono text-xs outline-none"
                aria-label="Custom interval days"
              />
            </div>
          </div>
        </dl>
      </section>
    </div>
  )
}
