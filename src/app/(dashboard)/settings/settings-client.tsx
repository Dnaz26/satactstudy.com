'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { CREDIT_PACK_COUNT } from '@/lib/economy/credits'
import { dollarsFromCents, MIN_COLLECT_CENTS } from '@/lib/economy/earnings'
import { LANGUAGE_KEY, LANGUAGES, t, type UiLanguage, isUiLanguage } from '@/lib/i18n'
import { PlanCards } from '@/components/pricing/plan-cards'

interface SettingsClientProps {
  name: string
  email: string
  plan: string
  periodEnd: string | null
  cancelAtPeriodEnd: boolean
  questions: number
  levels: number
  completeWeeks: number
  creditBalance: number
  availableCents: number
  collectedCents: number
  payoutsEnabled: boolean
  payoutNotice: 'saved' | 'retry' | null
  language: string
}

function planLabel(plan: string): string {
  if (plan === 'access_code') return 'Access code'
  if (plan === 'free' || !plan) return 'Free'
  if (plan === 'core') return 'Core'
  if (plan === 'plus') return 'Plus'
  return plan
}

export function SettingsClient({ name, email, plan, periodEnd, cancelAtPeriodEnd, questions, levels, completeWeeks, creditBalance, availableCents, collectedCents, payoutsEnabled, payoutNotice, language }: SettingsClientProps) {
  const [uiLanguage, setUiLanguage] = React.useState<UiLanguage>(isUiLanguage(language) ? language : 'en')
  const [earnOpen, setEarnOpen] = React.useState(false)
  const copy = (key: Parameters<typeof t>[1]) => t(uiLanguage, key)
  const [billingBusy, setBillingBusy] = React.useState(false)
  const [billingError, setBillingError] = React.useState('')
  const [collectBusy, setCollectBusy] = React.useState(false)
  const [creditBusy, setCreditBusy] = React.useState(false)
  const [collectError, setCollectError] = React.useState('')
  const [collectNote, setCollectNote] = React.useState('')
  const canWithdraw = availableCents >= MIN_COLLECT_CENTS
  async function chooseLanguage(next: UiLanguage) {
    setUiLanguage(next)
    try { window.localStorage.setItem(LANGUAGE_KEY, next) } catch { /* ignore */ }
    await fetch('/api/profile/language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: next }),
    }).catch(() => undefined)
  }
  async function collect(action: 'collect' | 'dashboard' = 'collect') {
    setCollectBusy(true)
    setCollectError('')
    setCollectNote('')
    try {
      const response = await fetch('/api/stripe/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json() as { url?: string; collectedCents?: number; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Collection is unavailable right now.')
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setCollectNote(`$${dollarsFromCents(data.collectedCents ?? availableCents)} was sent to your bank account.`)
      window.location.assign('/settings')
    } catch (error) {
      setCollectError(error instanceof Error ? error.message : 'Collection is unavailable right now.')
      setCollectBusy(false)
    }
  }
  async function useAsCredits() {
    setCollectBusy(true)
    setCollectError('')
    setCollectNote('')
    try {
      const response = await fetch('/api/stripe/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert' }),
      })
      const data = await response.json() as { convertedCents?: number; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Credits are unavailable right now.')
      setCollectNote(`$${dollarsFromCents(data.convertedCents ?? availableCents)} is now extra-question credits.`)
      window.location.assign('/settings')
    } catch (error) {
      setCollectError(error instanceof Error ? error.message : 'Credits are unavailable right now.')
      setCollectBusy(false)
    }
  }
  async function buyCredits() {
    setCreditBusy(true)
    setBillingError('')
    try {
      const response = await fetch('/api/stripe/credits', { method: 'POST' })
      const data = await response.json() as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Credits checkout is unavailable right now.')
      window.location.assign(data.url)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Credits checkout is unavailable right now.')
      setCreditBusy(false)
    }
  }
  const current = (plan || 'free').toLowerCase()
  const hasBilling = current !== 'free' && current !== 'access_code'
  async function manageBilling() {
    setBillingBusy(true)
    setBillingError('')
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json() as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Billing is unavailable right now.')
      window.location.assign(data.url)
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Billing is unavailable right now.')
      setBillingBusy(false)
    }
  }
  const initial = (name || email || 'P').trim().charAt(0).toUpperCase()
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pt-2 pb-12" dir={uiLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(145deg,#12325d_0%,#1b4f86_55%,#0e7490_100%)] text-white shadow-[0_14px_0_#0c2748]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            <p className="text-lg font-black italic">{copy('bank')}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{payoutsEnabled ? copy('connected') : copy('setup')}</p>
          </div>
          <button
            type="button"
            onClick={() => setEarnOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/10 text-lg font-black"
            aria-label={copy('howEarn')}
          >
            i
          </button>
        </div>
        <div className="px-6 pb-6 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{copy('available')}</p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <p className="font-display text-6xl leading-none">${dollarsFromCents(availableCents)}</p>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#128a4e]">{collectedCents > 0 ? copy('paid') : copy('ready')}</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-white/80">
            {questions} {copy('questions')} · {levels} {copy('levels')} · {completeWeeks} {copy('weeks')} · {creditBalance} {copy('credits')}
          </p>
          {payoutNotice === 'saved' && <p className="mt-3 text-sm font-bold text-[#b7f7d0]">Bank setup saved.</p>}
          {payoutNotice === 'retry' && <p className="mt-3 text-sm font-bold text-[#ffe08a]">Bank setup still needs to be finished.</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void collect('collect')} disabled={collectBusy || !canWithdraw}>
              {collectBusy ? copy('opening') : copy('withdraw')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void useAsCredits()} disabled={collectBusy || availableCents < 1}>
              {copy('useCredits')}
            </Button>
            {payoutsEnabled && <Button type="button" variant="secondary" onClick={() => void collect('dashboard')} disabled={collectBusy}>{copy('viewPayouts')}</Button>}
          </div>
          {!canWithdraw && <p className="mt-2 text-xs font-semibold text-white/70">{copy('noBalance')}</p>}
          {collectNote && <p className="mt-2 text-sm font-bold text-[#b7f7d0]">{collectNote}</p>}
          {collectError && <p role="alert" className="mt-2 text-sm font-bold text-[#ffe08a]">{collectError}</p>}
        </div>
      </section>

      <Dialog open={earnOpen} onOpenChange={setEarnOpen}>
        <DialogContent>
          <DialogTitle>{copy('howEarn')}</DialogTitle>
          <DialogDescription className="space-y-3 text-sm leading-6 text-[#3c3c3c]">
            <span className="block">{copy('earnQuestions')}</span>
            <span className="block">{copy('earnLevels')}</span>
            <span className="block">{copy('earnWeek')}</span>
            <span className="block">{copy('creditsLine')}</span>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      <section className="overflow-hidden rounded-[2rem] bg-white shadow-[0_12px_0_#dbeafe] ring-1 ring-[#dbeafe]">
        <div className="bg-[linear-gradient(90deg,#1cb0f6,#7dd3fc)] px-6 py-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em]">{copy('you')}</p>
        </div>
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#1cb0f6] font-display text-4xl text-white shadow-[0_8px_0_#1899d6]">{initial}</div>
          <div className="min-w-0">
            <p className="truncate font-display text-3xl text-[#173d6e]">{name || '—'}</p>
            <p className="mt-1 truncate text-sm font-bold text-[#64748b]">{email || '—'}</p>
          </div>
        </div>
        <div className="border-t border-[#e2e8f0] px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1cb0f6]">{copy('language')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void chooseLanguage(item.id)}
                className={item.id === uiLanguage
                  ? 'rounded-2xl bg-[#1cb0f6] px-3 py-3 text-sm font-black text-white shadow-[0_4px_0_#1899d6]'
                  : 'rounded-2xl bg-[#f8fafc] px-3 py-3 text-sm font-bold text-[#334155] ring-1 ring-[#e2e8f0]'}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{copy('plan')}</p>
        <article className="cast-card p-7 ring-2 ring-signal shadow-[0_18px_40px_rgba(201,68,36,0.16)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-signal">{copy('yourPlan')}</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <p className="font-display text-3xl">{planLabel(current)}</p>
            {periodEnd && (
              <p className="text-sm text-fog">
                {cancelAtPeriodEnd ? 'Ends' : 'Renews'} {formatDate(periodEnd)}
              </p>
            )}
          </div>
        </article>
        {hasBilling && <div className="space-y-2"><Button type="button" onClick={() => void manageBilling()} disabled={billingBusy} className="w-full">{billingBusy ? 'Opening billing…' : 'Manage, upgrade, or downgrade plan'}</Button></div>}
        <PlanCards destination="account" currentPlan={current} />
        <article className="cast-card flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-2xl">{copy('buyCredits')}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog">{copy('buyCreditsBody')}</p>
          </div>
          <Button type="button" onClick={() => void buyCredits()} disabled={creditBusy} className="shrink-0">
            {creditBusy ? 'Opening…' : `Buy ${CREDIT_PACK_COUNT} credits`}
          </Button>
        </article>
        {billingError && <p role="alert" className="text-sm text-bad">{billingError}</p>}
      </section>

      <section className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{copy('account')}</p>
        <div className="rounded-2xl neu-sm px-4 py-4">
          <p className="mb-3 text-sm text-fog">{copy('logoutBody')}</p>
          <form action="/api/auth/signout" method="POST">
            <Button type="submit" variant="secondary" className="w-full">{copy('logout')}</Button>
          </form>
        </div>
      </section>
    </div>
  )
}
