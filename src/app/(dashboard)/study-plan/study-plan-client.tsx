'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatTimeOfDay } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  format,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, Flame, Target } from 'lucide-react'

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
  if (task.task_type === 'lesson') return '/study'
  if (task.task_type === 'rapid_fire') return '/simulator'
  if (task.task_type === 'game') return '/game'
  if (task.task_type === 'practice_test' || task.task_type === 'timed_practice') {
    return `/practice`
  }
  return `/practice/session?testType=${testType}&topicId=${task.topic_id ?? ''}&count=${Math.max(25, task.question_count ?? 25)}&taskId=${task.id}`
}

export function StudyPlanClient({ plan, tasks, profile, dayLogs = [] }: StudyPlanClientProps & { dayLogs?: Array<{ date: string; status: string }> }) {
  const router = useRouter()
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
  const studyWindow = formatTimeOfDay(profile?.study_start_time ?? '19:00')
  const daily = profile?.daily_study_minutes ?? 30
  const doneCount = tasks.filter((t) => t.completed).length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0
  const activeDays = React.useMemo(() => Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(0, 12), [byDate])
  const todayTasks = byDate.get(today) ?? []
  const todayDone = todayTasks.filter((task) => task.completed).length
  const selectedDone = selectedTasks.filter((task) => task.completed).length

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
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-16 pt-0">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Study plan</p>
          <h1 className="font-display text-4xl tracking-tight text-paper">Schedule</h1>
          <p className="mt-2 text-sm text-fog">
            {studyWindow} · {daily} min · {doneCount}/{tasks.length} done · {progress}%
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-black/5 sm:block">
            <motion.div
              className="h-full rounded-full bg-signal"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => void regenerate()} loading={generating} className="text-signal">
            Rebuild
          </Button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-[1fr_.9fr]">
        <article className="rounded-[2rem] bg-white/80 p-5 shadow-[0_18px_45px_rgba(40,24,12,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Today</p>
              <h2 className="mt-1 font-display text-3xl text-paper">{todayDone}/{todayTasks.length || 1} cleared</h2>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal text-white"><Flame className="h-5 w-5" /></span>
          </div>
          <div className="mt-5 grid gap-2">
            <div className="flex items-center justify-between rounded-full bg-panel-2 px-4 py-3 text-sm text-paper"><span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" />Study window</span><b>{studyWindow}</b></div>
            <div className="flex items-center justify-between rounded-full bg-panel-2 px-4 py-3 text-sm text-paper"><span className="inline-flex items-center gap-2"><Target className="h-4 w-4" />Daily goal</span><b>{daily} min</b></div>
            <div className="flex items-center justify-between rounded-full bg-panel-2 px-4 py-3 text-sm text-paper"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Whole plan</span><b>{progress}%</b></div>
          </div>
        </article>

        <article className="rounded-[2rem] bg-paper p-5 text-white shadow-[0_18px_45px_rgba(40,24,12,0.12)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/55">Next study blocks</p>
          <div className="mt-4 flex max-h-52 flex-col gap-2 overflow-y-auto pr-1">
            {activeDays.length ? activeDays.map(([key, dayTasks]) => {
              const done = dayTasks.every((task) => task.completed) || logByDate.get(key) === 'done'
              return <button key={key} type="button" onClick={() => setSelected(key)} className={cn('rounded-full px-4 py-3 text-left text-sm transition', selected === key ? 'bg-white text-paper' : 'bg-white/10 text-white hover:bg-white/15')}>
                <span className="flex items-center justify-between gap-3"><span>{key === today ? 'Today' : format(new Date(`${key}T12:00:00`), 'EEE')}</span><b>{dayTasks.length} task{dayTasks.length === 1 ? '' : 's'} {done ? 'done' : ''}</b></span>
              </button>
            }) : <p className="text-sm text-white/65">No scheduled tasks yet.</p>}
          </div>
        </article>
      </section>

      <section>
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <h2 className="mb-3 font-display text-2xl text-paper">
              {selected === today
                ? `Today · ${selectedDone}/${selectedTasks.length || 1} complete`
                : `${format(new Date(`${selected}T12:00:00`), 'EEEE')} · ${selectedDone}/${selectedTasks.length || 1} complete`}
            </h2>
            {selectedTasks.length === 0 ? (
              <p className="border-y border-line py-6 text-sm text-fog">
                {generating ? 'Building schedule…' : 'No tasks on this day. Tap Rebuild if needed.'}
              </p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {selectedTasks.map((task, i) => (
                  <motion.li
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between gap-4 py-4"
                  >
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
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {plan.ai_explanation && <p className="text-sm text-fog">{plan.ai_explanation}</p>}
    </div>
  )
}
