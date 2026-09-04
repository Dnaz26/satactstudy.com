import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'

function readEnv(path: string): Record<string, string> {
  const raw = readFileSync(path, 'utf8')
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function upsertEnv(path: string, updates: Record<string, string>): void {
  let raw = readFileSync(path, 'utf8')
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`
    const pattern = new RegExp(`^${key}=.*$`, 'm')
    if (pattern.test(raw)) raw = raw.replace(pattern, line)
    else raw = raw.endsWith('\n') ? `${raw}${line}\n` : `${raw}\n${line}\n`
  }
  writeFileSync(path, raw)
}

async function ensureProduct(stripe: Stripe, name: string, description: string): Promise<Stripe.Product> {
  const found = await stripe.products.search({ query: `name:'${name}' AND active:'true'` })
  if (found.data[0]) {
    return stripe.products.update(found.data[0].id, { description, metadata: { plan: name.toLowerCase() } })
  }
  return stripe.products.create({
    name,
    description,
    metadata: { plan: name.toLowerCase() },
  })
}

async function ensureMonthlyPrice(stripe: Stripe, productId: string, unitAmount: number): Promise<Stripe.Price> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 })
  const match = prices.data.find((price) => (
    price.unit_amount === unitAmount &&
    price.currency === 'usd' &&
    price.recurring?.interval === 'month' &&
    price.recurring.interval_count === 1
  ))
  if (match) return match
  return stripe.prices.create({
    product: productId,
    currency: 'usd',
    unit_amount: unitAmount,
    recurring: { interval: 'month' },
  })
}

async function ensureCoupon(stripe: Stripe): Promise<Stripe.Coupon> {
  try {
    return await stripe.coupons.retrieve('RHS60')
  } catch {
    return stripe.coupons.create({
      id: 'RHS60',
      name: 'RHS 60% off',
      percent_off: 60,
      duration: 'forever',
    })
  }
}

async function ensurePromo(stripe: Stripe, couponId: string): Promise<Stripe.PromotionCode> {
  const existing = await stripe.promotionCodes.list({ code: 'RHS', limit: 10 })
  const match = existing.data.find((item) => item.active)
  if (match) return match
  return stripe.promotionCodes.create({
    promotion: { type: 'coupon', coupon: couponId },
    code: 'RHS',
    active: true,
  })
}

async function main() {
  const envPath = resolve(process.cwd(), '.env.local')
  const env = readEnv(envPath)
  const key = env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')

  const stripe = new Stripe(key, { apiVersion: '2026-08-26.dahlia' })
  const core = await ensureProduct(stripe, 'Core', '80 questions/day and 12 AI chats/day')
  const plus = await ensureProduct(stripe, 'Plus', '200 questions/day and 25 AI chats/day')
  const corePrice = await ensureMonthlyPrice(stripe, core.id, 2000)
  const plusPrice = await ensureMonthlyPrice(stripe, plus.id, 4000)
  const coupon = await ensureCoupon(stripe)
  const promo = await ensurePromo(stripe, coupon.id)

  upsertEnv(envPath, {
    STRIPE_CORE_PRICE_ID: corePrice.id,
    STRIPE_PLUS_PRICE_ID: plusPrice.id,
    STRIPE_RHS_COUPON_ID: coupon.id,
    STRIPE_RHS_PROMO_ID: promo.id,
  })

  console.log(JSON.stringify({
    coreProduct: core.id,
    plusProduct: plus.id,
    corePrice: corePrice.id,
    plusPrice: plusPrice.id,
    coupon: coupon.id,
    promo: promo.id,
    promoCode: promo.code,
  }))
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : 'Stripe setup failed')
  process.exit(1)
})
