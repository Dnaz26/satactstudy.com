import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { closerTest, todayISO } from '@/lib/schema'
import { DashboardHome } from './dashboard-home'
import { dailyTargets } from '@/lib/dashboard/pacing'
import { MATH_LEVELS, ENGLISH_LEVELS } from '@/lib/study/levels'
import { asDifficulty } from '@/lib/schema'

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
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 70)
  const since = sixtyDaysAgo.toISOString()

  const [
    { data: profile },
    { data: todayAttempts },
    { data: todayUsage },
    { data: recentAttempts },
    { data: windowAttempts },
    { data: prediction },
    { data: snapshots },
    { data: lessonProgress },
    { data: examProgress },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, test_preference, target_score, test_date, study_minutes_per_day, study_start_time, study_days, current_estimated_score')
      .eq('id', user.id)
      .single(),
    supabase
      .from('attempts')
      .select('time_spent_seconds, correct')
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
    supabase
      .from('attempts')
      .select('created_at, correct, questions(difficulty, section_name)')
      .eq('user_id', user.id)
      .gte('created_at', since)
      .limit(2000),
    supabase
      .from('score_predictions')
      .select('predicted_total, ovr_score, score_low, score_high, confidence')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('performance_snapshots')
      .select('snapshot_date, predicted_total, ovr_score, total_questions, total_correct, study_minutes')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(90),
    supabase
      .from('study_level_progress')
      .select('track, level_index, status, completed_at')
      .eq('user_id', user.id),
    supabase
      .from('user_practice_exams')
      .select('status, completed_questions, correct_count')
      .eq('user_id', user.id),
  ])

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'
  const testType = closerTest({
    preference: profile?.test_preference,
    targetScore: profile?.target_score,
    testDate: profile?.test_date,
  })

  const attemptMinutes = Math.round(((todayAttempts ?? []).reduce((sum, row) => sum + (row.time_spent_seconds ?? 0), 0)) / 60)
  const todayMinutes = Math.max(attemptMinutes, todayUsage?.study_minutes ?? 0)
  const todayPracticeDone = (todayAttempts ?? []).length

  const lessonsDone = (lessonProgress ?? []).filter((row) => row.status === 'completed').length
  const todayLessonsDone = (lessonProgress ?? []).filter((row) => {
    if (row.status !== 'completed' || !row.completed_at) return false
    return row.completed_at.slice(0, 10) === today
  }).length
  const practiceDoneLifetime = (examProgress ?? []).reduce((sum, row) => {
    if (row.status === 'completed') return sum + (row.completed_questions ?? 100)
    return sum + (row.completed_questions ?? 0)
  }, 0)

  const pacing = dailyTargets({
    testDate: profile?.test_date,
    studyDays: profile?.study_days,
    studyMinutesPerDay: profile?.study_minutes_per_day,
    practiceDone: practiceDoneLifetime,
    lessonsDone,
  })

  const practiceDays = new Set((recentAttempts ?? []).map((row) => (row.created_at ?? today).slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  if (!practiceDays.has(today)) cursor.setDate(cursor.getDate() - 1)
  while (practiceDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  const growthPoints = (windowAttempts ?? []).map((row) => {
    const q = row.questions as { difficulty?: string | null; section_name?: string | null } | { difficulty?: string | null }[] | null
    const one = Array.isArray(q) ? q[0] : q
    return {
      at: row.created_at ?? since,
      correct: Boolean(row.correct),
      difficulty: asDifficulty(one?.difficulty),
    }
  })

  const readyRate = prediction?.ovr_score
    ?? (snapshots?.[0]?.ovr_score ?? null)
  const expectedScore = prediction?.predicted_total
    ?? profile?.current_estimated_score
    ?? null

  return (
    <DashboardHome
      firstName={firstName}
      testType={testType}
      studyStart={profile?.study_start_time ?? '19:00'}
      dailyMinutes={profile?.study_minutes_per_day ?? 30}
      todayMinutes={todayMinutes}
      streak={streak}
      testDate={profile?.test_date ?? null}
      targetScore={profile?.target_score ?? null}
      readyRate={readyRate}
      expectedScore={expectedScore}
      scoreLow={prediction?.score_low ?? null}
      scoreHigh={prediction?.score_high ?? null}
      pacing={pacing}
      todayPracticeDone={todayPracticeDone}
      todayLessonsDone={todayLessonsDone}
      lessonsDone={lessonsDone}
      lessonsTotal={MATH_LEVELS.length + ENGLISH_LEVELS.length}
      growthPoints={growthPoints}
      snapshots={(snapshots ?? []).map((s) => ({
        date: s.snapshot_date,
        ovr: s.ovr_score,
        predicted: s.predicted_total,
        correct: s.total_correct,
        total: s.total_questions,
      }))}
    />
  )
}
