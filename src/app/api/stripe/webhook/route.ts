import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { CHECKOUT_PROMO } from '@/lib/plans'
import { grantPaidPlan } from '@/lib/stripe-fulfill'
import { getStripe, isPaidPlanId, planFromPriceId, rhsCouponId, type PaidPlanId } from '@/lib/stripe'

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

function subscriptionHasRhs(subscription: Stripe.Subscription): boolean {
  if (subscription.metadata?.promo === CHECKOUT_PROMO.code) return true
  const couponId = rhsCouponId()
  for (const entry of subscription.discounts ?? []) {
    if (typeof entry === 'string') {
      if (couponId && entry === couponId) return true
      continue
    }
    const coupon = entry.source?.coupon
    if (!coupon) continue
    if (typeof coupon === 'string') {
      if (couponId && coupon === couponId) return true
      continue
    }
    if (couponId && coupon.id === couponId) return true
    if (coupon.name?.toUpperCase().includes('RHS')) return true
    if (coupon.percent_off === CHECKOUT_PROMO.percentOff && coupon.duration === 'forever') return true
  }
  return false
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

        const rhs = session.metadata?.promo === CHECKOUT_PROMO.code
        await grantPaidPlan({
          userId,
          plan,
          customerId: typeof session.customer === 'string' ? session.customer : null,
          subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          status: rhs && session.mode === 'subscription' ? 'trialing' : 'active',
          billingPromo: rhs ? CHECKOUT_PROMO.code : null,
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
        const rhs = subscriptionHasRhs(subscription)

        await supabase.from('profiles').update({
          subscription_plan: liveSubscription(subscription.status) ? plan : 'free',
          subscription_status: subscription.status,
          billing_promo: liveSubscription(subscription.status) && rhs ? CHECKOUT_PROMO.code : null,
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
          billing_promo: null,
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
