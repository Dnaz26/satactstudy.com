import { createClient, createServiceClient } from '@/lib/supabase/server'
import { grantCreditCheckoutSession } from '@/lib/economy/credits'
import { loadStudyEarnings } from '@/lib/economy/earnings'
import { refreshPayoutAccount } from '@/lib/economy/payouts'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payout?: string; credits?: string; session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const params = await searchParams

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_plan, study_credits, ui_language')
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

  const { data: payoutAccount } = await supabase
    .from('study_payout_accounts')
    .select('stripe_account_id, payouts_enabled, details_submitted')
    .eq('user_id', user.id)
    .maybeSingle()

  if (params.credits === 'return' && params.session_id) {
    const admin = await createServiceClient()
    await grantCreditCheckoutSession(admin, user.id, params.session_id).catch(() => undefined)
  }

  if (params.payout === 'return' && payoutAccount?.stripe_account_id) {
    const admin = await createServiceClient()
    await refreshPayoutAccount(admin, payoutAccount.stripe_account_id).catch(() => undefined)
  }

  const { data: freshAccount } = params.payout === 'return'
    ? await supabase.from('study_payout_accounts').select('payouts_enabled, details_submitted').eq('user_id', user.id).maybeSingle()
    : { data: payoutAccount }
  const earnings = await loadStudyEarnings(supabase, user.id)
  const { data: creditProfile } = params.credits === 'return'
    ? await supabase.from('profiles').select('study_credits').eq('id', user.id).single()
    : { data: profile }

  return (
    <SettingsClient
      name={profile?.full_name ?? ''}
      email={user.email ?? ''}
      plan={profile?.subscription_plan ?? 'free'}
      periodEnd={subscription?.current_period_end ?? null}
      cancelAtPeriodEnd={Boolean(subscription?.cancel_at_period_end)}
      questions={earnings.questions}
      levels={earnings.levels}
      completeWeeks={earnings.completeWeeks}
      creditBalance={creditProfile?.study_credits ?? profile?.study_credits ?? 0}
      availableCents={earnings.availableCents}
      collectedCents={earnings.collectedCents}
      payoutsEnabled={Boolean(freshAccount?.payouts_enabled)}
      payoutNotice={params.payout === 'return' ? 'saved' : params.payout === 'refresh' ? 'retry' : null}
      language={profile?.ui_language ?? 'en'}
    />
  )
}
