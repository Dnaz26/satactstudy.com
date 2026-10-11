import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { publicAppUrl } from '@/lib/utils'
import { MIN_COLLECT_CENTS, loadStudyEarnings } from './earnings'

type PayoutAccount = {
  user_id: string
  stripe_account_id: string
  payouts_enabled: boolean
  details_submitted: boolean
}

function appUrl() {
  return publicAppUrl()
}

export async function refreshPayoutAccount(supabase: SupabaseClient, accountId: string) {
  const stripe = getStripe()
  const account = await stripe.accounts.retrieve(accountId)
  await supabase.from('study_payout_accounts').update({
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    updated_at: new Date().toISOString(),
  }).eq('stripe_account_id', accountId)
  return account
}

async function onboardingLink(stripe: Stripe, accountId: string) {
  const origin = appUrl()
  return stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}/settings?payout=refresh`,
    return_url: `${origin}/settings?payout=return`,
    collection_options: { fields: 'eventually_due' },
  })
}

async function ensurePayoutAccount(supabase: SupabaseClient, userId: string, email: string | null, name: string | null): Promise<PayoutAccount> {
  const { data: existing } = await supabase
    .from('study_payout_accounts')
    .select('user_id, stripe_account_id, payouts_enabled, details_submitted')
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return existing

  const stripe = getStripe()
  const account = await stripe.accounts.create({
    country: 'US',
    email: email ?? undefined,
    business_type: 'individual',
    default_currency: 'usd',
    capabilities: { transfers: { requested: true } },
    controller: {
      stripe_dashboard: { type: 'express' },
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      requirement_collection: 'stripe',
    },
    business_profile: {
      product_description: 'Study earnings paid for completed SAT and ACT practice.',
      name: name ?? undefined,
    },
    metadata: { supabase_user_id: userId },
  })
  const row: PayoutAccount = {
    user_id: userId,
    stripe_account_id: account.id,
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
  }
  const { error } = await supabase.from('study_payout_accounts').insert(row)
  if (error) throw new Error(error.message)
  return row
}

export async function collectStudyEarnings(supabase: SupabaseClient, userId: string, email: string | null, name: string | null) {
  const earnings = await loadStudyEarnings(supabase, userId)
  const account = await ensurePayoutAccount(supabase, userId, email, name)
  const stripe = getStripe()
  const live = await refreshPayoutAccount(supabase, account.stripe_account_id)
  const ready = Boolean(live.payouts_enabled)

  if (!ready) {
    const link = await onboardingLink(stripe, account.stripe_account_id)
    return { url: link.url, availableCents: earnings.availableCents, payoutsEnabled: false as const }
  }

  if (earnings.availableCents < MIN_COLLECT_CENTS) {
    throw new Error(`Collection starts at $${(MIN_COLLECT_CENTS / 100).toFixed(2)}. You can collect $${(earnings.availableCents / 100).toFixed(2)} once you reach that.`)
  }

  const payoutId = crypto.randomUUID()
  const { error: insertError } = await supabase.from('study_payouts').insert({
    id: payoutId,
    user_id: userId,
    amount_cents: earnings.availableCents,
    status: 'pending',
  })
  if (insertError) throw new Error('A collection is already in progress. Wait a moment and try again.')

  try {
    const transfer = await stripe.transfers.create({
      amount: earnings.availableCents,
      currency: 'usd',
      destination: account.stripe_account_id,
      description: 'Prep SAT/ACT study earnings',
      metadata: { supabase_user_id: userId, payout_id: payoutId },
    }, { idempotencyKey: payoutId })
    await supabase.from('study_payouts').update({
      status: 'paid',
      stripe_transfer_id: transfer.id,
      updated_at: new Date().toISOString(),
    }).eq('id', payoutId)
    return { collectedCents: earnings.availableCents, availableCents: 0, payoutsEnabled: true as const }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Collection failed'
    await supabase.from('study_payouts').update({
      status: 'failed',
      failure_reason: message.slice(0, 280),
      updated_at: new Date().toISOString(),
    }).eq('id', payoutId)
    throw new Error(message)
  }
}

export async function payoutDashboardLink(supabase: SupabaseClient, userId: string) {
  const { data: account } = await supabase
    .from('study_payout_accounts')
    .select('stripe_account_id, payouts_enabled')
    .eq('user_id', userId)
    .maybeSingle()
  if (!account?.payouts_enabled) throw new Error('Finish bank setup before opening payouts.')
  const stripe = getStripe()
  const link = await stripe.accounts.createLoginLink(account.stripe_account_id)
  return link.url
}
