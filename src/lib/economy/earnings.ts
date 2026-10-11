import type { SupabaseClient } from '@supabase/supabase-js'
import { todayISO } from '@/lib/schema'

export const QUESTIONS_PER_CENT = 56
export const LEVEL_CENTS = 1
export const WEEK_BONUS_CENTS = 35
export const WEEK_DAYS_REQUIRED = 5
export const MIN_COLLECT_CENTS = 1
export const CREDIT_OFFER_CENTS = 50

export function questionCents(questions: number): number {
  return Math.floor(Math.max(0, questions) / QUESTIONS_PER_CENT)
}

export function weekStartingMonday(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay()
  const delta = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

export function countCompleteWeeks(input: {
  today: string
  days: Array<{ date: string; tasks: number; tasksDone: number }>
}): number {
  const weeks = new Map<string, Array<{ date: string; tasks: number; tasksDone: number }>>()
  for (const day of input.days) {
    if (day.tasks <= 0) continue
    const key = weekStartingMonday(day.date)
    const list = weeks.get(key) ?? []
    list.push(day)
    weeks.set(key, list)
  }
  let complete = 0
  for (const days of weeks.values()) {
    if (days.some((day) => day.date > input.today)) continue
    if (days.some((day) => day.tasksDone < day.tasks)) continue
    const finishedDays = days.filter((day) => day.tasksDone === day.tasks).length
    if (finishedDays >= WEEK_DAYS_REQUIRED) complete += 1
  }
  return complete
}

export function studyEarningsCents(input: { questions: number; levels: number; completeWeeks: number }): number {
  return questionCents(input.questions) + input.levels * LEVEL_CENTS + input.completeWeeks * WEEK_BONUS_CENTS
}

export function dollarsFromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}

export async function loadStudyEarnings(supabase: SupabaseClient, userId: string) {
  const today = todayISO()
  const [{ count: questionCount }, { count: levelCount }, { data: plans }, { data: payouts }] = await Promise.all([
    supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('study_level_progress').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    supabase.from('study_plans').select('id, plan_date').eq('user_id', userId),
    supabase.from('study_payouts').select('amount_cents, status').eq('user_id', userId).in('status', ['pending', 'paid', 'converted']),
  ])
  const planRows = plans ?? []
  const planIds = planRows.map((plan) => plan.id)
  const { data: tasks } = planIds.length
    ? await supabase.from('study_plan_tasks').select('plan_id, status').in('plan_id', planIds)
    : { data: [] as Array<{ plan_id: string; status: string | null }> }
  const byPlan = new Map<string, { tasks: number; tasksDone: number }>()
  for (const task of tasks ?? []) {
    const row = byPlan.get(task.plan_id) ?? { tasks: 0, tasksDone: 0 }
    row.tasks += 1
    if (task.status === 'completed') row.tasksDone += 1
    byPlan.set(task.plan_id, row)
  }
  const days = planRows.map((plan) => {
    const row = byPlan.get(plan.id) ?? { tasks: 0, tasksDone: 0 }
    return { date: plan.plan_date, tasks: row.tasks, tasksDone: row.tasksDone }
  })
  const questions = questionCount ?? 0
  const levels = levelCount ?? 0
  const completeWeeks = countCompleteWeeks({ today, days })
  const { data: profile } = await supabase.from('profiles').select('test_date').eq('id', userId).maybeSingle()
  const daysLeft = profile?.test_date
    ? Math.ceil((new Date(`${profile.test_date}T23:59:59`).getTime() - Date.now()) / 86400000)
    : null
  const crunch = daysLeft != null && daysLeft >= 0 && daysLeft <= 14
  const earnedCents = studyEarningsCents({ questions, levels, completeWeeks }) + (crunch ? questionCents(questions) : 0)
  const reservedCents = (payouts ?? []).reduce((sum, row) => sum + (row.amount_cents ?? 0), 0)
  const collectedCents = (payouts ?? []).filter((row) => row.status === 'paid').reduce((sum, row) => sum + (row.amount_cents ?? 0), 0)
  return {
    questions,
    levels,
    completeWeeks,
    earnedCents,
    collectedCents,
    availableCents: Math.max(0, earnedCents - reservedCents),
  }
}
