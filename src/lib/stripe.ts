import Stripe from 'stripe'
import { PLAN_LIMITS, PLAN_PRICES, PLAN_PROMO_PRICES } from './constants'
import { CHECKOUT_PROMO, isCheckoutPromo, promoPriceFromList } from './plans'

export type PaidPlanId = 'lite' | 'starter' | 'core' | 'plus' | 'pro' | 'elite'

export const PAID_PLAN_IDS: PaidPlanId[] = ['lite', 'starter', 'core', 'plus', 'pro', 'elite']

export function isPaidPlanId(value: string | null | undefined): value is PaidPlanId {
  return PAID_PLAN_IDS.includes((value ?? '').trim().toLowerCase() as PaidPlanId)
}

export type PlanInfo = {
  name: string
  price: number
  promoPrice?: number
  id: PaidPlanId
  line: string
  hot?: boolean
  once?: boolean
}

export const PLANS: PlanInfo[] = [
  {
    name: 'Core',
    price: PLAN_PRICES.core,
    promoPrice: PLAN_PROMO_PRICES.core,
    id: 'core',
    line: `${PLAN_LIMITS.core.questions_per_day} questions/day · ${PLAN_LIMITS.core.ai_chats_per_day} AI chats/day`,
  },
  {
    name: 'Plus',
    price: PLAN_PRICES.plus,
    promoPrice: PLAN_PROMO_PRICES.plus,
    id: 'plus',
    line: `${PLAN_LIMITS.plus.questions_per_day} questions/day · ${PLAN_LIMITS.plus.ai_chats_per_day} AI chats/day`,
    hot: true,
  },
]

const LEGACY_PLANS: Record<PaidPlanId, PlanInfo> = {
  lite: { name: 'Lite', price: PLAN_PRICES.lite, id: 'lite', line: '5 questions · 1 AI chat', once: true },
  starter: { name: 'Starter', price: PLAN_PRICES.starter, id: 'starter', line: '10 questions · 3 AI chats' },
  core: PLANS[0],
  plus: PLANS[1],
  pro: { name: 'Pro', price: PLAN_PRICES.pro, id: 'pro', line: '50 questions · 15 AI chats' },
  elite: { name: 'Elite', price: PLAN_PRICES.elite, id: 'elite', line: 'Unlimited' },
}

export function planInfo(plan: PaidPlanId): PlanInfo {
  return LEGACY_PLANS[plan]
}

export function isOneTimePlan(plan: PaidPlanId): boolean {
  return plan === 'lite'
}

export function planCadence(plan: Pick<PlanInfo, 'once'>): string {
  return plan.once ? 'one time' : '/mo'
}

export function displayPrice(plan: PlanInfo, promo: boolean): number {
  if (promo && plan.promoPrice != null) return plan.promoPrice
  return plan.price
}

export function checkoutLineItem(
  plan: PaidPlanId,
  promo = false,
): Stripe.Checkout.SessionCreateParams.LineItem {
  if (isOneTimePlan(plan)) {
    return {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: 100,
        product_data: {
          name: 'Lite',
          description: 'One-time $1 Stripe connection test',
        },
      },
    }
  }

  const info = planInfo(plan)
  const configured = priceIdForPlan(plan)
  const coupon = rhsCouponId()
  if (configured && !(promo && !coupon)) {
    return { price: configured, quantity: 1 }
  }

  const dollars = promo ? (info.promoPrice ?? promoPriceFromList(info.price)) : info.price
  return {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: Math.round(dollars * 100),
      recurring: { interval: 'month' },
      product_data: {
        name: info.name,
        description: promo
          ? `${info.line}. ${CHECKOUT_PROMO.code}: ${CHECKOUT_PROMO.trialDays} days free, then $${dollars}/mo (${CHECKOUT_PROMO.percentOff}% off $${info.price}).`
          : info.line,
      },
    },
  }
}

export function rhsCouponId(): string {
  return process.env.STRIPE_RHS_COUPON_ID ?? ''
}

export function checkoutPromoDiscounts(
  promo: string | null | undefined,
): Stripe.Checkout.SessionCreateParams.Discount[] | undefined {
  if (!isCheckoutPromo(promo)) return undefined
  const coupon = rhsCouponId()
  if (!coupon) return undefined
  return [{ coupon }]
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key || key.includes('your_stripe')) {
    throw new Error('Stripe is not configured')
  }
  return new Stripe(key, { apiVersion: '2026-08-26.dahlia' })
}

export function checkoutEmailOnlyParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  'phone_number_collection' | 'wallet_options'
> {
  return {
    phone_number_collection: { enabled: false },
    wallet_options: { link: { display: 'never' } },
  }
}

export async function syncBillingCustomer(
  stripe: Stripe,
  opts: {
    customerId?: string | null
    email?: string | null
    name?: string | null
    userId: string
  },
): Promise<string> {
  const email = opts.email?.trim() || undefined
  const name = opts.name?.trim() || undefined
  if (opts.customerId) {
    await stripe.customers.update(opts.customerId, {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      phone: '',
    })
    return opts.customerId
  }
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { supabase_user_id: opts.userId },
  })
  return customer.id
}

export function priceIdForPlan(plan: PaidPlanId): string {
  const ids: Record<PaidPlanId, string> = {
    lite: process.env.STRIPE_LITE_PRICE_ID ?? '',
    starter: process.env.STRIPE_STARTER_PRICE_ID ?? '',
    core: process.env.STRIPE_CORE_PRICE_ID ?? '',
    plus: process.env.STRIPE_PLUS_PRICE_ID ?? '',
    pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
    elite: process.env.STRIPE_ELITE_PRICE_ID ?? '',
  }
  return ids[plan]
}

export function planFromPriceId(priceId: string): PaidPlanId | null {
  if (!priceId) return null
  if (priceId === process.env.STRIPE_ELITE_PRICE_ID) return 'elite'
  if (priceId === process.env.STRIPE_PLUS_PRICE_ID) return 'plus'
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === process.env.STRIPE_CORE_PRICE_ID) return 'core'
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return 'starter'
  if (priceId === process.env.STRIPE_LITE_PRICE_ID) return 'lite'
  return null
}

export function integrationIdentifier(label: string): string {
  const letters = 'abcdefghijkmnpqrstuvwxyz'
  let suffix = ''
  for (let i = 0; i < 8; i++) suffix += letters[Math.floor(Math.random() * letters.length)]
  return `${label}-${suffix}`
}
