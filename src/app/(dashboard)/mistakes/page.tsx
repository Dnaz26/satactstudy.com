import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MistakesList, type MistakeRow } from './mistakes-list'

export default async function MistakesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: raw } = await supabase
    .from('attempts')
    .select('id, selected_answer, mistake_type, created_at, questions(id, question_text, correct_answer, official_explanation, topic_name, topic_id)')
    .eq('user_id', user.id)
    .eq('correct', false)
    .order('created_at', { ascending: false })
    .limit(100)

  const mistakes = (raw ?? []) as unknown as MistakeRow[]

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pt-2 pb-10">
      <h1 className="font-display text-2xl">Misses</h1>
      <MistakesList mistakes={mistakes} />
    </div>
  )
}
