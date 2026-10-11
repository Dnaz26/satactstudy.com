import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe, syncBillingCustomer, checkoutEmailOnlyParams } from '@/lib/stripe'
import { publicAppUrl } from '@/lib/utils'
import { loadStudyEarnings } from './earnings'

export const CREDIT_PACK_COUNT = 100
export const CREDIT_PACK_CENTS = 100

export async function addStudyCredits(supabase: SupabaseClient, userId: string, credits: number, grantId: string) {
  if (credits <= 0) throw new Error('Credits must be positive.')
  const { error: grantError } = await supabase.from('study_credit_grants').insert({
    id: grantId,
    user_id: userId,
    credits,
  })
  if (grantError) {
    if (grantError.code === '23505') return { credits, alreadyGranted: true as const }
    throw new Error(grantError.message)
  }
  const { data: profile, error: readError } = await supabase.from('profiles').select('study_credits').eq('id', userId).single()
  if (readError) throw new Error(readError.message)
  const next = (profile?.study_credits ?? 0) + credits
  const { error: updateError } = await supabase.from('profiles').update({ study_credits: next, updated_at: new Date().toISOString() }).eq('id', userId)
  if (updateError) throw new Error(updateError.message)
  return { credits: next, alreadyGranted: false as const }
}

export async function spendStudyCredit(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from('profiles').select('study_credits').eq('id', userId).single()
  const next = Math.max(0, (profile?.study_credits ?? 0) - 1)
  await supabase.from('profiles').update({ study_credits: next, updated_at: new Date().toISOString() }).eq('id', userId)
}

export async function convertEarningsToCredits(supabase: SupabaseClient, userId: string) {
  const earnings = await loadStudyEarnings(supabase, userId)
  if (earnings.availableCents < 1) throw new Error('There is no balance to turn into credits.')
  const payoutId = crypto.randomUUID()
  const { error: insertError } = await supabase.from('study_payouts').insert({
    id: payoutId,
    user_id: userId,
    amount_cents: earnings.availableCents,
    status: 'pending',
  })
  if (insertError) throw new Error('A balance change is already in progress. Wait a moment and try again.')
  const { error: statusError } = await supabase.from('study_payouts').update({
    status: 'converted',
    updated_at: new Date().toISOString(),
  }).eq('id', payoutId)
  if (statusError) throw new Error(statusError.message)
  try {
    const granted = await addStudyCredits(supabase, userId, earnings.availableCents, `convert:${payoutId}`)
    return { credits: granted.credits, convertedCents: earnings.availableCents, availableCents: 0 }
  } catch (error) {
    await supabase.from('study_payouts').update({
      status: 'failed',
      failure_reason: 'Credit conversion failed',
      updated_at: new Date().toISOString(),
    }).eq('id', payoutId)
    throw error
  }
}

export async function createCreditCheckout(opts: {
  supabase: SupabaseClient
  userId: string
  email: string | null
  name: string | null
  customerId: string | null
}) {
  const stripe = getStripe()
  const customerId = await syncBillingCustomer(stripe, {
    customerId: opts.customerId,
    email: opts.email,
    name: opts.name,
    userId: opts.userId,
  })
  if (customerId !== opts.customerId) {
    await opts.supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', opts.userId)
  }
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: CREDIT_PACK_CENTS,
        product_data: {
          name: `${CREDIT_PACK_COUNT} extra questions`,
          description: 'Credits for practice beyond the free daily limit. One credit is one extra question.',
        },
      },
    }],
    success_url: `${publicAppUrl()}/settings?credits=return&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${publicAppUrl()}/settings`,
    metadata: {
      supabase_user_id: opts.userId,
      purpose: 'credits',
      credits: String(CREDIT_PACK_COUNT),
    },
    ...checkoutEmailOnlyParams(),
  })
  if (!session.url) throw new Error('Checkout could not be opened.')
  return session.url
}

export async function grantCreditCheckoutSession(supabase: SupabaseClient, userId: string, sessionId: string) {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId) as Stripe.Checkout.Session
  if (session.metadata?.supabase_user_id !== userId) return null
  if (session.metadata?.purpose !== 'credits') return null
  if (session.payment_status !== 'paid') return null
  const credits = Number(session.metadata.credits)
  if (!Number.isFinite(credits) || credits <= 0) return null
  return addStudyCredits(supabase, userId, credits, session.id)
}
