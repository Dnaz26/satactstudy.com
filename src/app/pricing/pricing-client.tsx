'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BrandMark } from '@/components/brand'
import { Companion } from '@/components/ui/companion'
import { CHECKOUT_PROMO, isCheckoutPromo } from '@/lib/plans'
import { redeemPromoCode } from '@/lib/promo'
import { PlanCards } from '@/components/pricing/plan-cards'
import { PLANS } from '@/lib/stripe'

export function PricingClient({ loggedIn, initialPromo = false }: { loggedIn: boolean; initialPromo?: boolean }) {
  const router = useRouter()
  const [code, setCode] = React.useState(initialPromo ? CHECKOUT_PROMO.code : '')
  const [promoApplied, setPromoApplied] = React.useState(initialPromo)
  const [redeeming, setRedeeming] = React.useState(false)
  const [error, setError] = React.useState('')
  const [note, setNote] = React.useState('')
  const [celebrate, setCelebrate] = React.useState(false)

  function applyRhsSpecial(showBurst = true) {
    sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
    setPromoApplied(true)
    setCode(CHECKOUT_PROMO.code)
    setNote(
      `${CHECKOUT_PROMO.label} unlocked — ${CHECKOUT_PROMO.trialDays} days free, then ${CHECKOUT_PROMO.percentOff}% off forever.`,
    )
    if (showBurst) {
      setCelebrate(true)
      window.setTimeout(() => setCelebrate(false), 4200)
    }
  }

  React.useEffect(() => {
    if (initialPromo) {
      applyRhsSpecial(false)
      return
    }
    const pending = sessionStorage.getItem('pending_promo')
    if (isCheckoutPromo(pending)) {
      applyRhsSpecial(false)
    }
  }, [initialPromo])

  async function redeem() {
    setError('')
    setNote('')
    const trimmed = code.trim()
    if (isCheckoutPromo(trimmed)) {
      applyRhsSpecial(true)
      return
    }

    if (!loggedIn) {
      sessionStorage.setItem('pending_promo', trimmed)
      router.push('/signup')
      return
    }

    setRedeeming(true)
    const result = await redeemPromoCode(trimmed)
    if (result.checkoutPromo) {
      applyRhsSpecial(true)
      setRedeeming(false)
      return
    }
    if (result.ok) {
      router.push('/dashboard')
      router.refresh()
      return
    }
    setError(result.error ?? 'Invalid code')
    setRedeeming(false)
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-5 py-5">
      {celebrate && (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden="true">
          <div className="rhs-confetti absolute inset-0" />
          <div className="rhs-burst absolute left-1/2 top-24 -translate-x-1/2 rounded-full px-5 py-2 font-display text-lg text-white shadow-lg">
            {CHECKOUT_PROMO.label} · {CHECKOUT_PROMO.percentOff}% OFF
          </div>
        </div>
      )}

      <div className="mb-5 flex items-center justify-between">
        <BrandMark href={loggedIn ? '/pricing' : '/'} />
        {loggedIn ? (
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit">Log out</Button>
          </form>
        ) : (
          <Link href="/login" className="text-xs uppercase tracking-[0.16em] text-fog hover:text-paper">
            Log in
          </Link>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Companion
          compact
          mode={promoApplied ? 'success' : 'studying'}
          message={
            promoApplied
              ? `${CHECKOUT_PROMO.label} is live — Core $${PLANS[0].promoPrice}/mo and Plus $${PLANS[1].promoPrice}/mo after ${CHECKOUT_PROMO.trialDays} free days.`
              : 'Pick a plan, then enter or update your card.'
          }
        />

        {promoApplied ? (
          <div className="rhs-special neu relative overflow-hidden p-4">
            <div className="rhs-special-wash pointer-events-none absolute inset-0" aria-hidden="true" />
            <p className="relative font-mono text-[10px] uppercase tracking-[0.22em] text-signal">
              {CHECKOUT_PROMO.label}
            </p>
            <h1 className="relative mt-1 font-display text-2xl text-paper">
              {CHECKOUT_PROMO.percentOff}% off unlocked
            </h1>
            <p className="relative mt-1 text-sm text-fog">
              ${PLANS[0].price} → ${PLANS[0].promoPrice} · ${PLANS[1].price} → ${PLANS[1].promoPrice} ·{' '}
              {CHECKOUT_PROMO.trialDays} days free first
            </p>
          </div>
        ) : (
          <div>
            <h1 className="font-display text-2xl text-paper">Unlock study</h1>
            <p className="mt-1 text-sm text-fog">
              Free, Core ${PLANS[0].price}/mo, or Plus ${PLANS[1].price}/mo. Plus includes 3× Core’s daily usage. Each paid card includes a 30% annual option.
            </p>
          </div>
        )}

        <PlanCards destination={loggedIn ? 'account' : 'signup'} promo={promoApplied} />

        <div className="neu p-4">
          <p className="mb-3 text-sm text-paper">Have a code?</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Promo or access code"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void redeem()
              }}
            />
            <Button onClick={() => void redeem()} loading={redeeming} disabled={!code.trim()}>
              Apply
            </Button>
          </div>
        </div>

        {note && <p className="text-sm text-ok">{note}</p>}
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>
    </div>
  )
}
