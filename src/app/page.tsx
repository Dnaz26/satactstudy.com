import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  BookOpenCheck,
  CalendarClock,
  Gauge,
  Layers,
  MessageCircleHeart,
  SlidersHorizontal,
  Triangle,
  Wallet,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BrandMark, SectionKicker } from '@/components/brand'
import { HeroPreview } from '@/components/landing/hero-preview'
import { ProofCharts } from '@/components/landing/proof-charts'
import { PLANS } from '@/lib/stripe'

export const metadata: Metadata = {
  title: 'SAT ACT AI — Study the way you actually learn',
  description:
    'Personalized SAT and ACT practice with Nova. Custom examples, score tracking, nightly plans, Desmos, Rapid Fire — from $10/month.',
}

const FEATURES = [
  { icon: SlidersHorizontal, label: 'Your examples', stat: '+40%' },
  { icon: Gauge, label: 'Score tracking', stat: 'Live' },
  { icon: CalendarClock, label: 'Nightly plan', stat: '+240' },
  { icon: BookOpenCheck, label: 'Unlimited tests', stat: '∞' },
  { icon: Triangle, label: 'Desmos tricks', stat: '−7m' },
  { icon: Layers, label: 'All topics', stat: '68' },
  { icon: Zap, label: 'Rapid Fire', stat: '12s' },
  { icon: MessageCircleHeart, label: 'Tutoring mode', stat: 'Stay' },
  { icon: Wallet, label: 'From', stat: `$${PLANS[0]?.price ?? 10}` },
] as const

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 land-hero-wash" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 play-dots opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full land-orb" aria-hidden="true" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark />
        <nav className="flex items-center gap-3">
          <Link href="#proof" className="hidden text-xs uppercase tracking-[0.18em] text-fog hover:text-paper md:inline">
            Data
          </Link>
          <Link href="/pricing" className="hidden text-xs uppercase tracking-[0.18em] text-fog hover:text-paper md:inline">
            Pricing
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start</Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-6 pb-10 pt-2 lg:grid-cols-2 lg:gap-10 lg:pb-14">
        <section className="land-rise">
          <p className="font-display text-[clamp(3rem,9vw,5.2rem)] leading-[0.88]">
            <span className="land-brand-glow">SAT ACT AI</span>
          </p>
          <h1 className="land-rise land-rise-delay-1 mt-4 max-w-md font-display text-2xl leading-tight text-paper sm:text-3xl">
            Pictures of progress. Not walls of text.
          </h1>
          <p className="land-rise land-rise-delay-2 mt-3 max-w-sm text-fog">
            Custom examples · live score · nightly plan · from ${PLANS[0].price}/mo
          </p>
          <div className="land-rise land-rise-delay-3 mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/signup">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#proof">See the graphs</Link>
            </Button>
          </div>
        </section>
        <div className="land-rise land-rise-delay-2">
          <HeroPreview />
        </div>
      </main>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-8">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="neu-sm flex flex-col items-center gap-2 px-2 py-4 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl text-signal">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="font-display text-lg leading-none">{f.stat}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-fog">{f.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section id="proof" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionKicker>The data</SectionKicker>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">What moves the score</h2>
          </div>
          <p className="max-w-xs text-sm text-fog">StudentQuest models · same student · different format</p>
        </div>
        <ProofCharts />
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <SectionKicker>Price</SectionKicker>
        <h2 className="mt-2 font-display text-3xl">From ${PLANS[0].price} / mo</h2>
        <p className="mt-1 text-sm text-fog">
          Core ${PLANS[0].price} · Plus ${PLANS[1].price}. Have a code? Apply it on pricing.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div key={plan.name} className="neu flex items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="font-display text-xl">
                  {plan.name}
                  {plan.hot ? <span className="ml-2 font-mono text-[10px] text-signal">HOT</span> : null}
                </p>
                <p className="font-display text-2xl text-paper">${plan.price}/mo</p>
              </div>
              <Button asChild variant={plan.hot ? 'default' : 'outline'}>
                <Link href={`/signup?plan=${plan.id}`}>Get</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
        <div className="land-cta relative neu flex flex-col items-start justify-between gap-5 overflow-hidden px-8 py-10 sm:flex-row sm:items-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(420px 180px at 0% 0%, rgba(255,107,87,0.16), transparent 55%), radial-gradient(360px 160px at 100% 100%, rgba(43,158,217,0.14), transparent 50%)',
            }}
            aria-hidden="true"
          />
          <h2 className="relative z-10 font-display text-3xl leading-tight">Ready?</h2>
          <Button asChild size="lg" className="relative z-10">
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandMark />
          <div className="flex gap-5 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
