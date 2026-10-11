import { MATH_LEVELS, ENGLISH_LEVELS } from '@/lib/study/levels'

/** Three full practice runs × 300 questions each before exam day. */
export const PRACTICE_QUESTIONS_BEFORE_EXAM = 3 * 300

/** Finished practice exams required before test day. */
export const EXAMS_BEFORE_TEST = 4

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

function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function isoFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addISODays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return isoFromDate(date)
}

export function studyDatesBetween(startISO: string, endISO: string, studyDays: string[] | null | undefined): string[] {
  if (!startISO || !endISO || endISO < startISO) return []
  const allowed = new Set(normalizeStudyDays(studyDays))
  const dates: string[] = []
  const cursor = parseISODate(startISO)
  const end = parseISODate(endISO)
  while (cursor.getTime() <= end.getTime()) {
    if (allowed.has(DAY_NAMES[cursor.getDay()])) dates.push(isoFromDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/** Study days from today through the day before the test. */
export function studyDatesBeforeTest(
  testDate: string | null | undefined,
  studyDays: string[] | null | undefined,
  today: string,
): string[] {
  if (!testDate || today >= testDate) return []
  return studyDatesBetween(today, addISODays(testDate, -1), studyDays)
}

/**
 * Prep window used to place the four exams. Anchored to the test date so the
 * dates do not slide forward every morning. At most 18 weeks before the test.
 */
export function examWindowStart(testDate: string, today: string, createdAt?: string | null): string {
  const lastDay = addISODays(testDate, -1)
  const capped = addISODays(testDate, -126)
  const created = createdAt?.slice(0, 10)
  let start = capped
  if (created && created <= today && created > capped) start = created
  return start > lastDay ? lastDay : start
}

function spreadExamDates(dates: string[], count: number): string[] {
  if (count <= 0) return []
  if (!dates.length) return []
  const picks: string[] = []
  for (let exam = 1; exam <= count; exam += 1) {
    const index = Math.min(dates.length - 1, Math.ceil((exam * dates.length) / count) - 1)
    const date = dates[index]
    if (date) picks.push(date)
  }
  return picks
}

/** Stable exam days for the four required practice exams. Includes dates already passed. */
export function scheduledPracticeExamDates(input: {
  testDate: string
  studyDays: string[] | null | undefined
  today: string
  examsCompleted?: number
  createdAt?: string | null
}): string[] {
  const lastDay = addISODays(input.testDate, -1)
  const allDates = studyDatesBetween(examWindowStart(input.testDate, input.today, input.createdAt), lastDay, input.studyDays)
  return spreadExamDates(allDates, EXAMS_BEFORE_TEST)
}

/**
 * How many of the four exams are due today.
 * Future dates stay hidden. A missed date is due on the next study day.
 * Several can be due on one day when there are not enough study days left.
 */
export function practiceExamsDueToday(input: {
  today: string
  testDate: string | null | undefined
  studyDays: string[] | null | undefined
  examsCompleted: number
  createdAt?: string | null
}): number {
  const completed = Math.max(0, input.examsCompleted)
  const remaining = Math.max(0, EXAMS_BEFORE_TEST - completed)
  if (remaining === 0 || !input.testDate) return 0
  const testDate = input.testDate
  if (input.today >= testDate) return remaining
  const lastDay = addISODays(testDate, -1)
  const unfinished = scheduledPracticeExamDates({ ...input, testDate }).slice(Math.min(completed, EXAMS_BEFORE_TEST))
  const onToday = unfinished.filter((date) => date === input.today).length
  const missed = unfinished.filter((date) => date < input.today).length
  if (!missed) return onToday
  const studyDaysLeft = studyDatesBetween(input.today, lastDay, input.studyDays)
  if (studyDaysLeft[0] !== input.today) return onToday
  const afterToday = studyDaysLeft.length - 1
  const catchUp = Math.max(1, missed - afterToday)
  return Math.min(remaining, onToday + catchUp)
}

/** Lessons required today so every lesson is finished on a study day before the test. Can be more than 1. */
export function lessonsDueToday(input: {
  today: string
  testDate: string | null | undefined
  studyDays: string[] | null | undefined
  lessonsRemaining: number
}): number {
  const remaining = Math.max(0, input.lessonsRemaining)
  if (remaining === 0) return 0
  if (!input.testDate) {
    const todayName = DAY_NAMES[parseISODate(input.today).getDay()]
    return normalizeStudyDays(input.studyDays).includes(todayName) ? 1 : 0
  }
  if (input.today >= input.testDate) return remaining
  const sessions = studyDatesBeforeTest(input.testDate, input.studyDays, input.today)
  if (!sessions.length || sessions[0] !== input.today) return sessions.length ? 0 : remaining
  return Math.ceil(remaining / sessions.length)
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
  today?: string
}) {
  const today = opts.today ?? isoFromDate(new Date())
  const sessions = Math.max(1, studyDatesBeforeTest(opts.testDate, opts.studyDays, today).length || countStudySessionsUntilExam(opts.testDate, opts.studyDays))
  const minutes = Math.max(30, opts.studyMinutesPerDay ?? 30)
  const minuteFactor = minutes / 30

  const practiceRemaining = Math.max(0, PRACTICE_QUESTIONS_BEFORE_EXAM - (opts.practiceDone ?? 0))
  const lessonsRemaining = Math.max(0, TOTAL_TUTORING_LESSONS - (opts.lessonsDone ?? 0))

  const practicePerSession = Math.max(1, Math.ceil(practiceRemaining / sessions))
  const lessonsToday = lessonsDueToday({
    today,
    testDate: opts.testDate,
    studyDays: opts.studyDays,
    lessonsRemaining,
  })

  const practiceToday = Math.max(1, Math.round(practicePerSession * Math.min(2, Math.max(0.75, minuteFactor))))

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
