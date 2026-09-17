import { createClient } from '@/lib/supabase/server'
import { predictACTScore, predictSATScore } from '@/lib/score-prediction'
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
      .select('correct, time_spent_seconds, created_at, questions(difficulty, section_name)')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const { data: masteryData } = await supabase
      .from('topic_mastery')
      .select('topic_id, overall_mastery')
      .eq('user_id', user.id)

    const { data: exams } = await supabase
      .from('user_practice_exams')
      .select('status, correct_count, completed_questions, total_questions, format_version, math_correct, rw_correct, completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(6)

    const { count: lessonsCompleted } = await supabase
      .from('study_level_progress')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const mapped = (attempts ?? []).map((a) => {
      const q = a.questions as { difficulty?: string | null; section_name?: string | null } | null
      return {
        is_correct: Boolean(a.correct),
        difficulty: asDifficulty(q?.difficulty),
        time_seconds: a.time_spent_seconds ?? 0,
        section: (q?.section_name ?? '').toLowerCase(),
      }
    })

    const totalQ = mapped.length
    const correctQ = mapped.filter((a) => a.is_correct).length
    const avgMastery = masteryData?.length
      ? masteryData.reduce((s, m) => s + (m.overall_mastery ?? 50), 0) / masteryData.length
      : 0
    const lessonBoost = Math.min(20, (lessonsCompleted ?? 0) * 1.5)
    const tutoringMastery = Math.min(100, avgMastery * 0.85 + lessonBoost)

    const mathAttempts = mapped
      .filter((a) => a.section.includes('math') || (!a.section.includes('read') && !a.section.includes('english') && !a.section.includes('writing')))
      .map(({ is_correct, difficulty, time_seconds }) => ({ is_correct, difficulty, time_seconds }))
    const rwAttempts = mapped
      .filter((a) => a.section.includes('read') || a.section.includes('english') || a.section.includes('writing') || a.section.includes('science'))
      .map(({ is_correct, difficulty, time_seconds }) => ({ is_correct, difficulty, time_seconds }))

    const mathPool = mathAttempts.length
      ? mathAttempts
      : mapped.slice(0, Math.ceil(totalQ / 2)).map(({ is_correct, difficulty, time_seconds }) => ({ is_correct, difficulty, time_seconds }))
    const rwPool = rwAttempts.length
      ? rwAttempts
      : mapped.slice(Math.ceil(totalQ / 2)).map(({ is_correct, difficulty, time_seconds }) => ({ is_correct, difficulty, time_seconds }))

    const practiceScores = (exams ?? [])
      .map((exam) => {
        const total = exam.total_questions ?? exam.completed_questions ?? 0
        const correct = exam.correct_count ?? 0
        if (total <= 0) return null
        const pref = profile?.test_preference ?? 'SAT'
        if (pref === 'ACT') return Math.round((correct / total) * 36)
        // This is a practice estimate, not College Board's calibrated IRT score.
        if (exam.format_version === 2 && exam.math_correct != null && exam.rw_correct != null) {
          return Math.round((400 + 600 * exam.math_correct / 44 + 600 * exam.rw_correct / 54) / 10) * 10
        }
        return Math.round((400 + (correct / total) * 1200) / 10) * 10
      })
      .filter((n): n is number => n != null)

    const pref = profile?.test_preference ?? 'SAT'
    const baseline = profile?.current_estimated_score
    const payload = {
      math_attempts: mathPool,
      reading_writing_attempts: rwPool,
      baseline_score: baseline,
      practice_test_scores: practiceScores,
      tutoring_mastery: tutoringMastery,
    }

    const prediction = pref === 'ACT'
      ? predictACTScore({ ...payload, test_type: 'ACT' })
      : predictSATScore({ ...payload, test_type: 'SAT' })

    await supabase.from('score_predictions').insert({
      user_id: user.id,
      test_type: pref === 'ACT' ? 'ACT' : 'SAT',
      predicted_total: prediction.predicted_total,
      predicted_math: prediction.predicted_math,
      predicted_reading_writing: prediction.predicted_reading_writing,
      score_low: prediction.score_low,
      score_high: prediction.score_high,
      confidence: prediction.confidence >= 0.7 ? 'high' : prediction.confidence >= 0.4 ? 'medium' : 'low',
      ovr_score: prediction.ovr_score,
    })

    const { data: usage } = await supabase
      .from('user_usage_daily')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle()

    const attemptMinutes = Math.round(((attempts ?? [])
      .filter((a) => (a.created_at ?? '').startsWith(today))
      .reduce((sum, row) => sum + (row.time_spent_seconds ?? 0), 0)) / 60)

    await supabase.from('performance_snapshots').upsert({
      user_id: user.id,
      snapshot_date: today,
      test_type: pref,
      predicted_total: prediction.predicted_total,
      ovr_score: prediction.ovr_score ?? Math.round(tutoringMastery),
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
        { onConflict: 'user_id,topic_id,snapshot_date' },
      )
    }

    return Response.json({
      success: true,
      growth_rate_percent: prediction.growth_rate_percent,
      predicted_total: prediction.predicted_total,
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
