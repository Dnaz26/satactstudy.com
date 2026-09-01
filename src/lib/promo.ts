export async function redeemPromoCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = code.trim()
  if (!trimmed) return { ok: true }

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

    const data = (await res.json()) as { success?: boolean; error?: string }
    if (data.success) {
      sessionStorage.removeItem('pending_promo')
      return { ok: true }
    }
    return { ok: false, error: data.error ?? 'Invalid promo code' }
  } catch {
    return { ok: false, error: 'Could not apply promo code' }
  }
}

export async function redeemPendingPromo(): Promise<void> {
  if (typeof window === 'undefined') return
  const pending = sessionStorage.getItem('pending_promo')
  if (!pending) return
  await redeemPromoCode(pending)
}
