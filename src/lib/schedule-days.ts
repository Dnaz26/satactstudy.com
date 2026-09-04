import type { SupabaseClient } from '@supabase/supabase-js'
import { todayISO } from '@/lib/schema'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

export type DayStatus = 'done' | 'missed' | 'planned'

export async function syncStudyDayLogs(
  supabase: Client,
  userId: string,
  tasks: Array<{ date: string; completed: boolean; minutes?: number }>
) {
  const today = todayISO()
  const byDate = new Map<string, { total: number; done: number; minutes: number }>()
  for (const task of tasks) {
    const row = byDate.get(task.date) ?? { total: 0, done: 0, minutes: 0 }
    row.total += 1
    if (task.completed) row.done += 1
    row.minutes += task.minutes ?? 0
    byDate.set(task.date, row)
  }

  const rows = [...byDate.entries()].map(([plan_date, value]) => {
    let status: DayStatus = 'planned'
    if (value.total > 0 && value.done === value.total) status = 'done'
    else if (plan_date < today) status = 'missed'
    return {
      user_id: userId,
      plan_date,
      status,
      minutes_done: value.minutes,
      updated_at: new Date().toISOString(),
    }
  })

  if (!rows.length) return
  await supabase.from('study_day_logs').upsert(rows, { onConflict: 'user_id,plan_date' })
}

export async function markDayFromTasks(
  supabase: Client,
  userId: string,
  planId: string
) {
  const { data: plan } = await supabase
    .from('study_plans')
    .select('id, plan_date')
    .eq('id', planId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!plan) return

  const { data: tasks } = await supabase
    .from('study_plan_tasks')
    .select('status, target_minutes')
    .eq('plan_id', planId)

  const list = (tasks ?? []).map((task) => ({
    date: plan.plan_date,
    completed: task.status === 'completed',
    minutes: task.target_minutes ?? 0,
  }))
  await syncStudyDayLogs(supabase, userId, list)
}
