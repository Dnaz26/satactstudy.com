import { MATH_LEVELS, ENGLISH_LEVELS } from '@/lib/study/levels'

/** Three full practice runs × 300 questions each before exam day. */
export const PRACTICE_QUESTIONS_BEFORE_EXAM = 3 * 300

export const TOTAL_TUTORING_LESSONS = MATH_LEVELS.length + ENGLISH_LEVELS.length

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export function normalizeStudyDays(days: string[] | null | undefined): string[] {
  if (!days?.length) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  return days.map((d) => d.trim().toLowerCase()).filter(Boolean)
}

/** Count remaining study sessions from today through exam date (inclusive of today if it's a study day). */
export function countStudySessionsUntilExam(
  testDate: string | null | undefined,
  studyDays: string[] | null | undefined,
  from = new Date(),
): number {
  if (!testDate) return 30
  const end = new Date(`${testDate}T23:59:59`)
  if (Number.isNaN(end.getTime()) || end.getTime() <= from.getTime()) return 1

  const allowed = new Set(normalizeStudyDays(studyDays))
  let count = 0
  const cursor = new Date(from)
  cursor.setHours(12, 0, 0, 0)
  const last = new Date(end)
  last.setHours(12, 0, 0, 0)

  while (cursor.getTime() <= last.getTime()) {
    const name = DAY_NAMES[cursor.getDay()]
    if (allowed.has(name)) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return Math.max(1, count)
}

/**
 * Scale daily load by study minutes: baseline 30 min/night.
 * More minutes → slightly fewer sessions needed feel, but we keep total volume fixed
 * and only report minutes-aware daily targets (longer nights can absorb more).
 */
export function dailyTargets(opts: {
  testDate: string | null | undefined
  studyDays: string[] | null | undefined
  studyMinutesPerDay: number | null | undefined
  practiceDone?: number
  lessonsDone?: number
}) {
  const sessions = countStudySessionsUntilExam(opts.testDate, opts.studyDays)
  const minutes = Math.max(15, opts.studyMinutesPerDay ?? 30)
  const minuteFactor = minutes / 30

  const practiceRemaining = Math.max(0, PRACTICE_QUESTIONS_BEFORE_EXAM - (opts.practiceDone ?? 0))
  const lessonsRemaining = Math.max(0, TOTAL_TUTORING_LESSONS - (opts.lessonsDone ?? 0))

  const practicePerSession = Math.max(1, Math.ceil(practiceRemaining / sessions))
  const lessonsPerSession = Math.max(1, Math.ceil(lessonsRemaining / sessions))

  // If they study longer nights, raise today's recommended batch (still finish by exam).
  const practiceToday = Math.max(1, Math.round(practicePerSession * Math.min(2, Math.max(0.75, minuteFactor))))
  const lessonsToday = Math.max(1, Math.round(lessonsPerSession * Math.min(2, Math.max(0.75, minuteFactor))))

  return {
    sessionsLeft: sessions,
    practiceTotal: PRACTICE_QUESTIONS_BEFORE_EXAM,
    practiceRemaining,
    practiceToday,
    lessonsTotal: TOTAL_TUTORING_LESSONS,
    lessonsRemaining,
    lessonsToday,
    studyMinutesPerDay: minutes,
    studyDaysPerWeek: normalizeStudyDays(opts.studyDays).length,
  }
}

export function msUntil(dateIso: string | null | undefined, now = Date.now()): number {
  if (!dateIso) return 0
  const end = new Date(`${dateIso}T23:59:59`).getTime()
  if (Number.isNaN(end)) return 0
  return Math.max(0, end - now)
}

export function splitCountdown(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  return { days, hours, minutes, seconds, totalSec }
}
