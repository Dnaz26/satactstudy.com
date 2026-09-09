import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasProductAccess } from '@/lib/access'
import { isCheckoutPromo } from '@/lib/plans'
import { asPlan } from '@/lib/schema'
import { PricingClient } from './pricing-client'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let loggedIn = false
  let initialPromo = false
  if (user) {
    loggedIn = true
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, role, onboarding_completed, trial_ends_at, billing_promo')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completed) {
      redirect('/onboarding')
    }

    if (hasProductAccess({
      plan: asPlan(profile?.subscription_plan),
      role: profile?.role,
      trialEndsAt: profile?.trial_ends_at,
    })) {
      redirect('/dashboard')
    }

    initialPromo = isCheckoutPromo(profile?.billing_promo)
  }

  return <PricingClient loggedIn={loggedIn} initialPromo={initialPromo} />
}
