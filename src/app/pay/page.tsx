import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { asPlan } from '@/lib/schema'
import { hasPaidAccess } from '@/lib/access'
import { isCheckoutPromo } from '@/lib/plans'
import { isPaidPlanId } from '@/lib/stripe'
import { PayClient } from './pay-client'

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; promo?: string; updated?: string; session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectedFrom=/pay')

  const incoming = await searchParams
  if (incoming.session_id) {
    const { fulfillCheckoutSession } = await import('@/lib/stripe-fulfill')
    await fulfillCheckoutSession(user.id, incoming.session_id).catch(() => undefined)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, role, onboarding_completed, full_name')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  const params = incoming
  const plan = isPaidPlanId(params.plan) ? params.plan : null
  const promo = isCheckoutPromo(params.promo)
  const paid = hasPaidAccess(asPlan(profile?.subscription_plan), profile?.role)

  if (!plan && !paid) {
    redirect('/pricing')
  }

  return (
    <PayClient
      plan={plan}
      promo={promo}
      currentPlan={asPlan(profile?.subscription_plan)}
      updateCard={paid && !plan}
      updated={params.updated === '1'}
      name={profile?.full_name ?? ''}
    />
  )
}
