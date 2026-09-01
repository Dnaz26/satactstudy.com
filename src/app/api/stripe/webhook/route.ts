import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-08-26.dahlia' })
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

function getPlanFromPriceId(priceId: string): 'starter' | 'pro' | 'elite' {
  if (priceId === process.env.STRIPE_ELITE_PRICE_ID) return 'elite'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  return 'starter'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
      return Response.json({ error: 'No signature' }, { status: 400 })
    }

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
        const plan = session.metadata?.plan as 'starter' | 'pro' | 'elite' | undefined

        if (!userId || !plan) break

        await supabase.from('profiles').update({
          subscription_plan: plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        }).eq('id', userId)

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

        const priceId = subscription.items.data[0]?.price?.id ?? ''
        const plan = getPlanFromPriceId(priceId)

        const firstItem = subscription.items.data[0]
        const periodStart = firstItem?.current_period_start ?? subscription.billing_cycle_anchor
        const periodEnd = firstItem?.current_period_end ?? (subscription.cancel_at ?? subscription.billing_cycle_anchor)

        await supabase.from('profiles').update({
          subscription_plan: subscription.status === 'active' ? plan : 'free',
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
