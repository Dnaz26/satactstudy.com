import { createClient } from '@/lib/supabase/server'
import { questionChoices } from '@/lib/schema'

export async function getQuestionById(userId: string, questionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('questions')
    .select('id, question_text, choice_a, choice_b, choice_c, choice_d, choice_e, correct_answer, difficulty, topic_id, topic_name, section_name, test_type, official_explanation')
    .eq('id', questionId)
    .eq('approved', true)
    .eq('active', true)
    .maybeSingle()

  if (!data) return null
  void userId
  return {
    ...data,
    choices: questionChoices(data),
  }
}

export async function getStudentMastery(userId: string, topicId?: string | null) {
  if (!topicId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('topic_mastery')
    .select('overall_mastery, knowledge_mastery, speed_mastery, total_attempts, correct_attempts')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .maybeSingle()
  return data
}

export async function getRecentAttempts(userId: string, topicId?: string | null) {
  const supabase = await createClient()
  let query = supabase
    .from('attempts')
    .select('selected_answer, correct, mistake_type, created_at, question_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6)

  if (topicId) {
    const { data: questions } = await supabase
      .from('questions')
      .select('id')
      .eq('topic_id', topicId)
      .limit(40)
    const ids = (questions ?? []).map((q) => q.id)
    if (ids.length) query = query.in('question_id', ids)
  }

  const { data } = await query
  return (data ?? []).map((row) => ({
    selected_answer: row.selected_answer,
    correct: row.correct,
    mistake_type: row.mistake_type,
    created_at: row.created_at,
  }))
}

export async function getRelatedPracticeQuestions(params: {
  topicId?: string | null
  excludeId?: string
}) {
  if (!params.topicId) return []
  const supabase = await createClient()
  let query = supabase
    .from('questions')
    .select('id, question_text, difficulty, topic_name')
    .eq('approved', true)
    .eq('active', true)
    .eq('topic_id', params.topicId)
    .limit(4)

  if (params.excludeId) query = query.neq('id', params.excludeId)
  const { data } = await query
  return data ?? []
}
