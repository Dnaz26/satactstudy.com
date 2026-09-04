import { createServiceClient } from '@/lib/supabase/server'
import { getStripe, isPaidPlanId, type PaidPlanId } from './stripe'

export async function grantPaidPlan(opts: {
  userId: string
  plan: PaidPlanId
  customerId?: string | null
  subscriptionId?: string | null
  status?: string
}): Promise<void> {
  const supabase = await createServiceClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_plan: opts.plan,
      stripe_customer_id: opts.customerId ?? undefined,
      stripe_subscription_id: opts.subscriptionId ?? undefined,
      subscription_status: opts.status ?? 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', opts.userId)

  if (error) {
    throw new Error(error.message)
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('id', opts.userId)
    .single()

  if (row?.subscription_plan !== opts.plan) {
    throw new Error('Paid plan was not saved')
  }
}

function checkoutReady(session: { status: string | null; payment_status: string; mode: string | null }): boolean {
  if (session.status !== 'complete') return false
  if (session.mode === 'subscription') return true
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

export async function fulfillCheckoutSession(userId: string, sessionId: string): Promise<{
  granted: boolean
  plan: PaidPlanId | null
}> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  if (session.metadata?.supabase_user_id !== userId) {
    return { granted: false, plan: null }
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  const chosen = isPaidPlanId(session.metadata?.plan) ? session.metadata.plan : null

  if (session.mode === 'setup' && customerId && session.setup_intent) {
    const setupId = typeof session.setup_intent === 'string' ? session.setup_intent : session.setup_intent.id
    const setup = await stripe.setupIntents.retrieve(setupId)
    const paymentMethod = typeof setup.payment_method === 'string' ? setup.payment_method : setup.payment_method?.id
    if (paymentMethod) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethod },
      })
    }
    return { granted: false, plan: null }
  }

  if (!checkoutReady(session) || !chosen) {
    return { granted: false, plan: null }
  }

  const trial = session.metadata?.promo === 'RHS' && session.mode === 'subscription'
  await grantPaidPlan({
    userId,
    plan: chosen,
    customerId,
    subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
    status: trial ? 'trialing' : 'active',
  })

  return { granted: true, plan: chosen }
}
