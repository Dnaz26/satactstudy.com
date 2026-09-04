import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasPaidAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'
import { PricingClient } from './pricing-client'

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let loggedIn = false
  if (user) {
    loggedIn = true
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, role, onboarding_completed')
      .eq('id', user.id)
      .single()

    if (profile && !profile.onboarding_completed) {
      redirect('/onboarding')
    }

    if (hasPaidAccess(asPlan(profile?.subscription_plan), profile?.role)) {
      redirect('/dashboard')
    }
  }

  return <PricingClient loggedIn={loggedIn} />
}
