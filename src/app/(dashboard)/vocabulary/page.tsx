import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VocabularyClient } from './vocabulary-client'

export default async function VocabularyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: words } = await supabase
    .from('vocabulary_words')
    .select('id, word, definition, example_sentence, difficulty')
    .eq('active', true)
    .order('difficulty')
    .limit(50)

  const { data: attempts } = await supabase
    .from('vocabulary_attempts')
    .select('word_id, correct, next_review_at')
    .eq('user_id', user.id)

  const attemptMap = new Map(attempts?.map((a) => [a.word_id, a]) ?? [])
  const now = new Date().toISOString()

  const dueWords = words?.filter((w) => {
    const att = attemptMap.get(w.id)
    if (!att) return true
    return !att.next_review_at || att.next_review_at <= now
  }) ?? []

  const mapped = Object.fromEntries(
    [...attemptMap.entries()].map(([id, a]) => [id, { word_id: id, knew_it: a.correct, next_review_at: a.next_review_at ?? now }])
  )

  return <VocabularyClient words={dueWords} allWords={words ?? []} attemptMap={mapped} />
}
