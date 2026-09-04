'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatTimeOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Companion } from '@/components/ui/companion'
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
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-2 pb-10">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Plan progress</span>
          <span className="font-mono text-[10px] text-fog">{doneCount}/{tasks.length} · {progress}%</span>
        </div>
        <div className="h-3 overflow-hidden neu-inset">
          <div className="h-full rounded-full bg-signal transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Companion
        mode={progress >= 70 ? 'success' : tasks.length ? 'studying' : 'idle'}
        message={tasks.length ? `${progress}% of this plan is done.` : 'Tap refresh and I will build your calendar.'}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Plan</h1>
          <p className="mt-1 text-sm text-fog">{window} · {daily} min every day</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void regenerate()} loading={generating}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="neu p-6">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="neu-sm flex h-8 w-8 items-center justify-center" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-display text-xl">{format(month, 'MMMM yyyy')}</p>
          <button type="button" className="neu-sm flex h-8 w-8 items-center justify-center" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center font-mono text-xs uppercase tracking-[0.12em] text-fog">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayTasks = byDate.get(key) ?? []
            const allDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed)
            const logged = logByDate.get(key)
            const done = logged === 'done' || allDone
            const missed = logged === 'missed' || (key < today && dayTasks.length > 0 && !allDone)
            const isSelected = key === selected
            const inMonth = isSameMonth(day, month)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={cn(
                  'min-h-[96px] rounded-[1.15rem] p-3 text-left',
                  isSelected && 'neu-raised text-white',
                  !isSelected && done && 'bg-ok text-white',
                  !isSelected && missed && 'bg-bad text-white',
                  !isSelected && !done && !missed && 'neu-sm',
                  !inMonth && 'opacity-40'
                )}
              >
                <p className={cn('font-display text-lg leading-none', isSameDay(day, new Date()) && !isSelected && 'text-signal')}>
                  {format(day, 'd')}
                </p>
                {dayTasks[0] && (
                  <p className="mt-2 line-clamp-3 text-xs leading-snug">
                    {done ? 'Done' : dayTasks[0].topic_name}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
          {selected === today ? 'Today' : format(new Date(`${selected}T12:00:00`), 'EEE MMM d')} · {window}
        </p>
        {selectedTasks.length === 0 ? (
          <p className="text-sm text-fog">{generating ? 'Building your calendar…' : 'No tasks on this day yet. Tap refresh.'}</p>
        ) : (
          selectedTasks.map((task) => (
            <div
              key={task.id}
              className={cn('flex items-center justify-between rounded-2xl px-4 py-3', task.completed ? 'opacity-50' : 'neu-sm')}
            >
              <div>
                <p className="text-sm text-paper">{task.topic_name}</p>
                <p className="font-mono text-[10px] text-fog">
                  {task.duration_minutes}m{task.question_count != null ? ` · ${task.question_count} Q` : ''} · {task.task_type.replaceAll('_', ' ')}
                </p>
              </div>
              {!task.completed && (
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href={taskHref(task, profile?.target_test === 'ACT' ? 'ACT' : plan.test_type === 'ACT' ? 'ACT' : 'SAT')}>
                      Go
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void markComplete(task.id)} loading={completingId === task.id}>
                    Done
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {plan.ai_explanation && <p className="text-sm text-fog">{plan.ai_explanation}</p>}
    </div>
  )
}
