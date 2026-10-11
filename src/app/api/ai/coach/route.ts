import { createClient } from '@/lib/supabase/server'

type TopicStat = {
  name: string
  section: string
  topicId: string | null
  correct: number
  total: number
  accuracy: number | null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: attempts }, { data: profile }, { data: topics }, { data: prediction }] = await Promise.all([
    supabase.from('attempts').select('question_id, correct').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
    supabase.from('profiles').select('test_preference, target_score, current_estimated_score, test_date').eq('id', user.id).single(),
    supabase.from('topics').select('id, name').order('sort_order', { ascending: true }).limit(80),
    supabase.from('score_predictions').select('predicted_total').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const questionIds = [...new Set((attempts ?? []).map((row) => row.question_id))].slice(0, 200)
  const { data: questions } = questionIds.length
    ? await supabase.from('questions').select('id, topic_id, topic_name, section_name').in('id', questionIds)
    : { data: [] as Array<{ id: string; topic_id: string | null; topic_name: string | null; section_name: string | null }> }

  const byQuestion = new Map((questions ?? []).map((question) => [question.id, question]))
  const stats = new Map<string, TopicStat>()
  for (const attempt of attempts ?? []) {
    const question = byQuestion.get(attempt.question_id)
    const name = question?.topic_name?.trim() || 'General'
    const row = stats.get(name) ?? {
      name,
      section: question?.section_name || 'Math',
      topicId: question?.topic_id ?? null,
      correct: 0,
      total: 0,
      accuracy: null,
    }
    row.total += 1
    if (attempt.correct) row.correct += 1
    row.accuracy = row.total ? row.correct / row.total : 0
    stats.set(name, row)
  }

  const assessed = [...stats.values()]
  const weak = assessed
    .filter((row) => row.total > 0 && (row.accuracy ?? 0) < 0.7)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0) || b.total - a.total)
  const seen = new Set(assessed.map((row) => row.name))
  const unseen = (topics ?? [])
    .filter((topic) => !seen.has(topic.name))
    .slice(0, 8)
    .map((topic): TopicStat => ({
      name: topic.name,
      section: 'Math',
      topicId: topic.id,
      correct: 0,
      total: 0,
      accuracy: null,
    }))

  const answered = (attempts ?? []).length
  const correct = (attempts ?? []).filter((row) => row.correct).length
  const accuracy = answered ? correct / answered : 0
  const coverage = Math.min(1, assessed.length / 12)
  const readiness = Math.round((accuracy * 0.7 + coverage * 0.3) * 100)
  const focus = weak[0] ?? unseen[0] ?? null

  return Response.json({
    weak,
    unseen,
    focus,
    answered,
    correct,
    accuracy,
    readiness,
    predicted: prediction?.predicted_total ?? profile?.current_estimated_score ?? null,
    target: profile?.target_score ?? null,
    preference: profile?.test_preference ?? null,
    testDate: profile?.test_date ?? null,
  })
}
