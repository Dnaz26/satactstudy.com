import { createClient } from '@/lib/supabase/server'
import { normalizePreferences } from './preferences'
import type { TutorOutput, TutorPreferences, TutorTrigger } from './types'

export { normalizePreferences } from './preferences'

export async function getTutorPreferences(userId: string): Promise<TutorPreferences> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tutor_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return normalizePreferences(userId, data as Partial<TutorPreferences> | null)
}

export async function saveTutorPreferences(userId: string, input: Partial<TutorPreferences>): Promise<TutorPreferences> {
  const supabase = await createClient()
  const existing = await getTutorPreferences(userId)
  const next = normalizePreferences(userId, { ...existing, ...input, user_id: userId })

  const { error } = await supabase.from('tutor_preferences').upsert({
    user_id: userId,
    methods: next.methods,
    analogy_topics: next.analogy_topics,
    custom_interest: next.custom_interest,
    explanation_level: next.explanation_level,
    pacing: next.pacing,
    prefers_visual: next.prefers_visual,
    prefers_socratic: next.prefers_socratic,
    prefers_desmos: next.prefers_desmos,
    prefers_manual_algebra: next.prefers_manual_algebra,
    graph_comfort: next.graph_comfort,
    desmos_guidance: next.desmos_guidance,
    method_scores: next.method_scores,
    updated_at: new Date().toISOString(),
  })

  if (error) throw new Error('Could not save tutor preferences')
  return next
}

export async function recordMisconception(params: {
  userId: string
  topicId?: string | null
  category: string
  note?: string | null
}): Promise<void> {
  const supabase = await createClient()
  const { data: existingRows } = await supabase
    .from('tutor_misconceptions')
    .select('id, occurrences, topic_id')
    .eq('user_id', params.userId)
    .eq('category', params.category)
    .limit(8)

  const existing = (existingRows ?? []).find((row) => (row.topic_id ?? null) === (params.topicId ?? null))

  if (existing?.id) {
    await supabase.from('tutor_misconceptions').update({
      occurrences: (existing.occurrences ?? 1) + 1,
      note: params.note ?? null,
      last_seen_at: new Date().toISOString(),
    }).eq('id', existing.id).eq('user_id', params.userId)
    return
  }

  await supabase.from('tutor_misconceptions').insert({
    user_id: params.userId,
    topic_id: params.topicId ?? null,
    category: params.category,
    note: params.note ?? null,
  })
}

export async function recordTutorInteraction(params: {
  userId: string
  questionId?: string | null
  topicId?: string | null
  trigger: TutorTrigger
  output: TutorOutput
  hintsGiven: number
  latencyMs: number
}): Promise<void> {
  const supabase = await createClient()
  await supabase.from('tutor_interactions').insert({
    user_id: params.userId,
    question_id: params.questionId ?? null,
    topic_id: params.topicId ?? null,
    trigger: params.trigger,
    strategy: params.output.strategy,
    misconception: params.output.misconception,
    confidence: params.output.confidence,
    used_desmos: params.output.desmosActions.length > 0,
    used_simplified_example: params.output.strategy === 'simplified_example',
    hints_given: params.hintsGiven,
    latency_ms: params.latencyMs,
  })
}

export async function bumpMethodScore(userId: string, strategy: string): Promise<void> {
  try {
    const prefs = await getTutorPreferences(userId)
    const scores = { ...prefs.method_scores }
    scores[strategy] = (scores[strategy] ?? 0) + 1
    await saveTutorPreferences(userId, { method_scores: scores })
  } catch {
    // Memory write failure must not break tutoring
  }
}

export async function getRecentMisconceptions(userId: string, topicId?: string | null) {
  const supabase = await createClient()
  let query = supabase
    .from('tutor_misconceptions')
    .select('category, note, occurrences, last_seen_at, topic_id')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(5)

  if (topicId) query = query.eq('topic_id', topicId)
  const { data } = await query
  return data ?? []
}
