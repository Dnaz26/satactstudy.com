'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EXAMS_BEFORE_TEST, lessonsDueToday, msUntil, practiceExamsDueToday, scheduledPracticeExamDates, splitCountdown } from '@/lib/dashboard/pacing'
import { BookOpen, CalendarDays, CheckCircle2, Clock, Flame, Trophy, Zap } from 'lucide-react'

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

type ScheduleTask = {
  id: string
  date: string
  task_type: string | null
  topic_name: string | null
  duration_minutes: number | null
  question_count: number | null
  completed: boolean
  topic_id: string | null
}

function todayISO() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function percent(done: number, total: number) {
  return Math.min(100, Math.max(0, Math.round((done / Math.max(1, total)) * 100)))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isoFromDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function DashboardHome({
  testType,
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
  snapshots,
  scheduleTasks,
  practiceExamsDone,
  masterHref,
  examHref,
  nextLessonTitle = 'your next lesson',
  studyDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  createdAt = null,
  limitedPlan = false,
  planInput = null,
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
  baselineScore: number | null
  pacing: Pacing
  todayPracticeDone: number
  todayLessonsDone: number
  lessonsDone: number
  lessonsTotal: number
  growthPoints: Array<{ at: string; correct: boolean; difficulty: string }>
  snapshots: Snapshot[]
  scheduleTasks: ScheduleTask[]
  practiceExamsDone: number
  masterHref: string
  examHref: string
  nextLessonTitle?: string
  studyDays?: string[]
  createdAt?: string | null
  limitedPlan?: boolean
  planInput?: {
    testDate: string
    testType: string
    targetScore: number
    baselineScore: number | null
    dailyMinutes: number
    availableDays: string[]
  } | null
}) {
  const router = useRouter()
  const [now, setNow] = React.useState(() => Date.now())
  const [selectedDate, setSelectedDate] = React.useState(todayISO)
  const [streakSlot, setStreakSlot] = React.useState<HTMLElement | null>(null)

  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  React.useEffect(() => {
    setStreakSlot(document.getElementById('dash-streak'))
  }, [])

  React.useEffect(() => {
    if (!limitedPlan || !planInput) return
    const oversized = scheduleTasks.some((task) => (
      task.task_type === 'timed_practice'
      || task.task_type === 'vocabulary'
      || task.task_type === 'practice_test'
      || (task.question_count ?? 0) > 12
    ))
    if (!oversized && scheduleTasks.length > 0) return
    const key = 'prep:free-plan-rebuild'
    try {
      if (window.sessionStorage.getItem(key) === '1') return
      window.sessionStorage.setItem(key, '1')
    } catch {
      return
    }
    void fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(planInput),
    }).then((response) => {
      if (response.ok) router.refresh()
    }).catch(() => undefined)
  }, [limitedPlan, planInput, router, scheduleTasks])

  const left = msUntil(testDate, now)
  const parts = splitCountdown(left)
  const todayString = todayISO()
  const calendarDates = React.useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    const first = new Date(today.getFullYear(), today.getMonth(), 1, 12)
    const start = addDays(first, -first.getDay())
    return Array.from({ length: 42 }, (_, index) => addDays(start, index))
  }, [])
  const tasksByDate = React.useMemo(() => {
    const map = new Map<string, ScheduleTask[]>()
    for (const task of scheduleTasks) {
      const list = map.get(task.date) ?? []
      list.push(task)
      map.set(task.date, list)
    }
    return map
  }, [scheduleTasks])
  function dateStatus(date: string) {
    if (date > todayString) return 'future'
    const tasks = tasksByDate.get(date) ?? []
    if (!tasks.length) return 'none'
    return tasks.every((task) => task.completed) ? 'done' : 'missed'
  }
  const topicToMaster = nextLessonTitle
  const rapidFireMinutes = 15
  const daysLeft = testDate ? Math.max(0, Math.ceil(left / 86400000)) : null
  const crunch = daysLeft != null && daysLeft <= 14
  const requiredMinutes = crunch ? Math.max(30, dailyMinutes) * 2 : Math.max(30, dailyMinutes)
  const [planDate, setPlanDate] = React.useState(testDate ?? '')
  const [planMinutes, setPlanMinutes] = React.useState(Math.max(30, dailyMinutes))
  const [planDays, setPlanDays] = React.useState<string[]>(() => {
    const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const picked = names.filter((day) => studyDays.some((saved) => saved.toLowerCase() === day.toLowerCase()))
    return picked.length >= 5 ? picked : names.slice(0, 5)
  })
  const [planNote, setPlanNote] = React.useState('')
  const [planBusy, setPlanBusy] = React.useState(false)
  async function savePlan() {
    if (planDays.length < 5 || planMinutes < 30 || !planDate) {
      setPlanNote('Pick a test day, at least 30 minutes, and at least 5 days.')
      return
    }
    setPlanBusy(true)
    setPlanNote('')
    try {
      const response = await fetch('/api/profile/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testDate: planDate, dailyMinutes: planMinutes, studyDays: planDays }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Could not save')
      setPlanNote('Saved.')
      router.refresh()
    } catch (error) {
      setPlanNote(error instanceof Error ? error.message : 'Could not save')
    } finally {
      setPlanBusy(false)
    }
  }
  const lessonGoal = pacing.lessonsToday
  const examsDue = practiceExamsDueToday({
    today: todayISO(),
    testDate,
    studyDays,
    examsCompleted: practiceExamsDone,
    createdAt,
  })
  const rapidFireRequired = !testDate || todayISO() <= testDate
  const rapidFireDone = todayMinutes >= rapidFireMinutes
  const lessonPctTotal = percent(lessonsDone, Math.max(lessonsTotal, pacing.lessonsTotal))
  const examPct = percent(practiceExamsDone, 3)
  const dailyPct = percent(Math.min(todayMinutes, dailyMinutes), Math.max(dailyMinutes, rapidFireMinutes))
  const overallProgress = Math.round(lessonPctTotal * 0.5 + examPct * 0.35 + dailyPct * 0.15)

  React.useEffect(() => {
    const needsNudge = (rapidFireRequired && todayMinutes < rapidFireMinutes) || (lessonGoal > 0 && todayLessonsDone < lessonGoal)
    if (needsNudge) window.localStorage.setItem('prep:study-nudge', '1')
    else window.localStorage.removeItem('prep:study-nudge')
    window.dispatchEvent(new Event('prep:study-nudge'))
  }, [todayMinutes, todayLessonsDone, lessonGoal, rapidFireRequired])

  const todayChecklist = [
    lessonGoal > 0 ? {
      label: `Tutoring: ${topicToMaster}`,
      detail: lessonGoal === 1
        ? `1 lesson today · ${lessonsDone}/${lessonsTotal} before test day`
        : `${lessonGoal} lessons today · ${lessonsDone}/${lessonsTotal} before test day`,
      href: masterHref,
      cta: 'Start',
      done: todayLessonsDone >= lessonGoal,
      icon: BookOpen,
      face: '#1cb0f6',
      lip: '#1899d6',
    } : null,
    rapidFireRequired ? {
      label: 'Rapid Fire questions for 15 min',
      detail: `${Math.min(todayMinutes, rapidFireMinutes)}/${rapidFireMinutes} min today`,
      href: '/simulator',
      cta: 'Start',
      done: rapidFireDone,
      icon: Zap,
      face: '#ce82ff',
      lip: '#a568d4',
    } : null,
    examsDue > 0 ? {
      label: examsDue === 1 ? 'Practice exam' : `Practice exams · ${examsDue} today`,
      detail: `${Math.min(practiceExamsDone, EXAMS_BEFORE_TEST)}/${EXAMS_BEFORE_TEST} before test day`,
      href: examHref,
      cta: 'Start',
      done: false,
      icon: Trophy,
      face: '#ff9600',
      lip: '#e08600',
    } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  function plannedTasksFor(date: string) {
    const tasks: Array<{ id: string; label: string; kind: string; completed: boolean }> = []
    const lessonsOnDate = date === todayString
      ? lessonGoal
      : lessonsDueToday({
        today: date,
        testDate,
        studyDays,
        lessonsRemaining: Math.max(0, lessonsTotal - lessonsDone),
      })
    if (lessonsOnDate > 0) {
      tasks.push({
        id: 'lesson',
        label: lessonsOnDate === 1 ? `Tutoring: ${topicToMaster}` : `Tutoring: ${topicToMaster} · ${lessonsOnDate} lessons`,
        kind: 'tutoring',
        completed: date === todayString && todayLessonsDone >= lessonsOnDate,
      })
    }
    if (!testDate || date <= testDate) {
      tasks.push({
        id: 'rapid',
        label: 'Rapid Fire questions · 15 min',
        kind: 'every day',
        completed: date === todayString && rapidFireDone,
      })
    }
    const examDates = testDate
      ? scheduledPracticeExamDates({
        testDate,
        studyDays,
        today: todayString,
        examsCompleted: practiceExamsDone,
        createdAt,
      })
      : []
    const examsOnDate = examDates.filter((examDate) => examDate === date).length
    if (examsOnDate > 0 || (date === todayString && examsDue > 0)) {
      tasks.push({
        id: 'exam',
        label: date === todayString && examsDue > 1 ? `Practice exams · ${examsDue} today` : 'Practice exam',
        kind: `${Math.min(practiceExamsDone, EXAMS_BEFORE_TEST)}/${EXAMS_BEFORE_TEST} before test day`,
        completed: false,
      })
    }
    return tasks
  }

  const streakChip = (
    <div className="flex items-center gap-1.5 text-[#ff9600]" aria-label={`${streak} day streak`}>
      <Flame className="h-6 w-6" />
      <span className="font-display text-2xl leading-none text-[#3c3c3c]">{streak}</span>
    </div>
  )

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col overflow-hidden">
      {streakSlot ? createPortal(streakChip, streakSlot) : <div className="mb-2 flex justify-end">{streakChip}</div>}
      <div className="grid min-h-0 flex-1 items-stretch gap-3 overflow-hidden sm:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <section className="flex min-h-0 flex-col overflow-y-auto">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-xl text-[#3c3c3c]">What to do today</p>
              <p className="text-xs font-bold text-[#afafaf]">{todayChecklist.length ? todayChecklist.map((item) => item.label).join(' · ') : 'Nothing else is due today.'}</p>
            </div>
            {readyRate != null && <span className="rounded-2xl bg-[#f7f7f7] px-3 py-2 text-xs font-extrabold text-[#3c3c3c]">Ready {Math.round(readyRate)}%</span>}
          </div>
          {crunch ? (
            <div className="mt-2 rounded-2xl bg-[#fff4e5] px-3 py-2 text-xs font-bold leading-5 text-[#8a4b00]">
              The {testType} is {daysLeft} day{daysLeft === 1 ? '' : 's'} away. Study time is doubled to {requiredMinutes} minutes. Question pay is doubled for these two weeks, and finishing the extra work is what raises the score.
            </div>
          ) : null}
          <div className="mt-2 flex flex-col gap-2">
            {todayChecklist.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 text-white transition active:translate-y-0.5 active:shadow-none"
                  style={{ background: item.face, boxShadow: `0 6px 0 ${item.lip}` }}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base leading-tight">{item.label}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs font-bold text-white/85">{item.detail}</span>
                  </span>
                  {item.done ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold" style={{ color: item.face }}>{item.cta}</span>}
                </Link>
              )
            })}
          </div>
          <form className="mt-3 space-y-2 rounded-2xl bg-[#f7f7f7] p-3" onSubmit={(event) => { event.preventDefault(); void savePlan() }}>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#777]">Test day and study time</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-[#3c3c3c]">
                Test day
                <input type="date" value={planDate} onChange={(event) => setPlanDate(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e5e5e5] bg-white px-2 py-1.5 text-sm" required />
              </label>
              <label className="text-xs font-bold text-[#3c3c3c]">
                Minutes a day
                <input type="number" min={30} max={240} value={planMinutes} onChange={(event) => setPlanMinutes(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-[#e5e5e5] bg-white px-2 py-1.5 text-sm" />
              </label>
            </div>
            <div className="flex flex-wrap gap-1">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                const on = planDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setPlanDays((current) => on ? current.filter((item) => item !== day) : [...current, day])}
                    className={on ? 'rounded-full bg-[#1cb0f6] px-2 py-1 text-[11px] font-extrabold text-white' : 'rounded-full bg-white px-2 py-1 text-[11px] font-extrabold text-[#777]'}
                  >
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-[#777]">30 minutes minimum · 5 days minimum{planNote ? ` · ${planNote}` : ''}</p>
              <button type="submit" disabled={planBusy} className="rounded-full bg-[#58cc02] px-3 py-1 text-xs font-extrabold text-white disabled:opacity-50">{planBusy ? 'Saving' : 'Save'}</button>
            </div>
          </form>
        </section>

        <section className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,rgba(28,176,246,0.10),rgba(255,150,0,0.08))] p-2">
          <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
          <div className="rounded-[1.2rem] border border-white/70 bg-white/35 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#777]">Expected score</p>
            <p className="mt-1 font-display text-4xl leading-none text-[#3c3c3c]">{expectedScore ?? '—'}</p>
            <p className="mt-1 text-xs font-bold text-[#777]">
              {targetScore != null ? `Goal ${targetScore}` : 'Set a goal in Settings'}
              {scoreLow != null && scoreHigh != null ? ` · range ${scoreLow}–${scoreHigh}` : ''}
              {` · ${overallProgress}% through the plan`}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-[1.2rem] border border-white/70 bg-white/35 px-4 py-3 text-sm font-bold text-[#3c3c3c] backdrop-blur-md">
            <Clock className="h-4 w-4 shrink-0 text-[#1cb0f6]" />
            <span>
              {testDate ? `${parts.days}d ${parts.hours}h until the ${testType}` : 'Set a test date'}
              <span className="mt-1 block text-xs font-bold text-[#777]">
                Lessons {lessonsDone}/{lessonsTotal} · Exams {Math.min(practiceExamsDone, EXAMS_BEFORE_TEST)}/{EXAMS_BEFORE_TEST} · Today {todayMinutes}/{requiredMinutes} min
              </span>
            </span>
          </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.3rem] border border-white/70 bg-white/55 p-3 backdrop-blur-md" id="schedule">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-display text-xl text-[#3c3c3c]">Schedule</p>
              <p className="text-xs font-bold text-[#afafaf]">Tap a date to see what to learn.</p>
            </div>
            <span className="flex items-center gap-2 rounded-2xl bg-[#f7f7f7] px-3 py-2 text-sm font-extrabold text-[#3c3c3c]">
              <CalendarDays className="h-4 w-4" />
              {selectedDate}
            </span>
          </div>

          <div className="mt-2 rounded-[1.2rem] bg-[#f7f7f7] p-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#afafaf]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarDates.map((date) => {
                const iso = isoFromDate(date)
                const status = dateStatus(iso)
                const selected = selectedDate === iso
                const inMonth = date.getMonth() === new Date().getMonth()
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={[
                      'h-7 rounded-lg text-xs font-extrabold transition active:scale-95',
                      selected ? 'ring-2 ring-[#1cb0f6] ring-offset-2' : '',
                      status === 'done' ? 'bg-[#58cc02] text-white shadow-[0_3px_0_#46a302]' : '',
                      status === 'missed' ? 'bg-[#ff4b4b] text-white shadow-[0_3px_0_#d93636]' : '',
                      status === 'future' || status === 'none' ? 'bg-white text-[#3c3c3c]' : '',
                      !inMonth && status !== 'done' && status !== 'missed' ? 'opacity-40' : '',
                    ].join(' ')}
                    aria-label={`${iso} ${status}`}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#777]">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#58cc02]" /> complete</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-[#ff4b4b]" /> incomplete</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-white ring-1 ring-[#e5e5e5]" /> upcoming</span>
            </div>
          </div>

          <div className="mt-2 shrink-0 space-y-1">
            {plannedTasksFor(selectedDate).map((task) => (
              <div key={task.id} className="flex items-center gap-2 rounded-xl bg-[#f7f7f7] px-3 py-1.5">
                {task.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[#58cc02]" /> : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#d7d7d7]" />}
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-[#3c3c3c]">{task.label}</p>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#afafaf]">{task.kind}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </section>
      </div>
    </div>
  )
}
