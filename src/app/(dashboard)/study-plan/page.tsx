/* eslint-disable react-hooks/purity */
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StudyPlanClient } from './study-plan-client'
import { closerTest, todayISO } from '@/lib/schema'
import { addDays } from 'date-fns'
import { syncStudyDayLogs } from '@/lib/schedule-days'

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()
  const past = addDays(new Date(), -60).toISOString().split('T')[0]
  const horizon = addDays(new Date(), 45).toISOString().split('T')[0]

  const [{ data: plans }, { data: profile }] = await Promise.all([
    supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('plan_date', past)
      .lte('plan_date', horizon)
      .order('plan_date'),
    supabase
      .from('profiles')
      .select('target_score, test_preference, test_date, study_minutes_per_day, study_days, study_start_time, current_estimated_score')
      .eq('id', user.id)
      .single(),
  ])

  const planIds = (plans ?? []).map((p) => p.id)
  const { data: tasks } = planIds.length
    ? await supabase.from('study_plan_tasks').select('*').in('plan_id', planIds).order('sort_order')
    : { data: [] as never[] }

  const mappedTasks = (tasks ?? []).map((t) => {
    const parent = (plans ?? []).find((p) => p.id === t.plan_id)
    return {
      id: t.id,
      date: parent?.plan_date ?? today,
      task_type: t.task_type,
      topic_name: t.title,
      duration_minutes: t.target_minutes,
      question_count: t.target_questions,
      completed: t.status === 'completed',
      topic_id: t.topic_id,
    }
  })

  await syncStudyDayLogs(supabase, user.id, mappedTasks.map((task) => ({
    date: task.date,
    completed: task.completed,
    minutes: task.duration_minutes,
  }))).catch(() => undefined)

  const { data: logs } = await supabase
    .from('study_day_logs')
    .select('plan_date, status')
    .eq('user_id', user.id)
    .gte('plan_date', past)
    .lte('plan_date', horizon)

  const testType = closerTest({
    preference: profile?.test_preference,
    targetScore: profile?.target_score,
    testDate: profile?.test_date,
  })

  return (
    <StudyPlanClient
      plan={{
        id: plans?.[0]?.id ?? '',
        ai_explanation: plans?.[0]?.ai_explanation ?? null,
        test_type: testType,
        target_score: profile?.target_score ?? 0,
        start_date: plans?.[0]?.plan_date ?? today,
        end_date: plans?.[plans.length - 1]?.plan_date ?? today,
      }}
      tasks={mappedTasks}
      dayLogs={(logs ?? []).map((row) => ({ date: row.plan_date, status: row.status }))}
      profile={{
        target_score: profile?.target_score ?? null,
        target_test: testType,
        test_date: profile?.test_date ?? null,
        daily_study_minutes: profile?.study_minutes_per_day ?? 30,
        available_days: profile?.study_days ?? [],
        baseline_score: profile?.current_estimated_score ?? null,
        study_start_time: profile?.study_start_time ?? '19:00',
      }}
    />
  )
}
