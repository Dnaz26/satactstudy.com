import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { grantPaidPlan } from '@/lib/stripe-fulfill'
import { getStripe, isPaidPlanId, planFromPriceId, type PaidPlanId } from '@/lib/stripe'

function liveSubscription(status: string): boolean {
  return status === 'active' || status === 'trialing'
}

function resolvePlan(subscription: Stripe.Subscription): PaidPlanId | null {
  const meta = subscription.metadata?.plan
  if (isPaidPlanId(meta)) return meta
  const priceId = subscription.items.data[0]?.price?.id ?? ''
  return planFromPriceId(priceId)
}

function checkoutReady(session: Stripe.Checkout.Session): boolean {
  if (session.status !== 'complete') return false
  if (session.mode === 'subscription') return true
  return session.payment_status === 'paid' || session.payment_status === 'no_payment_required'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!sig || !webhookSecret) {
      return Response.json({ error: 'No signature' }, { status: 400 })
    }

    const stripe = getStripe()
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const plan = isPaidPlanId(session.metadata?.plan) ? session.metadata.plan : null

        if (!userId || !plan || !checkoutReady(session)) break

        await grantPaidPlan({
          userId,
          plan,
          customerId: typeof session.customer === 'string' ? session.customer : null,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          status: session.metadata?.promo === 'RHS' && session.mode === 'subscription' ? 'trialing' : 'active',
        })

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        const plan = resolvePlan(subscription)
        if (!plan) break

        const firstItem = subscription.items.data[0]
        const periodStart = firstItem?.current_period_start ?? subscription.billing_cycle_anchor
        const periodEnd = firstItem?.current_period_end ?? (subscription.cancel_at ?? subscription.billing_cycle_anchor)

        await supabase.from('profiles').update({
          subscription_plan: liveSubscription(subscription.status) ? plan : 'free',
          subscription_status: subscription.status,
          updated_at: new Date().toISOString(),
        }).eq('id', profile.id)

        await supabase.from('subscriptions').upsert({
          user_id: profile.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          plan,
          status: subscription.status,
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_plan: 'free',
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('id', profile.id)

        break
      }
    }

    return Response.json({ received: true })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
