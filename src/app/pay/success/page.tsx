import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill'
import { hasPaidAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { session_id: sessionId } = await searchParams
  if (sessionId) {
    try {
      await fulfillCheckoutSession(user.id, sessionId)
    } catch (err) {
      console.error(err)
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_plan, role')
    .eq('id', user.id)
    .single()

  if (hasPaidAccess(asPlan(profile?.subscription_plan), profile?.role)) {
    redirect('/dashboard')
  }

  redirect('/pricing')
}
