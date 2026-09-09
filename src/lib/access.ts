const PAID_PLANS = new Set(['lite', 'starter', 'core', 'plus', 'pro', 'elite', 'access_code'])

export function hasPaidAccess(plan: string | null | undefined, role?: string | null): boolean {
  if (role === 'admin') return true
  return PAID_PLANS.has((plan ?? '').trim().toLowerCase())
}

export function hasActiveTrial(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  const ends = Date.parse(trialEndsAt)
  return Number.isFinite(ends) && ends > Date.now()
}

/** Paid plan, access code, admin, or RHS free window still open. */
export function hasProductAccess(opts: {
  plan?: string | null
  role?: string | null
  trialEndsAt?: string | null
}): boolean {
  if (hasPaidAccess(opts.plan, opts.role)) return true
  return hasActiveTrial(opts.trialEndsAt)
}

export const PAYWALL_MESSAGE = 'Choose a plan or enter an access code to continue.'

export const ONBOARDING_TRIAL = {
  questions: 5,
  aiChats: 2,
} as const

export function rhsTrialEndsAt(from = new Date()): string {
  return new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
}
