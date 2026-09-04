import { CHECKOUT_PROMO, isCheckoutPromo, normalizePromo } from './plans'

export type PromoResult = {
  ok: boolean
  error?: string
  checkoutPromo?: boolean
  trialDays?: number
  percentOff?: number
}

export async function redeemPromoCode(code: string): Promise<PromoResult> {
  const trimmed = code.trim()
  if (!trimmed) return { ok: true }

  if (isCheckoutPromo(trimmed)) {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
    }
    return {
      ok: true,
      checkoutPromo: true,
      trialDays: CHECKOUT_PROMO.trialDays,
      percentOff: CHECKOUT_PROMO.percentOff,
    }
  }

  try {
    const res = await fetch('/api/access-code/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed }),
    })

    if (res.status === 401) {
      sessionStorage.setItem('pending_promo', trimmed)
      return { ok: false, error: 'pending' }
    }

    const data = (await res.json()) as {
      success?: boolean
      error?: string
      kind?: string
      trialDays?: number
      percentOff?: number
    }

    if (data.kind === 'checkout_promo' || isCheckoutPromo(trimmed)) {
      sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
      return {
        ok: true,
        checkoutPromo: true,
        trialDays: data.trialDays ?? CHECKOUT_PROMO.trialDays,
        percentOff: data.percentOff ?? CHECKOUT_PROMO.percentOff,
      }
    }

    if (data.success) {
      sessionStorage.removeItem('pending_promo')
      return { ok: true }
    }
    return { ok: false, error: data.error ?? 'Invalid promo code' }
  } catch {
    return { ok: false, error: 'Could not apply promo code' }
  }
}

export async function redeemPendingPromo(): Promise<PromoResult | void> {
  if (typeof window === 'undefined') return
  const pending = sessionStorage.getItem('pending_promo')
  if (!pending) return
  if (isCheckoutPromo(pending)) {
    sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
    return {
      ok: true,
      checkoutPromo: true,
      trialDays: CHECKOUT_PROMO.trialDays,
      percentOff: CHECKOUT_PROMO.percentOff,
    }
  }
  return redeemPromoCode(pending)
}

export function readPendingCheckoutPromo(): string | null {
  if (typeof window === 'undefined') return null
  const pending = normalizePromo(sessionStorage.getItem('pending_promo'))
  return isCheckoutPromo(pending) ? CHECKOUT_PROMO.code : null
}
