import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StudyPlanClient } from './study-plan-client'
import { Calendar } from 'lucide-react'
import { todayISO } from '@/lib/schema'

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [{ data: plans }, { data: profile }] = await Promise.all([
    supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .gte('plan_date', today)
      .lte('plan_date', weekOut)
      .order('plan_date'),
    supabase
      .from('profiles')
      .select('target_score, test_preference, test_date, study_minutes_per_day, study_days, current_estimated_score')
      .eq('id', user.id)
      .single(),
  ])

  const activePlan = plans?.[0]
  if (!activePlan) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-display text-2xl">Study plan</h1>
        <Card>
          <CardContent>
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No plan yet"
              description="Finish onboarding or generate a plan from settings."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const planIds = (plans ?? []).map((p) => p.id)
  const { data: tasks } = await supabase
    .from('study_plan_tasks')
    .select('*')
    .in('plan_id', planIds)
    .order('sort_order')

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

  return (
    <StudyPlanClient
      plan={{
        id: activePlan.id,
        ai_explanation: activePlan.ai_explanation,
        test_type: profile?.test_preference ?? 'SAT',
        target_score: profile?.target_score ?? 0,
        start_date: activePlan.plan_date,
        end_date: plans?.[plans.length - 1]?.plan_date ?? activePlan.plan_date,
      }}
      tasks={mappedTasks}
      profile={{
        target_score: profile?.target_score ?? null,
        target_test: profile?.test_preference ?? 'SAT',
        test_date: profile?.test_date ?? null,
        daily_study_minutes: profile?.study_minutes_per_day ?? 30,
        available_days: profile?.study_days ?? [],
        baseline_score: profile?.current_estimated_score ?? null,
      }}
    />
  )
}
