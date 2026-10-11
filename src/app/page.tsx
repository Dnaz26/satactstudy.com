import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BrandMark, BRAND_NAME } from '@/components/brand'
import { LoggedInProductPreview } from '@/components/landing/logged-in-product-preview'
import { UniquePillars } from '@/components/landing/unique-pillars'
import { PlanCards } from '@/components/pricing/plan-cards'

const REVIEWS = [
  { name: 'Maya R.', role: 'SAT student', quote: 'The live breakdown made functions feel less intimidating because I could see one step at a time instead of staring at a full solution.' },
  { name: 'Jordan M.', role: 'ACT student', quote: 'Rapid Fire helped me notice when I was rushing. The short review after each miss made the next question feel more manageable.' },
  { name: 'Elena T.', role: 'SAT and ACT student', quote: 'I liked having my lessons, practice tests, and mistakes in one place. It made it easier to know what to study each day.' },
  { name: 'Will Ross', role: 'SAT student', quote: 'The daily plan gave me one clear place to start, and the timed questions helped me stop freezing when the clock was moving.' },
  { name: 'Mayer Goldstien', role: 'ACT student', quote: 'The game questions made practice feel active, while the explanations showed me exactly which step I had missed.' },
  { name: 'Emily Rice', role: 'SAT student', quote: 'The lesson levels built one idea at a time, so the difficult examples felt connected to something I already understood.' },
  { name: 'Sienna Russo', role: 'SAT student', quote: 'Chat was useful when I needed a fresh example instead of seeing the same solution written a second time.' },
  { name: 'Blake Adler', role: 'ACT student', quote: 'Typing Rush and Rapid Fire made short study sessions feel focused enough that I actually returned the next day.' },
  { name: 'Mark Roberts', role: 'SAT student', quote: 'The score predictor and calendar made my progress visible without making the home screen feel overwhelming.' },
  { name: 'Jeff Parker', role: 'SAT and ACT student', quote: 'The practice screens felt organized, and repairing missed questions helped me recognize the same trap later.' },
  { name: 'Anonymous Student', role: 'SAT student', quote: 'Seeing the lesson, timer, and review loop in one place made it easier to keep practicing without deciding what to open next.' },
]

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Study the way you actually learn`,
  description:
    'Personalized SAT and ACT practice with Nova. Custom examples, score tracking, nightly plans, Desmos, Rapid Fire — from $7.56/month.',
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="cast-page relative min-h-screen overflow-x-hidden">
      <header className="relative z-30 mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <div className="cast-nav cast-pill flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          <BrandMark href="/" mark={<img src="/nova-character.png" alt="" className="h-14 w-auto" />} />
          <div className="flex items-center gap-2">
            <Link href="#features" className="hidden px-3 text-sm text-fog hover:text-paper md:inline">
              Features
            </Link>
            <Link href="/pricing" className="hidden px-3 text-sm text-fog hover:text-paper md:inline">
              Pricing
            </Link>
            <Link
              href="/login"
              className="cast-pill inline-flex items-center justify-center border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:border-signal/40"
            >
              Log in
            </Link>
            <Link
              href="/signup?trial=1"
              className="cast-pill cast-cta inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold"
            >
              Try now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="cast-hero-fill cast-stage relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-20">
        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <img src="/nova-character.png" alt="" className="h-32 w-auto" />
            <p className="font-display text-2xl tracking-tight text-paper sm:text-3xl">{BRAND_NAME}</p>
          </div>
          <h1 className="mt-2 font-display text-[clamp(2.75rem,7.5vw,4.5rem)] leading-[0.96] tracking-tight text-paper">
            Turn practice into a <span className="cast-accent">score jump.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-fog">
            Tutoring, practice tests, Rapid Fire, a custom agent, and games that unlock with real questions.
          </p>

          <div className="mx-auto mt-9 flex max-w-xl flex-col gap-2 rounded-full border border-[var(--line)] bg-white p-1.5 shadow-[0_24px_50px_rgba(40,24,12,0.1)] sm:flex-row sm:items-center">
            <p className="flex-1 px-4 py-3 text-left text-sm text-fog">
              Free diagnostic · no card
            </p>
            <Link
              href="/signup?trial=1"
              className="cast-pill cast-cta inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-semibold"
            >
              Try now — 7 days premium <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <section className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[.2em] text-signal">Sample student stories</p>
          <h2 className="mt-2 font-display text-4xl tracking-tight text-paper sm:text-5xl">What studying can feel like</h2>
          <p className="mt-3 text-sm leading-6 text-fog">Illustrative previews showing the kinds of experiences students can have in the product.</p>
        </div>
        <div className="mt-10 flex snap-x gap-4 overflow-x-auto pb-6">
          {REVIEWS.map((review, index) => <article key={review.name} className="relative min-w-[285px] snap-start overflow-hidden rounded-[2rem] border border-line bg-white p-6 shadow-[0_18px_45px_rgba(40,24,12,.07)] sm:min-w-[340px]"><div className="text-signal" aria-label="Five star sample rating">★★★★★</div><p className="mt-5 text-[15px] leading-7 text-paper">“{review.quote}”</p><div className="mt-6 flex items-center gap-3 border-t border-line pt-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal/10 font-display text-signal">{review.name.charAt(0)}</span><div><p className="font-semibold text-paper">{review.name}</p><p className="text-xs text-fog">{review.role}</p></div><span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-fog">Sample {index + 1}</span></div></article>)}
        </div>
        <p className="text-center text-[10px] text-fog">These stories are illustrative product-preview examples and are not verified customer testimonials.</p>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <UniquePillars />
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-signal"><Sparkles className="h-4 w-4" /> Inside the app</p>
          <h2 className="mt-2 font-display text-4xl tracking-tight text-paper sm:text-5xl">Product Preview</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-fog">This is the same home screen and planning experience students see after logging in.</p>
        </div>
        <LoggedInProductPreview />
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Pricing</p>
          <h2 className="mt-2 font-display text-4xl tracking-tight text-paper sm:text-5xl">Pick a plan</h2>
          <p className="mt-3 text-[15px] text-fog">
            Free sits next to Core. Core is $7.56 a month and Plus is $20 a month, with 3× the daily usage. Each paid card includes a 30% annual option.
          </p>
        </div>
        <PlanCards destination="signup" />
      </section>

      <footer className="relative z-10 border-t border-[var(--line)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="flex items-center gap-2.5 font-display text-sm"><img src="/nova-character.png" alt="" className="h-14 w-auto" />{BRAND_NAME}</p>
          <div className="flex gap-5 text-sm text-fog">
            <Link href="/pricing" className="hover:text-paper">Pricing</Link>
            <Link href="/login" className="hover:text-paper">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
