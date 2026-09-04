import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_plan')
    .eq('id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <SettingsClient
      name={profile?.full_name ?? ''}
      email={user.email ?? ''}
      plan={profile?.subscription_plan ?? 'free'}
      periodEnd={subscription?.current_period_end ?? null}
      cancelAtPeriodEnd={Boolean(subscription?.cancel_at_period_end)}
    />
  )
}
