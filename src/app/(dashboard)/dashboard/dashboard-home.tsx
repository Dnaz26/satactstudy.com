'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Companion } from '@/components/ui/companion'
import {
  BookOpen,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Flame,
  GraduationCap,
  Library,
  Play,
  RotateCcw,
  Timer,
  type LucideIcon,
} from 'lucide-react'
import { cn, formatTimeOfDay } from '@/lib/utils'

export type HomeTask = {
  id: string
  title: string
  minutes: number
  topicId: string | null
  done: boolean
  kind: string
}

function useNow() {
  const [now, setNow] = React.useState<Date | null>(null)
  React.useEffect(() => {
    setNow(new Date())
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function pad(value: number) {
  return String(Math.max(0, value)).padStart(2, '0')
}

function nextStudyAt(start: string, minutes: number, now: Date) {
  const [h, m] = start.split(':').map(Number)
  const begin = new Date(now)
  begin.setHours(h || 19, m || 0, 0, 0)
  const end = new Date(begin.getTime() + minutes * 60_000)
  if (now > end) begin.setDate(begin.getDate() + 1)
  return { begin, end, live: now >= begin && now <= end }
}

function taskIcon(kind: string, title: string): LucideIcon {
  const text = `${kind} ${title}`.toLowerCase()
  if (text.includes('vocab')) return Library
  if (text.includes('mistake') || text.includes('review') || text.includes('miss')) return RotateCcw
  if (text.includes('practice_test') || text.includes('timed') || text.includes('practice test')) return BookOpen
  return GraduationCap
}

function taskHref(task: HomeTask, testType: string, practiceHref: string) {
  if (task.kind === 'vocabulary' || /vocab/i.test(task.title)) return '/vocabulary'
  if (task.kind === 'mistake_review' || /miss|review/i.test(task.title)) return '/mistakes'
  if (task.kind === 'practice_test' || task.kind === 'timed_practice') return practiceHref
  if (task.topicId) {
    return `/practice/session?testType=${testType}&topicId=${task.topicId}&count=25&taskId=${task.id}`
  }
  return practiceHref
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  children,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
  accent?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="neu flex items-start gap-4 p-5">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', accent ? 'neu-raised text-white' : 'neu-sm text-signal')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{label}</p>
        <p className="mt-1 font-display text-4xl leading-none">{value}</p>
        <p className="mt-1 text-xs text-fog">{hint}</p>
        {children}
      </div>
    </div>
  )
}

export function DashboardHome({
  greeting,
  companionMode,
  firstName,
  testType,
  studyStart,
  dailyMinutes,
  todayMinutes,
  todayTasks,
  streak,
}: {
  greeting: string
  companionMode: 'warning' | 'success' | 'idle'
  firstName: string
  testType: string
  studyStart: string
  dailyMinutes: number
  todayMinutes: number
  todayTasks: HomeTask[]
  streak: number
}) {
  const mountedNow = useNow()
  const live = mountedNow != null
  const now = mountedNow ?? new Date(0)
  const session = nextStudyAt(studyStart, dailyMinutes, live ? now : new Date(0))
  const untilStudy = live ? Math.max(0, session.begin.getTime() - now.getTime()) : 0
  const until = {
    h: Math.floor(untilStudy / 3_600_000),
    m: Math.floor((untilStudy % 3_600_000) / 60_000),
    s: Math.floor((untilStudy % 60_000) / 1000),
  }
  const next = todayTasks.find((task) => !task.done)
  const practiceHref = '/practice'
  const goHref = next ? taskHref(next, testType, practiceHref) : practiceHref
  const remaining = Math.max(0, dailyMinutes - todayMinutes)
  const fill = Math.min(100, (todayMinutes / Math.max(1, dailyMinutes)) * 100)
  const NextIcon = next ? taskIcon(next.kind, next.title) : BookOpen

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pt-2 pb-10">
      <Companion mode={companionMode} message={greeting} />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={Timer} label="Need today" value={`${dailyMinutes}m`} hint={`${remaining}m still open`}>
          <div className="mt-3 h-2 overflow-hidden rounded-full neu-inset">
            <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${fill}%` }} />
          </div>
        </StatCard>
        <StatCard icon={Clock3} label="Spent so far" value={`${todayMinutes}m`} hint={`today, ${firstName}`} />
        <StatCard
          icon={CalendarClock}
          label="Begin"
          value={formatTimeOfDay(studyStart)}
          hint={session.live ? 'Block is live' : live ? `in ${pad(until.h)}:${pad(until.m)}:${pad(until.s)}` : '—'}
        />
        <StatCard icon={Flame} label="Streak" value={String(streak)} hint={streak === 1 ? 'day in a row' : 'days in a row'} accent />
      </div>

      <div className="neu p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl neu-sm text-signal">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">To do today</p>
              <p className="mt-1 font-display text-2xl leading-tight">{next ? next.title : `Take a ${testType} practice test`}</p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link href={goHref}>
              <Play className="mr-2 h-4 w-4" />
              Go
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          <Link
            href={practiceHref}
            className="flex items-center gap-4 rounded-2xl px-4 py-4 neu-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl neu-raised text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-paper">{testType} practice test</p>
              <p className="text-xs text-fog">Full mixed sheet · 60 questions</p>
            </div>
            <span className="font-mono text-xs text-fog">60 Q</span>
            <ChevronRight className="h-4 w-4 text-fog" />
          </Link>

          {todayTasks.map((task) => {
            const Icon = task.done ? Check : taskIcon(task.kind, task.title)
            return (
              <Link
                key={task.id}
                href={taskHref(task, testType, practiceHref)}
                className={cn(
                  'flex items-center gap-4 rounded-2xl px-4 py-4 transition-transform',
                  task.done ? 'neu-inset text-fog' : 'neu-sm hover:-translate-y-0.5'
                )}
              >
                <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', task.done ? 'bg-ok/20 text-ok' : 'neu-sm text-signal')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-base font-semibold', task.done && 'line-through')}>{task.title}</p>
                  <p className="text-xs text-fog">{task.minutes} minutes</p>
                </div>
                <span className="font-mono text-xs">{task.minutes}m</span>
                <ChevronRight className="h-4 w-4 text-fog" />
              </Link>
            )
          })}

          {todayTasks.length === 0 && (
            <div className="flex items-center gap-4 rounded-2xl px-4 py-4 neu-inset">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl neu-sm text-signal">
                <NextIcon className="h-5 w-5" />
              </div>
              <p className="text-sm text-fog">No extra tasks yet. The 60-question sheet is ready.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
