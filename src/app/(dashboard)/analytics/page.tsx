import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient, type ScheduleDay, type TopicPercent } from './analytics-client'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: topicMastery },
    { data: profile },
    { data: attempts },
    { data: plans },
  ] = await Promise.all([
    supabase
      .from('topic_mastery')
      .select('id, topic_id, overall_mastery, total_attempts, correct_attempts, topics(name, categories(name, sections(name)))')
      .eq('user_id', user.id)
      .order('overall_mastery'),
    supabase
      .from('profiles')
      .select('target_score, test_preference, test_date, study_minutes_per_day, ui_language')
      .eq('id', user.id)
      .single(),
    supabase
      .from('attempts')
      .select('correct, time_spent_seconds, created_at, hint_used, tutor_used, desmos_used, mistake_type, questions(difficulty, test_type, section_name, category_name, topic_name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase.from('study_plans').select('id, plan_date').eq('user_id', user.id).order('plan_date'),
  ])
  const planIds = (plans ?? []).map((plan) => plan.id)
  const { data: planTasks } = planIds.length
    ? await supabase.from('study_plan_tasks').select('plan_id, status').in('plan_id', planIds)
    : { data: [] as Array<{ plan_id: string; status: string | null }> }
  const taskState = new Map<string, { total: number; done: number }>()
  for (const task of planTasks ?? []) {
    const row = taskState.get(task.plan_id) ?? { total: 0, done: 0 }
    row.total += 1
    if (task.status === 'completed') row.done += 1
    taskState.set(task.plan_id, row)
  }
  const schedule: ScheduleDay[] = (plans ?? []).map((plan) => {
    const row = taskState.get(plan.id) ?? { total: 0, done: 0 }
    return { date: plan.plan_date, done: row.total > 0 && row.done === row.total }
  })

  const topics: TopicPercent[] = ((topicMastery ?? []) as unknown as Array<{
    overall_mastery: number | null
    total_attempts: number | null
    correct_attempts: number | null
    topics?: { name: string; categories?: { name: string; sections?: { name: string } | null } | null } | null
  }>).flatMap((row) => {
    const section = `${row.topics?.categories?.sections?.name ?? ''} ${row.topics?.categories?.name ?? ''}`.toLowerCase()
    const group = section.includes('math') ? 'math' : (section.includes('english') || section.includes('reading') || section.includes('writing') ? 'verbal' : null)
    if (!group || !row.topics?.name) return []
    const percent = (row.total_attempts ?? 0) > 0
      ? Math.round(((row.correct_attempts ?? 0) / (row.total_attempts ?? 1)) * 100)
      : Math.round(row.overall_mastery ?? 0)
    return [{ name: row.topics.name, group, percent }]
  })

  const mappedAttempts = (attempts ?? []).map((a) => {
    const q = a.questions as {
      difficulty?: string | null
      test_type?: string | null
      section_name?: string | null
      category_name?: string | null
      topic_name?: string | null
    } | null
    return {
      is_correct: Boolean(a.correct),
      time_seconds: a.time_spent_seconds ?? 0,
      difficulty: (q?.difficulty ?? 'Medium').toLowerCase(),
      created_at: a.created_at ?? new Date().toISOString(),
      hint_used: Boolean(a.hint_used),
      tutor_used: Boolean(a.tutor_used),
      desmos_used: Boolean(a.desmos_used),
      mistake_type: a.mistake_type,
      test_type: q?.test_type ?? null,
      section_name: q?.section_name ?? null,
      category_name: q?.category_name ?? null,
      topic_name: q?.topic_name ?? null,
    }
  })

  return (
    <AnalyticsClient
      attempts={mappedAttempts}
      schedule={schedule}
      topics={topics}
      language={profile?.ui_language ?? 'en'}
    />
  )
}
