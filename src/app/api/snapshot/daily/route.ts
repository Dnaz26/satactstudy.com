import { createClient } from '@/lib/supabase/server'
import { predictSATScore } from '@/lib/score-prediction'
import { asDifficulty, todayISO } from '@/lib/schema'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const today = todayISO()

    const { data: profile } = await supabase
      .from('profiles')
      .select('test_preference, current_estimated_score')
      .eq('id', user.id)
      .single()

    const { data: attempts } = await supabase
      .from('attempts')
      .select('correct, time_spent_seconds, created_at, questions(difficulty)')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const { data: masteryData } = await supabase
      .from('topic_mastery')
      .select('topic_id, overall_mastery')
      .eq('user_id', user.id)

    const mapped = (attempts ?? []).map((a) => {
      const q = a.questions as { difficulty?: string | null } | null
      return {
        is_correct: Boolean(a.correct),
        difficulty: asDifficulty(q?.difficulty),
        time_seconds: a.time_spent_seconds ?? 0,
      }
    })

    const totalQ = mapped.length
    const correctQ = mapped.filter((a) => a.is_correct).length
    const avgMastery = masteryData?.length
      ? masteryData.reduce((s, m) => s + (m.overall_mastery ?? 50), 0) / masteryData.length
      : 0

    const mathAttempts = mapped.slice(0, Math.floor(totalQ / 2))
    const rwAttempts = mapped.slice(Math.floor(totalQ / 2))

    let prediction = null
    const pref = profile?.test_preference ?? 'SAT'
    if (pref === 'SAT' || pref === 'Both') {
      prediction = predictSATScore({
        test_type: 'SAT',
        math_attempts: mathAttempts,
        reading_writing_attempts: rwAttempts,
        baseline_score: profile?.current_estimated_score,
      })

      await supabase.from('score_predictions').insert({
        user_id: user.id,
        test_type: 'SAT',
        predicted_total: prediction.predicted_total,
        predicted_math: prediction.predicted_math,
        predicted_reading_writing: prediction.predicted_reading_writing,
        score_low: prediction.score_low,
        score_high: prediction.score_high,
        confidence: prediction.confidence >= 0.7 ? 'high' : prediction.confidence >= 0.4 ? 'medium' : 'low',
        ovr_score: prediction.ovr_score,
      })
    }

    const { data: usage } = await supabase
      .from('user_usage_daily')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle()

    const attemptMinutes = Math.round(((attempts ?? []).filter((a) => (a.created_at ?? '').startsWith(today)).reduce((sum, row) => sum + (row.time_spent_seconds ?? 0), 0)) / 60)

    await supabase.from('performance_snapshots').upsert({
      user_id: user.id,
      snapshot_date: today,
      test_type: pref,
      predicted_total: prediction?.predicted_total ?? null,
      ovr_score: prediction?.ovr_score ?? Math.round(avgMastery),
      total_questions: totalQ,
      total_correct: correctQ,
      study_minutes: Math.max(usage?.study_minutes ?? 0, attemptMinutes),
    }, { onConflict: 'user_id,snapshot_date,test_type' })

    if (masteryData?.length) {
      await supabase.from('topic_daily_snapshots').upsert(
        masteryData.map((m) => ({
          user_id: user.id,
          topic_id: m.topic_id,
          snapshot_date: today,
          overall_mastery: m.overall_mastery,
        })),
        { onConflict: 'user_id,topic_id,snapshot_date' }
      )
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
