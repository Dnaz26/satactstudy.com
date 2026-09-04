'use client'

import * as React from 'react'
import Link from 'next/link'
import { BrandMark } from '@/components/brand'
import { Companion } from '@/components/ui/companion'
import { Button } from '@/components/ui/button'
import { CHECKOUT_PROMO } from '@/lib/plans'
import { displayPrice, isPaidPlanId, planCadence, planInfo, type PaidPlanId } from '@/lib/stripe'

export function PayClient({
  plan,
  promo,
  currentPlan,
  updateCard,
  updated,
  name,
}: {
  plan: PaidPlanId | null
  promo: boolean
  currentPlan: string
  updateCard: boolean
  updated: boolean
  name: string
}) {
  const selected = plan
    ? planInfo(plan)
    : isPaidPlanId(currentPlan)
      ? planInfo(currentPlan)
      : undefined
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(!updated)

  React.useEffect(() => {
    if (updated) return
    let cancelled = false

    async function startCheckout() {
      setLoading(true)
      setError('')
      const pendingPromo = promo || sessionStorage.getItem('pending_promo') === CHECKOUT_PROMO.code
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateCard || !plan
          ? { updateCard: true, embedded: false }
          : { plan, promo: pendingPromo ? CHECKOUT_PROMO.code : undefined, embedded: false }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (cancelled) return
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? 'Could not open the card form')
      setLoading(false)
    }

    void startCheckout()
    return () => {
      cancelled = true
    }
  }, [plan, promo, updateCard, updated])

  const charged = selected ? displayPrice(selected, promo) : 0

  return (
    <div className="flex min-h-screen flex-col px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <BrandMark href={updateCard ? '/settings' : '/pricing'} />
        <Link href={updateCard ? '/settings' : '/pricing'} className="text-sm text-fog hover:text-paper">
          {updateCard ? 'Back to settings' : 'Change plan'}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col gap-3">
        <Companion
          compact
          mode={updated ? 'success' : 'studying'}
          message={updated
            ? `${name || 'You'} — your card is saved.`
            : updateCard
              ? 'Update the card on this plan.'
              : promo
                ? `${CHECKOUT_PROMO.code}: ${CHECKOUT_PROMO.trialDays} days free, then $${charged}/mo.`
                : `You picked ${selected?.name ?? 'a plan'}. Enter your card next.`}
        />

        <div className="neu flex items-end justify-between gap-3 p-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
              {updateCard ? 'Current plan' : 'Selected plan'}
            </p>
            <h1 className="mt-1 font-display text-xl">{selected?.name ?? 'Plan'}</h1>
            <p className="mt-1 text-xs text-fog">{selected?.line}</p>
            {promo && (
              <p className="mt-1 text-xs text-ok">
                {CHECKOUT_PROMO.trialDays} days free · {CHECKOUT_PROMO.percentOff}% off
              </p>
            )}
          </div>
          {selected && (
            <div className="text-right">
              {promo && selected.promoPrice != null ? (
                <p className="font-display text-xl">
                  <span className="mr-2 text-sm text-fog line-through">${selected.price}</span>
                  ${charged}
                  <span className="text-xs text-fog"> {planCadence(selected)}</span>
                </p>
              ) : (
                <p className="font-display text-xl">
                  ${selected.price}
                  <span className="text-xs text-fog"> {planCadence(selected)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {updated ? (
          <div className="neu space-y-3 p-4">
            <p className="font-display text-lg">Card updated</p>
            <Link href="/dashboard"><Button size="sm">Continue studying</Button></Link>
          </div>
        ) : error ? (
          <div className="neu space-y-3 p-4">
            <p className="text-sm text-bad">{error}</p>
            <Link href="/pricing"><Button size="sm">Back to plans</Button></Link>
          </div>
        ) : (
          <div className="neu p-4">
            <p className="text-sm text-fog">{loading ? 'Opening the secure card form…' : 'Ready'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
