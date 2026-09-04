const PAID_PLANS = new Set(['lite', 'starter', 'core', 'plus', 'pro', 'elite', 'access_code'])

export function hasPaidAccess(plan: string | null | undefined, role?: string | null): boolean {
  if (role === 'admin') return true
  return PAID_PLANS.has((plan ?? '').trim().toLowerCase())
}

export const PAYWALL_MESSAGE = 'Choose a plan or enter an access code to continue.'
