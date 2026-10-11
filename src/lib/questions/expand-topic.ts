import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'

type QueryClient = { from: (table: string) => any }

/**
 * Historical callers use this helper before a topic drill. It is deliberately
 * read-only: a request must never manufacture and approve unreviewed questions.
 */
export async function ensureTopicQuestionCount(
  supabase: QueryClient,
  topicId: string,
  _minimum = MIN_TOPIC_QUESTIONS,
): Promise<number> {
  const { count, error } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('approved', true)
    .eq('active', true)

  if (error) throw new Error(`Could not check topic question count: ${error.message}`)
  return count ?? 0
}
