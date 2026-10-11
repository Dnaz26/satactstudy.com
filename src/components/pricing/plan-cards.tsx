'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { CHECKOUT_PROMO } from '@/lib/plans'
import { FREE_PLAN, PLANS, annualChargeDollars, type BillingInterval, type PaidPlanId } from '@/lib/stripe'

function money(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
}

function planHref(destination: 'signup' | 'account', promo: boolean, plan: 'free' | PaidPlanId, billing: BillingInterval): string {
  if (plan === 'free') return destination === 'account' ? '/dashboard' : '/signup'
  const code = promo && billing === 'month' ? `&promo=${CHECKOUT_PROMO.code}` : ''
  if (destination === 'account') return `/pay?plan=${plan}&billing=${billing}${code}`
  return `/signup?plan=${plan}&billing=${billing}${code}`
}

export function PlanCards({
  destination,
  promo = false,
  currentPlan,
}: {
  destination: 'signup' | 'account'
  promo?: boolean
  currentPlan?: string
}) {
  const current = (currentPlan ?? '').toLowerCase()
  const freeCurrent = current === 'free' || current === ''
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <article className={`cast-card flex flex-col p-7 ${freeCurrent && currentPlan ? 'ring-2 ring-signal shadow-[0_18px_40px_rgba(201,68,36,0.16)]' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-2xl">
              Free
              {freeCurrent && currentPlan ? <span className="ml-2 font-mono text-[10px] text-signal">YOUR PLAN</span> : null}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-fog">{FREE_PLAN.blurb}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-4xl tracking-tight">$0</p>
            <p className="text-sm text-fog">/ month</p>
          </div>
        </div>
        <ul className="mt-6 space-y-2.5">
          {FREE_PLAN.bullets.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-paper">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(34,160,107,0.12)] text-ok">
                <Check className="h-3 w-3" aria-hidden="true" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {freeCurrent && currentPlan ? (
          <span className="cast-pill mt-7 inline-flex items-center justify-center bg-signal px-5 py-3 text-sm font-semibold text-white">Your plan</span>
        ) : (
          <Link href={planHref(destination, promo, 'free', 'month')} className="cast-pill mt-7 inline-flex items-center justify-center border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold">
            Start free
          </Link>
        )}
      </article>
      {PLANS.map((plan) => (
        <PaidPlanCard key={plan.id} plan={plan} destination={destination} promo={promo} current={current === plan.id} />
      ))}
    </div>
  )
}

function PaidPlanCard({
  plan,
  destination,
  promo,
  current,
}: {
  plan: (typeof PLANS)[number]
  destination: 'signup' | 'account'
  promo: boolean
  current: boolean
}) {
  const yearly = annualChargeDollars(plan.price)

  return (
    <article className={`cast-card flex flex-col p-7 ${current || plan.hot ? 'ring-2 ring-signal' : ''} ${current ? 'shadow-[0_18px_40px_rgba(201,68,36,0.16)]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl">
            {plan.name}
            {current ? <span className="ml-2 font-mono text-[10px] text-signal">YOUR PLAN</span> : plan.hot ? <span className="ml-2 font-mono text-[10px] text-signal">MOST CHOSEN</span> : null}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-fog">{plan.blurb}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-4xl tracking-tight">${money(plan.price)}</p>
          <p className="text-sm text-fog">/ month</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {plan.bullets.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-paper">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(34,160,107,0.12)] text-ok">
              <Check className="h-3 w-3" aria-hidden="true" />
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-7 grid gap-2">
        {current ? (
          <span className="cast-pill inline-flex items-center justify-center bg-signal px-5 py-3 text-sm font-semibold text-white">Your plan</span>
        ) : (
          <>
            <Link href={planHref(destination, promo, plan.id, 'month')} className="cast-pill inline-flex items-center justify-center border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold">
              Pay monthly · ${money(plan.price)}
            </Link>
            <Link href={planHref(destination, promo, plan.id, 'year')} className="cast-pill cast-cta inline-flex items-center justify-center px-5 py-3 text-center text-sm font-semibold">
              Save 30% if you pay annually · ${money(yearly)}/year
            </Link>
          </>
        )}
      </div>
    </article>
  )
}
