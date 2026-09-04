import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BrandMark, SectionKicker } from '@/components/brand'

const SIGNALS = [
  { k: '01', t: 'Mastery', d: 'Every skill scored.' },
  { k: '02', t: 'Misses', d: 'Why you got it wrong.' },
  { k: '03', t: 'Tonight', d: 'The next timed block.' },
  { k: '04', t: 'Range', d: 'A score estimate, not a guess.' },
]

const PLANS = [
  { name: 'Core', price: 20, promo: 8, line: '80 questions/day · 12 AI chats/day', id: 'core' },
  { name: 'Plus', price: 40, promo: 16, line: '200 questions/day · 25 AI chats/day', id: 'plus', hot: true },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 play-dots" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark />
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="hidden text-xs uppercase tracking-[0.18em] text-fog hover:text-paper sm:inline">
            Pricing
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start</Button>
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-16 px-6 pb-24 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:pt-16">
        <section>
          <SectionKicker>Practice → Diagnose → Improve</SectionKicker>
          <h1 className="mt-4 font-display text-4xl leading-[0.96] text-paper sm:text-5xl">
            Know exactly
            <br />
            what to study.
          </h1>
          <p className="mt-6 max-w-md text-lg text-fog">
            Your SAT/ACT coach. One next move, not 30 graphs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">Start studying</Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">See plans</Button>
            </Link>
          </div>
        </section>

        <aside className="neu p-6">
          <div className="flex items-center justify-between pb-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">Tonight</span>
            <span className="h-2.5 w-2.5 rounded-full bg-ok" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <HudStat label="Predicted" value="1430" />
            <HudStat label="Target" value="1500" />
            <HudStat label="Gap" value="70" warn />
          </div>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Next</p>
          <p className="mt-1 font-display text-lg">Linear inequalities</p>
          <div className="mt-3 h-2.5 w-full rounded-full neu-inset">
            <div className="h-full w-[54%] rounded-full bg-warn" />
          </div>
        </aside>
      </main>

      <section className="relative z-10">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-4">
          {SIGNALS.map((s) => (
            <div key={s.k} className="neu p-6">
              <p className="font-mono text-[10px] text-signal">{s.k}</p>
              <h2 className="mt-3 font-display text-xl">{s.t}</h2>
              <p className="mt-2 text-sm text-fog">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <SectionKicker>Pricing</SectionKicker>
        <h2 className="mt-3 font-display text-2xl">Pay or enter a code. Then study.</h2>
        <p className="mt-2 text-sm text-fog">Code RHS: 2 weeks free, then 60% off the list price.</p>
        <div className="mt-10 space-y-4">
          {PLANS.map((p) => (
            <div key={p.name} className="neu flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg">
                  {p.name}
                  {p.hot && <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-signal">Most used</span>}
                </p>
                <p className="text-sm text-fog">{p.line}</p>
              </div>
              <div className="flex items-center gap-6">
                <p className="font-display text-xl">
                  <span className="mr-2 text-sm text-fog line-through">${p.price}</span>
                  ${p.promo}
                  <span className="text-xs text-fog">/mo with RHS</span>
                </p>
                <Link href={`/signup?plan=${p.id}`}>
                  <Button variant={p.hot ? 'default' : 'outline'}>Get {p.name}</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <BrandMark />
          <div className="flex gap-6 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
            <Link href="/pricing" className="hover:text-paper">Pricing</Link>
            <Link href="/login" className="hover:text-paper">Login</Link>
            <Link href="/signup" className="hover:text-paper">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HudStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="neu-sm p-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-fog">{label}</p>
      <p className={`mt-1 font-display text-2xl ${warn ? 'text-warn' : 'text-paper'}`}>{value}</p>
    </div>
  )
}
