import { createClient } from '@/lib/supabase/server'
import { todayISO } from '@/lib/schema'
import { minutesFromSeconds } from './clock'

export { formatStudyClock, minutesFromSeconds } from './clock'

export async function recordStudySeconds(userId: string, seconds: number): Promise<number> {
  const add = minutesFromSeconds(seconds)
  if (add <= 0) return 0

  const supabase = await createClient()
  const today = todayISO()

  const { data: existing } = await supabase
    .from('user_usage_daily')
    .select('id, study_minutes')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle()

  const next = (existing?.study_minutes ?? 0) + add
  if (existing) {
    await supabase
      .from('user_usage_daily')
      .update({ study_minutes: next, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_usage_daily').insert({
      user_id: userId,
      usage_date: today,
      questions_answered: 0,
      ai_chats_used: 0,
      study_minutes: next,
    })
  }

  await supabase.from('performance_snapshots').upsert({
    user_id: userId,
    snapshot_date: today,
    test_type: 'SAT',
    study_minutes: next,
  }, { onConflict: 'user_id,snapshot_date,test_type' })

  return next
}
