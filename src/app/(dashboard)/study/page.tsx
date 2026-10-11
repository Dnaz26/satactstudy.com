import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { firstIndexInEachCategory } from '@/lib/study/levels'
import { StudyClient } from './study-client'
import { getAccessProfile } from '@/lib/entitlements'
import { hasActiveTrial, hasPaidAccess } from '@/lib/access'
import { examFocus } from '@/lib/schema'

export default async function StudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const access = await getAccessProfile(user.id)
  if (!hasPaidAccess(access.plan, access.role) && !hasActiveTrial(access.trialEndsAt)) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase.from('study_level_progress').select('level_index', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed').gte('completed_at', weekAgo)
    if ((count ?? 0) >= 1) redirect('/pricing?reason=weekly-lesson')
  }

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

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from('study_level_progress')
      .select('track, level_index, status, completed_at')
      .eq('user_id', user.id),
    supabase.from('profiles').select('test_preference').eq('id', user.id).single(),
  ])

  return <StudyClient initialRows={rows ?? []} examFocus={examFocus(profile?.test_preference)} />
}
