import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { firstIndexInEachCategory } from '@/lib/study/levels'
import { StudyClient } from './study-client'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  for (const track of ['math', 'english'] as const) {
    const { data: existing } = await supabase
      .from('study_level_progress')
      .select('level_index')
      .eq('user_id', user.id)
      .eq('track', track)
    const have = new Set((existing ?? []).map((row) => row.level_index))
    const missing = firstIndexInEachCategory(track).filter((index) => !have.has(index))
    if (missing.length) {
      await supabase.from('study_level_progress').upsert(
        missing.map((level_index) => ({
          user_id: user.id,
          track,
          level_index,
          status: 'available',
          extra_problems: 0,
          updated_at: now,
          completed_at: null,
        })),
        { onConflict: 'user_id,track,level_index' },
      )
    }
  }

  const { data: rows } = await supabase
    .from('study_level_progress')
    .select('track, level_index, status, completed_at')
    .eq('user_id', user.id)

  return <StudyClient initialRows={rows ?? []} />
}
