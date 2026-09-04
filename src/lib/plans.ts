export const CHECKOUT_PROMO = {
  code: 'RHS',
  percentOff: 60,
  trialDays: 14,
} as const

export type PublicPlanId = 'core' | 'plus'

export const PUBLIC_PLAN_IDS: PublicPlanId[] = ['core', 'plus']

export function normalizePromo(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase()
}

export function isCheckoutPromo(code: string | null | undefined): boolean {
  return normalizePromo(code) === CHECKOUT_PROMO.code
}

export function promoPriceFromList(listPrice: number): number {
  return Math.round(listPrice * (1 - CHECKOUT_PROMO.percentOff / 100) * 100) / 100
}
