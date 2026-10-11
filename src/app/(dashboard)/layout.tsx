import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { hasProductAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'
import { CreditOfferPopup } from '@/components/credit-offer-popup'
import { KidShell } from '@/components/kid/kid-shell'
import { TrialEndedChoice } from '@/components/trial-ended-choice'
import { CREDIT_OFFER_CENTS, loadStudyEarnings } from '@/lib/economy/earnings'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_plan, role, onboarding_completed, trial_started_at, trial_ends_at')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  // Free accounts keep limited product access; individual features enforce
  // their own server-side limits while active trials receive premium access.

  const firstName = profile.full_name?.split(' ')[0] ?? 'friend'
  const plan = asPlan(profile.subscription_plan)
  const expiredTrial = plan === 'free' && Boolean(profile.trial_started_at) && Boolean(profile.trial_ends_at) && Date.parse(profile.trial_ends_at as string) <= Date.now()
  const freeUser = !hasProductAccess({ plan, role: profile.role, trialEndsAt: profile.trial_ends_at })
  const earnings = freeUser ? await loadStudyEarnings(supabase, user.id) : null

  return (
    <KidShell firstName={firstName} isAdmin={profile.role === 'admin'}>
      {children}
      {expiredTrial ? <TrialEndedChoice /> : null}
      {earnings && earnings.availableCents > CREDIT_OFFER_CENTS ? <CreditOfferPopup cents={earnings.availableCents} /> : null}
    </KidShell>
  )
}
