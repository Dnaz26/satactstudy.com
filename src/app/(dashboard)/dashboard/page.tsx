import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScoreCard } from '@/components/ui/score-card'
import { TopicCard } from '@/components/ui/topic-card'
import { Companion } from '@/components/ui/companion'
import { EmptyState } from '@/components/ui/empty-state'
import { MasteryBar } from '@/components/ui/mastery-bar'
import { getGreeting, formatDate, daysUntil } from '@/lib/utils'
import { asPrimaryTest, todayISO } from '@/lib/schema'
import { BookOpen, Play, Target } from 'lucide-react'

type TopicMasteryRow = {
  id: string
  topic_id: string
  overall_mastery: number | null
  knowledge_mastery: number | null
  speed_mastery: number | null
  total_attempts: number | null
  correct_attempts: number | null
  total_time_seconds: number | null
  trend: string | null
  topics: { name: string; categories: { name: string } | null } | null
}

type PlanTask = {
  id: string
  topic_id: string | null
  title: string
  target_minutes: number
  target_questions: number | null
  status: string | null
  task_type: string
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = todayISO()

  const [
    { data: profile },
    topicMasteryResult,
    { data: todayPlan },
    { data: latestPrediction },
    { data: usage },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, test_preference, target_score, test_date, subscription_plan')
      .eq('id', user.id)
      .single(),
    supabase
      .from('topic_mastery')
      .select('id, topic_id, overall_mastery, knowledge_mastery, speed_mastery, total_attempts, correct_attempts, total_time_seconds, trend, topics(name, categories(name))')
      .eq('user_id', user.id)
      .order('overall_mastery', { ascending: true })
      .limit(20),
    supabase
      .from('study_plans')
      .select('id, total_minutes, completed_minutes, status')
      .eq('user_id', user.id)
      .eq('plan_date', today)
      .maybeSingle(),
    supabase
      .from('score_predictions')
      .select('predicted_total, score_low, score_high, confidence, ovr_score')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_usage_daily')
      .select('questions_answered, ai_chats_used')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle(),
  ])

  let todayTasks: PlanTask[] = []
  if (todayPlan?.id) {
    const { data: tasks } = await supabase
      .from('study_plan_tasks')
      .select('id, topic_id, title, target_minutes, target_questions, status, task_type')
      .eq('plan_id', todayPlan.id)
      .order('sort_order')
    todayTasks = (tasks ?? []) as PlanTask[]
  }

  const topicMastery = (topicMasteryResult.data ?? []) as unknown as TopicMasteryRow[]
  const greeting = getGreeting()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const daysLeft = profile?.test_date ? daysUntil(profile.test_date) : null
  const completedTasks = todayTasks.filter((t) => t.status === 'completed').length
  const totalTasks = todayTasks.length
  const completedMinutes = todayPlan?.completed_minutes ?? 0
  const totalMinutes = todayPlan?.total_minutes ?? todayTasks.reduce((s, t) => s + t.target_minutes, 0)

  const weakTopics = topicMastery.filter((t) => (t.overall_mastery ?? 50) < 40).slice(0, 3)
  const hasData = topicMastery.length > 0

  function getCompanionMode() {
    if (!hasData) return 'idle' as const
    if (weakTopics.length > 2) return 'struggling' as const
    if (weakTopics.length > 0) return 'warning' as const
    return 'success' as const
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Companion
        mode={getCompanionMode()}
        message={`${greeting}, ${firstName}. ${daysLeft != null ? `${daysLeft} days until test day.` : 'Start with the first task below.'}`}
      />

      {latestPrediction && (
        <ScoreCard
          predicted={latestPrediction.predicted_total}
          target={profile?.target_score ?? null}
          testType={asPrimaryTest(profile?.test_preference)}
          confidence={latestPrediction.confidence}
          scoreLow={latestPrediction.score_low}
          scoreHigh={latestPrediction.score_high}
        />
      )}

      {totalTasks > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tonight</CardTitle>
              <span className="font-mono text-xs text-fog">
                {completedTasks}/{totalTasks} · {completedMinutes}/{totalMinutes} min
              </span>
            </div>
            <Progress value={totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0} color="#FF6B57" className="mt-2" />
          </CardHeader>
          <CardContent className="space-y-2">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between neu-sm px-4 py-3">
                <div>
                  <p className="text-sm text-paper">{task.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
                    {task.target_minutes} min
                    {task.target_questions != null ? ` · ${task.target_questions} questions` : ''}
                  </p>
                </div>
                {task.status !== 'completed' && (
                  <Link href={`/practice?topic=${task.topic_id ?? ''}&taskId=${task.id}`}>
                    <Button size="sm" variant="secondary">Start</Button>
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!hasData ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="Let's find out where you stand."
              description="A short diagnostic gives Nova enough to build your first plan."
            />
            <div className="mt-4 flex justify-center">
              <Link href="/practice">
                <Button size="lg">
                  <Play className="mr-2 h-4 w-4" />
                  Take diagnostic
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {weakTopics.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
                <Target className="h-5 w-5 text-bad" />
                You're struggling with this
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {weakTopics.map((tm) => (
                  <TopicCard
                    key={tm.id}
                    topicName={tm.topics?.name ?? 'Unknown'}
                    categoryName={tm.topics?.categories?.name ?? undefined}
                    mastery={tm.overall_mastery ?? 50}
                    accuracy={(tm.total_attempts ?? 0) > 0 ? (tm.correct_attempts ?? 0) / (tm.total_attempts ?? 1) : 0}
                    trend={(tm.trend as 'improving' | 'stable' | 'declining' | 'neutral') ?? 'neutral'}
                    totalAttempts={tm.total_attempts ?? 0}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Topics</h2>
              <Link href="/analytics" className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">
                Full map
              </Link>
            </div>
            <Card>
              <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {topicMastery.slice(0, 8).map((tm) => (
                  <div key={tm.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs text-fog">{tm.topics?.name ?? 'Topic'}</span>
                      <span className="font-mono text-xs">{Math.round(tm.overall_mastery ?? 50)}</span>
                    </div>
                    <MasteryBar mastery={tm.overall_mastery ?? 50} showPercent={false} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
        Today {usage?.questions_answered ?? 0} questions
        {profile?.test_date ? ` · test ${formatDate(profile.test_date)}` : ''}
      </p>
    </div>
  )
}
