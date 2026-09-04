import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { CHECKOUT_PROMO, isCheckoutPromo } from '@/lib/plans'
import { publicAppUrl } from '@/lib/utils'
import {
  checkoutEmailOnlyParams,
  checkoutLineItem,
  checkoutPromoDiscounts,
  getStripe,
  integrationIdentifier,
  isOneTimePlan,
  isPaidPlanId,
  priceIdForPlan,
  rhsCouponId,
  syncBillingCustomer,
  type PaidPlanId,
} from '@/lib/stripe'

const bodySchema = z.object({
  plan: z.enum(['lite', 'starter', 'core', 'plus', 'pro', 'elite']).optional(),
  promo: z.string().optional(),
  updateCard: z.boolean().optional(),
  embedded: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request' }, { status: 400 })
    }

    const updateCard = Boolean(parsed.data.updateCard)
    const plan = parsed.data.plan
    if (!updateCard && !plan) {
      return Response.json({ error: 'Choose a plan' }, { status: 400 })
    }

    const stripe = getStripe()
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name, email')
      .eq('id', user.id)
      .single()

    const customerId = await syncBillingCustomer(stripe, {
      customerId: profile?.stripe_customer_id,
      email: user.email ?? profile?.email,
      name: profile?.full_name,
      userId: user.id,
    })
    if (customerId !== profile?.stripe_customer_id) {
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = publicAppUrl()
    const embedded = parsed.data.embedded !== false
    const ident = integrationIdentifier(updateCard ? 'satactcard' : 'satactpay')
    const emailOnly = checkoutEmailOnlyParams()

    let params: Stripe.Checkout.SessionCreateParams
    if (updateCard) {
      params = embedded
        ? {
            customer: customerId,
            mode: 'setup',
            ui_mode: 'embedded',
            return_url: `${appUrl}/pay?updated=1&session_id={CHECKOUT_SESSION_ID}`,
            metadata: { supabase_user_id: user.id, purpose: 'update_card' },
            integration_identifier: ident,
            ...emailOnly,
          }
        : {
            customer: customerId,
            mode: 'setup',
            success_url: `${appUrl}/pay?updated=1&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/settings`,
            metadata: { supabase_user_id: user.id, purpose: 'update_card' },
            integration_identifier: ident,
            ...emailOnly,
          }
    } else {
      const chosen = plan as PaidPlanId
      if (!isPaidPlanId(chosen)) {
        return Response.json({ error: 'Choose a plan' }, { status: 400 })
      }
      const oneTime = isOneTimePlan(chosen)
      const rhs = isCheckoutPromo(parsed.data.promo) && !oneTime
      const coupon = rhsCouponId()
      if (!oneTime && !priceIdForPlan(chosen) && chosen !== 'core' && chosen !== 'plus') {
        return Response.json({ error: 'Plan not configured' }, { status: 400 })
      }
      const mode = oneTime ? 'payment' : 'subscription'
      const line_items = [checkoutLineItem(chosen, rhs && !coupon)]
      const discounts = checkoutPromoDiscounts(rhs ? CHECKOUT_PROMO.code : undefined)
      const metadata = {
        supabase_user_id: user.id,
        plan: chosen,
        promo: rhs ? CHECKOUT_PROMO.code : '',
      }
      const subscription_data = oneTime
        ? undefined
        : {
            metadata,
            ...(rhs ? { trial_period_days: CHECKOUT_PROMO.trialDays } : {}),
          }
      params = embedded
        ? {
            customer: customerId,
            mode,
            line_items,
            ...(discounts ? { discounts } : {}),
            ...(subscription_data ? { subscription_data } : {}),
            ui_mode: 'embedded',
            return_url: `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
            metadata,
            integration_identifier: ident,
            ...emailOnly,
          }
        : {
            customer: customerId,
            mode,
            line_items,
            ...(discounts ? { discounts } : {}),
            ...(subscription_data ? { subscription_data } : {}),
            success_url: `${appUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/pricing`,
            metadata,
            integration_identifier: ident,
            ...emailOnly,
          }
    }

    const session = await stripe.checkout.sessions.create(params)
    return Response.json({
      clientSecret: session.client_secret,
      url: session.url,
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : 'Failed to start checkout'
    const error = raw === 'Stripe is not configured'
      ? 'Billing is not configured yet.'
      : /sk_|rk_|pk_/.test(raw)
        ? 'Failed to start checkout'
        : raw
    return Response.json({ error }, { status: 500 })
  }
}
