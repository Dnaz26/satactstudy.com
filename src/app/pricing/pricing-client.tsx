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
import { PLANS, displayPrice, planCadence, type PaidPlanId } from '@/lib/stripe'
import { cn } from '@/lib/utils'

export function PricingClient({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter()
  const [code, setCode] = React.useState('')
  const [promoApplied, setPromoApplied] = React.useState(false)
  const [redeeming, setRedeeming] = React.useState(false)
  const [error, setError] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    const pending = sessionStorage.getItem('pending_promo')
    if (isCheckoutPromo(pending)) {
      sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
      setPromoApplied(true)
      setCode(CHECKOUT_PROMO.code)
      setNote(`${CHECKOUT_PROMO.code} applied — ${CHECKOUT_PROMO.trialDays} days free, then ${CHECKOUT_PROMO.percentOff}% off.`)
    }
  }, [])

  function choosePlan(plan: PaidPlanId) {
    setError('')
    const promo = promoApplied ? `&promo=${CHECKOUT_PROMO.code}` : ''
    if (!loggedIn) {
      router.push(`/signup?plan=${plan}${promo}`)
      return
    }
    router.push(`/pay?plan=${plan}${promo}`)
  }

  async function redeem() {
    setError('')
    setNote('')
    const trimmed = code.trim()
    if (isCheckoutPromo(trimmed)) {
      sessionStorage.setItem('pending_promo', CHECKOUT_PROMO.code)
      setPromoApplied(true)
      setCode(CHECKOUT_PROMO.code)
      setNote(`${CHECKOUT_PROMO.code} applied — ${CHECKOUT_PROMO.trialDays} days free, then ${CHECKOUT_PROMO.percentOff}% off the list price.`)
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
      setPromoApplied(true)
      setNote(`${CHECKOUT_PROMO.code} applied — ${CHECKOUT_PROMO.trialDays} days free, then ${CHECKOUT_PROMO.percentOff}% off.`)
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
    <div className="flex min-h-screen flex-col px-5 py-5">
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

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <Companion compact mode="studying" message="Pick a plan, then enter or update your card." />

        <div>
          <h1 className="font-display text-2xl text-paper">Unlock study</h1>
          <p className="mt-1 text-sm text-fog">
            List price is ${PLANS[0].price} and ${PLANS[1].price}. Enter {CHECKOUT_PROMO.code} for {CHECKOUT_PROMO.trialDays} days free and {CHECKOUT_PROMO.percentOff}% off.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const charged = displayPrice(plan, promoApplied)
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => choosePlan(plan.id)}
                className={cn(
                  'flex flex-col items-start justify-between rounded-2xl p-4 text-left',
                  plan.hot ? 'neu-raised text-white' : 'neu text-paper'
                )}
              >
                <div>
                  <p className="font-display text-lg">{plan.name}</p>
                  <p className={cn('mt-1 text-xs', plan.hot ? 'text-white/80' : 'text-fog')}>{plan.line}</p>
                </div>
                <div className="mt-3 flex w-full items-end justify-between">
                  <div>
                    {promoApplied && plan.promoPrice != null ? (
                      <p className="font-display text-xl">
                        <span className="mr-2 text-sm line-through opacity-60">${plan.price}</span>
                        ${charged}
                        <span className="text-xs opacity-70"> {planCadence(plan)}</span>
                      </p>
                    ) : (
                      <p className="font-display text-xl">
                        ${plan.price}
                        <span className="text-xs opacity-70"> {planCadence(plan)}</span>
                      </p>
                    )}
                    {promoApplied && (
                      <p className={cn('mt-1 text-[10px] uppercase tracking-[0.14em]', plan.hot ? 'text-white/70' : 'text-fog')}>
                        {CHECKOUT_PROMO.trialDays} days free
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{loggedIn ? 'Continue' : 'Get'}</span>
                </div>
              </button>
            )
          })}
        </div>

        <div className="neu p-4">
          <p className="mb-3 text-sm text-paper">Have a code?</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Promo or access code"
              className="flex-1"
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
