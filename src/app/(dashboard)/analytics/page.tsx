import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'
import { asPrimaryTest } from '@/lib/schema'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: snapshots },
    { data: topicMastery },
    { data: predictions },
    { data: profile },
    { data: attempts },
  ] = await Promise.all([
    supabase
      .from('performance_snapshots')
      .select('snapshot_date, predicted_total, ovr_score, total_questions, total_correct, study_minutes')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true })
      .limit(30),
    supabase
      .from('topic_mastery')
      .select('id, topic_id, overall_mastery, knowledge_mastery, speed_mastery, total_attempts, correct_attempts, total_time_seconds, trend, topics(name, categories(name))')
      .eq('user_id', user.id)
      .order('overall_mastery'),
    supabase
      .from('score_predictions')
      .select('*')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('target_score, test_preference, test_date')
      .eq('id', user.id)
      .single(),
    supabase
      .from('attempts')
      .select('correct, time_spent_seconds, created_at, questions(difficulty)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  const mappedSnapshots = (snapshots ?? []).map((s) => ({
    date: s.snapshot_date,
    predicted_sat: s.predicted_total,
    predicted_act: null,
    ovr_score: s.ovr_score,
    accuracy: (s.total_questions ?? 0) > 0 ? (s.total_correct ?? 0) / (s.total_questions ?? 1) : 0,
    total_questions: s.total_questions ?? 0,
    study_time_minutes: s.study_minutes ?? 0,
  }))

  const mappedMastery = ((topicMastery ?? []) as unknown as Array<{
    id: string
    topic_id: string
    overall_mastery: number | null
    knowledge_mastery: number | null
    speed_mastery: number | null
    total_attempts: number | null
    correct_attempts: number | null
    total_time_seconds: number | null
    trend: string | null
    topics?: { name: string; categories?: { name: string } | null } | null
  }>).map((m) => ({
    id: m.id,
    topic_id: m.topic_id,
    overall_mastery: m.overall_mastery ?? 50,
    knowledge_mastery: m.knowledge_mastery ?? 50,
    speed_mastery: m.speed_mastery ?? 50,
    total_attempts: m.total_attempts ?? 0,
    correct_attempts: m.correct_attempts ?? 0,
    avg_time_seconds: (m.total_attempts ?? 0) > 0 ? Math.round((m.total_time_seconds ?? 0) / (m.total_attempts ?? 1)) : 0,
    trend: m.trend ?? 'neutral',
    topics: m.topics ?? null,
  }))

  const mappedAttempts = (attempts ?? []).map((a) => {
    const q = a.questions as { difficulty?: string | null } | null
    return {
      is_correct: Boolean(a.correct),
      time_seconds: a.time_spent_seconds ?? 0,
      difficulty: q?.difficulty ?? 'Medium',
      created_at: a.created_at ?? new Date().toISOString(),
    }
  })

  const mappedPrediction = predictions
    ? {
        predicted_total: predictions.predicted_total ?? 0,
        score_low: predictions.score_low ?? 0,
        score_high: predictions.score_high ?? 0,
        confidence: predictions.confidence === 'high' ? 0.8 : predictions.confidence === 'medium' ? 0.5 : 0.2,
        ovr_score: predictions.ovr_score ?? 50,
        predicted_math: predictions.predicted_math,
        predicted_reading_writing: predictions.predicted_reading_writing,
      }
    : null

  return (
    <AnalyticsClient
      snapshots={mappedSnapshots}
      topicMastery={mappedMastery}
      latestPrediction={mappedPrediction}
      profile={{
        target_score: profile?.target_score ?? null,
        target_test: asPrimaryTest(profile?.test_preference),
        test_date: profile?.test_date ?? null,
      }}
      recentAttempts={mappedAttempts}
    />
  )
}
