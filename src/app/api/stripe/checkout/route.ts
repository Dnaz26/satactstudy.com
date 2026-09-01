import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-08-26.dahlia' })

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
  elite: process.env.STRIPE_ELITE_PRICE_ID ?? '',
}

const bodySchema = z.object({
  plan: z.enum(['starter', 'pro', 'elite']),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as unknown
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { plan } = parsed.data
    const priceId = PRICE_IDS[plan]

    if (!priceId) {
      return Response.json({ error: 'Plan not configured' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, email')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=1`,
      cancel_url: `${appUrl}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    })

    return Response.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
