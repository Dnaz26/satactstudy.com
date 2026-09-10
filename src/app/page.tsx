import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Check, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BrandMark, BRAND_NAME } from '@/components/brand'
import { DataProof } from '@/components/landing/data-proof'
import { ProductShowcase } from '@/components/landing/product-showcase'
import { PLANS } from '@/lib/stripe'

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Study the way you actually learn`,
  description:
    'Personalized SAT and ACT practice with Nova. Custom examples, score tracking, nightly plans, Desmos, Rapid Fire — from $10/month.',
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="cast-page relative min-h-screen overflow-x-hidden">
      <header className="relative z-30 mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <div className="cast-nav cast-pill flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <BrandMark href="/" />
          <div className="flex items-center gap-2">
            <Link href="#proof" className="hidden px-3 text-sm text-fog hover:text-paper md:inline">
              Data
            </Link>
            <Link href="#product" className="hidden px-3 text-sm text-fog hover:text-paper md:inline">
              Product
            </Link>
            <Link href="/pricing" className="hidden px-3 text-sm text-fog hover:text-paper md:inline">
              Pricing
            </Link>
            <Link
              href="/signup"
              className="cast-pill cast-cta inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="cast-pill inline-flex h-10 w-10 items-center justify-center border border-[var(--line)] bg-white text-paper"
              aria-label="Log in"
            >
              <Menu className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="cast-hero-fill cast-stage relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-signal font-display text-xl font-extrabold text-white shadow-[0_12px_28px_rgba(255,92,57,0.32)]">
              P
            </span>
            <p className="font-display text-2xl tracking-tight text-paper sm:text-3xl">{BRAND_NAME}</p>
          </div>
          <h1 className="mt-2 font-display text-[clamp(2.75rem,7.5vw,4.5rem)] leading-[0.96] tracking-tight text-paper">
            Turn practice into a <span className="cast-accent">score jump.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-fog">
            Charts that show why it works. A reel that shows Nova tutoring, planning, and rewarding real progress.
          </p>

          <div className="mx-auto mt-9 flex max-w-xl flex-col gap-2 rounded-full border border-[var(--line)] bg-white p-1.5 shadow-[0_24px_50px_rgba(40,24,12,0.1)] sm:flex-row sm:items-center">
            <p className="flex-1 px-4 py-3 text-left text-sm text-fog">
              Free diagnostic · no card
            </p>
            <Link
              href="/signup"
              className="cast-pill cast-cta inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold"
            >
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <section id="proof" className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">1 · The data</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Why Prep SAT ACT works</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fog">
            Year growth, monthly lift, customization, method pie, and the checklist of what we ship.
          </p>
        </div>
        <DataProof />
      </section>

      <section id="product" className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">2 · The product</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Watch Nova work</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-fog">
            A product reel — hard math with Desmos, hard English, rewards, practice tests, tonight&apos;s plan, 5,000 questions, levels.
          </p>
        </div>
        <ProductShowcase />
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Pricing</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">Pick a plan</h2>
          <p className="mt-3 text-[15px] text-fog">
            Clear limits. Eight inclusions each. Start on Core or go Plus for the higher daily ceiling.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`cast-card flex flex-col p-7 ${plan.hot ? 'ring-2 ring-signal' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl">
                    {plan.name}
                    {plan.hot ? <span className="ml-2 font-mono text-[10px] text-signal">MOST CHOSEN</span> : null}
                  </p>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-fog">{plan.blurb}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl tracking-tight">${plan.price}</p>
                  <p className="text-sm text-fog">/ month</p>
                </div>
              </div>
              <ul className="mt-6 space-y-2.5">
                {plan.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-paper">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(34,160,107,0.12)] text-ok">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/signup?plan=${plan.id}`}
                className={
                  plan.hot
                    ? 'cast-pill cast-cta mt-7 inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold'
                    : 'cast-pill mt-7 inline-flex items-center justify-center gap-1.5 border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold'
                }
              >
                Get {plan.name} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="font-display text-sm">{BRAND_NAME}</p>
          <div className="flex gap-5 text-sm text-fog">
            <Link href="/pricing" className="hover:text-paper">Pricing</Link>
            <Link href="/login" className="hover:text-paper">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
