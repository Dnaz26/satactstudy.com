import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGreeting } from '@/lib/utils'
import { closerTest, todayISO } from '@/lib/schema'
import { DashboardHome } from './dashboard-home'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  if (params.session_id) {
    const { fulfillCheckoutSession } = await import('@/lib/stripe-fulfill')
    await fulfillCheckoutSession(user.id, params.session_id).catch(() => undefined)
  }

  const today = todayISO()
  const dayStart = `${today}T00:00:00.000Z`

  const [
    { data: profile },
    { data: todayPlan },
    { data: todayAttempts },
    { data: todayUsage },
    { data: recentAttempts },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, test_preference, target_score, test_date, study_minutes_per_day, study_start_time')
      .eq('id', user.id)
      .single(),
    supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle(),
    supabase
      .from('attempts')
      .select('time_spent_seconds')
      .eq('user_id', user.id)
      .gte('created_at', dayStart),
    supabase
      .from('user_usage_daily')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle(),
    supabase
      .from('attempts')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(400),
  ])

  let todayTasks: Array<{ id: string; title: string; minutes: number; topicId: string | null; done: boolean; kind: string }> = []
  if (todayPlan?.id) {
    const { data: tasks } = await supabase
      .from('study_plan_tasks')
      .select('id, topic_id, title, target_minutes, status, task_type')
      .eq('plan_id', todayPlan.id)
      .order('sort_order')
    todayTasks = (tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      minutes: t.target_minutes,
      topicId: t.topic_id,
      done: t.status === 'completed',
      kind: t.task_type,
    }))
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const testType = closerTest({
    preference: profile?.test_preference,
    targetScore: profile?.target_score,
    testDate: profile?.test_date,
  })
  const attemptMinutes = Math.round(((todayAttempts ?? []).reduce((sum, row) => sum + (row.time_spent_seconds ?? 0), 0)) / 60)
  const todayMinutes = Math.max(attemptMinutes, todayUsage?.study_minutes ?? 0)
  const nextOpen = todayTasks.find((task) => !task.done)
  const greeting = `${getGreeting()}, ${firstName}. ${todayMinutes > 0 ? `I have ${todayMinutes} minute${todayMinutes === 1 ? '' : 's'} on your timer.` : nextOpen ? 'One task is waiting. I will time it.' : 'A 60-question sheet is ready.'}`

  const practiceDays = new Set((recentAttempts ?? []).map((row) => (row.created_at ?? today).slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  if (!practiceDays.has(today)) cursor.setDate(cursor.getDate() - 1)
  while (practiceDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return (
    <DashboardHome
      greeting={greeting}
      companionMode={nextOpen ? 'warning' : todayMinutes > 0 ? 'success' : 'idle'}
      firstName={firstName}
      testType={testType}
      studyStart={profile?.study_start_time ?? '19:00'}
      dailyMinutes={profile?.study_minutes_per_day ?? 30}
      todayMinutes={todayMinutes}
      todayTasks={todayTasks}
      streak={streak}
    />
  )
}
