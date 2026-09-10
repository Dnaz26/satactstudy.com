import { createClient } from '@/lib/supabase/server'

/** Question IDs this user has already used in practice attempts or tutoring. */
export async function getUsedQuestionIds(userId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const [attempts, chats] = await Promise.all([
    supabase.from('attempts').select('question_id').eq('user_id', userId),
    supabase
      .from('ai_conversations')
      .select('question_id')
      .eq('user_id', userId)
      .not('question_id', 'is', null),
  ])

  const used = new Set<string>()
  for (const row of attempts.data ?? []) {
    if (row.question_id) used.add(row.question_id)
  }
  for (const row of chats.data ?? []) {
    if (row.question_id) used.add(row.question_id)
  }
  return used
}

export async function filterUnusedQuestions<T extends { id: string }>(
  userId: string,
  questions: T[],
): Promise<T[]> {
  const used = await getUsedQuestionIds(userId)
  return questions.filter((q) => !used.has(q.id))
}
