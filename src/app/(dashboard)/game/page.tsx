import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { examFocus } from '@/lib/schema'
import { GameClient } from './game-client'
import { hasActiveTrial, hasPaidAccess } from '@/lib/access'

export default async function GamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('test_preference, target_score, test_date, subscription_plan, role, trial_ends_at')
    .eq('id', user.id)
    .single()

  const premium = hasPaidAccess(profile?.subscription_plan, profile?.role) || hasActiveTrial(profile?.trial_ends_at)
  return <Suspense fallback={null}><GameClient examFocus={examFocus(profile?.test_preference)} premium={premium} /></Suspense>
}
