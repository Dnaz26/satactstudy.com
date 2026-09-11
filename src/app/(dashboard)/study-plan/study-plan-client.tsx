'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatTimeOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

interface StudyPlan {
  id: string
  ai_explanation: string | null
  test_type: string
  target_score: number
  start_date: string
  end_date: string
}

interface StudyPlanTask {
  id: string
  date: string
  task_type: string
  topic_name: string | null
  duration_minutes: number
  question_count: number | null
  completed: boolean
  topic_id: string | null
}

interface Profile {
  target_score: number | null
  target_test: string | null
  test_date: string | null
  daily_study_minutes: number | null
  available_days: string[] | null
  baseline_score: number | null
  study_start_time?: string | null
}

interface StudyPlanClientProps {
  plan: StudyPlan
  tasks: StudyPlanTask[]
  profile: Profile | null
}

function taskHref(task: StudyPlanTask, testType: string): string {
  if (task.task_type === 'vocabulary') return '/vocabulary'
  if (task.task_type === 'mistake_review') return '/mistakes'
  if (task.task_type === 'practice_test' || task.task_type === 'timed_practice') {
    return `/practice`
  }
  return `/practice/session?testType=${testType}&topicId=${task.topic_id ?? ''}&count=${Math.max(25, task.question_count ?? 25)}&taskId=${task.id}`
}

export function StudyPlanClient({ plan, tasks, profile, dayLogs = [] }: StudyPlanClientProps & { dayLogs?: Array<{ date: string; status: string }> }) {
  const router = useRouter()
  const [month, setMonth] = React.useState(() => new Date())
  const [selected, setSelected] = React.useState(() => new Date().toISOString().split('T')[0])
  const [completingId, setCompletingId] = React.useState<string | null>(null)
  const [generating, setGenerating] = React.useState(false)
  const autoStarted = React.useRef(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const logByDate = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const log of dayLogs) map.set(log.date, log.status)
    return map
  }, [dayLogs])
  const byDate = React.useMemo(() => {
    const map = new Map<string, StudyPlanTask[]>()
    for (const task of tasks) {
      const list = map.get(task.date) ?? []
      list.push(task)
      map.set(task.date, list)
    }
    return map
  }, [tasks])

  const selectedTasks = byDate.get(selected) ?? []
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start, end })
  const window = formatTimeOfDay(profile?.study_start_time ?? '19:00')
  const daily = profile?.daily_study_minutes ?? 30
  const doneCount = tasks.filter((t) => t.completed).length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  async function markComplete(taskId: string) {
    setCompletingId(taskId)
    await fetch(`/api/schedule/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    }).catch(() => {})
    router.refresh()
    setCompletingId(null)
  }

  async function regenerate() {
    if (!profile) return
    setGenerating(true)
    await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testDate: profile.test_date ?? format(new Date(Date.now() + 28 * 86400000), 'yyyy-MM-dd'),
        testType: (profile.target_test === 'Both' ? 'both' : profile.target_test) ?? 'SAT',
        targetScore: profile.target_score ?? 1400,
        baselineScore: profile.baseline_score,
        dailyMinutes: profile.daily_study_minutes ?? 30,
        availableDays: profile.available_days?.length
          ? profile.available_days
          : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      }),
    })
    setGenerating(false)
    router.refresh()
  }

  React.useEffect(() => {
    if (autoStarted.current || tasks.length > 0 || !profile) return
    autoStarted.current = true
    void regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length, profile])

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 pb-16 pt-4">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-4xl tracking-tight text-paper">Schedule</h1>
          <p className="mt-2 text-sm text-fog">
            {window} · {daily} min · {doneCount}/{tasks.length} done · {progress}%
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void regenerate()} loading={generating} className="text-signal">
          Rebuild
        </Button>
      </header>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            className="text-sm text-fog hover:text-paper"
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <p className="font-display text-xl text-paper">{format(month, 'MMMM yyyy')}</p>
          <button
            type="button"
            className="text-sm text-fog hover:text-paper"
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Next month"
          >
            Next →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px border border-line bg-line text-center text-[11px] uppercase tracking-[0.12em] text-fog">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-panel-2 py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px border border-t-0 border-line bg-line">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = byDate.get(key) ?? []
            const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed)
            const logged = logByDate.get(key)
            const done = logged === 'done' || allDone
            const missed = logged === 'missed' || (key < today && dayTasks.length > 0 && !allDone)
            const isSelected = key === selected
            const inMonth = isSameMonth(day, month)
            const isToday = isSameDay(day, new Date())
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'min-h-[88px] bg-white p-2 text-left transition sm:min-h-[100px] sm:p-2.5',
                  isSelected && 'bg-signal text-white',
                  !isSelected && done && 'bg-[rgba(184,242,200,0.45)]',
                  !isSelected && missed && 'bg-[rgba(46,196,182,0.12)]',
                  !inMonth && 'opacity-40',
                )}
              >
                <p className={cn(
                  'text-sm font-medium',
                  isToday && !isSelected && 'text-signal',
                )}>
                  {format(day, 'd')}
                </p>
                {dayTasks[0] && (
                  <p className={cn('mt-1 line-clamp-3 text-[11px] leading-snug', isSelected ? 'text-white/90' : 'text-fog')}>
                    {done ? 'Done' : dayTasks[0].topic_name}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-2xl text-paper">
          {selected === today ? 'Today' : format(new Date(`${selected}T12:00:00`), 'EEE MMM d')}
        </h2>
        {selectedTasks.length === 0 ? (
          <p className="border-y border-line py-6 text-sm text-fog">
            {generating ? 'Building schedule…' : 'No tasks on this day. Tap Rebuild if needed.'}
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {selectedTasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className={cn('text-sm text-paper', task.completed && 'text-fog line-through')}>
                    {task.topic_name}
                  </p>
                  <p className="mt-1 text-xs text-fog">
                    {task.duration_minutes}m
                    {task.question_count != null ? ` · ${task.question_count} Q` : ''}
                    {' · '}
                    {task.task_type.replaceAll('_', ' ')}
                  </p>
                </div>
                {!task.completed && (
                  <div className="flex shrink-0 gap-3">
                    <Link
                      href={taskHref(task, profile?.target_test === 'ACT' ? 'ACT' : plan.test_type === 'ACT' ? 'ACT' : 'SAT')}
                      className="text-sm font-medium text-signal"
                    >
                      Start
                    </Link>
                    <button
                      type="button"
                      onClick={() => void markComplete(task.id)}
                      disabled={completingId === task.id}
                      className="text-sm text-fog hover:text-paper"
                    >
                      Done
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {plan.ai_explanation && <p className="text-sm text-fog">{plan.ai_explanation}</p>}
    </div>
  )
}
