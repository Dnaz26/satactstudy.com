'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  Gift,
  Highlighter,
  Layers,
  NotebookPen,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  Triangle,
} from 'lucide-react'

type DemoId = 'math' | 'english' | 'score' | 'practice' | 'calendar' | 'bank' | 'levels'

const DEMOS: Array<{ id: DemoId; label: string; verb: string }> = [
  { id: 'math', label: 'Math + Desmos', verb: 'Graphing zeros' },
  { id: 'english', label: 'English', verb: 'Marking the claim' },
  { id: 'score', label: '50% reward', verb: 'Unlocking reward' },
  { id: 'practice', label: 'Practice test', verb: 'Coaching the set' },
  { id: 'calendar', label: 'Tonight plan', verb: 'Building tonight' },
  { id: 'bank', label: '5,000 Qs', verb: 'Routing topics' },
  { id: 'levels', label: 'Levels', verb: 'Teaching metaphor' },
]

const SCENE_MS = 12000
const LINE_MS = 900

function NovaFace({ busy }: { busy: boolean }) {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full bg-[rgba(255,92,57,0.22)]"
        animate={busy ? { scale: [1, 1.28, 1], opacity: [0.55, 0.15, 0.55] } : { scale: 1, opacity: 0.35 }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cast-coral)] font-display text-sm text-white shadow-[0_10px_24px_rgba(255,92,57,0.35)]">
        N
      </span>
      {busy ? (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#faf7f2] bg-[#22a06b]" />
      ) : null}
    </div>
  )
}

function useStep(count: number, every = LINE_MS) {
  const [step, setStep] = React.useState(0)
  React.useEffect(() => {
    setStep(0)
    const timers = Array.from({ length: count }, (_, i) =>
      window.setTimeout(() => setStep(i + 1), 500 + i * every),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [count, every])
  return step
}

function NovaBanner({ line, status }: { line: string; status: string }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-white/90 px-3.5 py-3 shadow-[0_8px_24px_rgba(40,24,12,0.05)]">
      <NovaFace busy />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-sm">Nova</p>
          <span className="rounded-full bg-[rgba(255,92,57,0.12)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cast-coral)]">
            {status}
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[var(--cast-coral)]" aria-hidden="true" />
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={line}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1 text-sm leading-relaxed text-[var(--cast-ink)]"
          >
            {line}
            <motion.span
              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] bg-[var(--cast-coral)]"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            />
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[#faf7f2] p-4 sm:p-5">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(255,92,57,0.08), transparent 45%), radial-gradient(ellipse at 100% 100%, rgba(43,158,217,0.06), transparent 50%)',
        }}
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  )
}

function MathDemo() {
  const lines = [
    'Highlighting the domain first: −π ≤ x ≤ π.',
    'Writing a note: zeros of two trig waves — not one.',
    'Graphing y = 2sin(3x)+cos(x/2) right here…',
    'Marking zeros where the curve hits y = 0.',
    'Count is 7 — locking answer D.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]

  return (
    <Stage>
      <NovaBanner line={line} status="Tutoring" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-coral)]">Hard math · multi-step</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed sm:text-base">
        How many solutions does{' '}
        <motion.span
          animate={step >= 1 ? { backgroundColor: 'rgba(255,92,57,0.22)' } : {}}
          className="rounded px-0.5"
        >
          2sin(3x) + cos(x/2) = 0
        </motion.span>{' '}
        have for{' '}
        <motion.span
          animate={step >= 1 ? { backgroundColor: 'rgba(255,92,57,0.22)' } : {}}
          className="rounded px-0.5"
        >
          x ∈ [−π, π]
        </motion.span>
        ?
      </p>
      <p className="mt-3 text-sm text-[var(--cast-muted)]">
        A) 4 &nbsp; B) 5 &nbsp; C) 6 &nbsp;{' '}
        <motion.span
          animate={step >= 5 ? { backgroundColor: '#ff5c39', color: '#fff', borderRadius: 999 } : {}}
          className="inline-block px-1.5 py-0.5 font-semibold"
        >
          D) 7
        </motion.span>{' '}
        &nbsp; E) 8
      </p>

      <div className="mt-4 space-y-2">
        {step >= 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-[0_6px_16px_rgba(40,24,12,0.04)]"
          >
            <Highlighter className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cast-coral)]" />
            <span>
              <span className="font-semibold">Nova highlight:</span> domain −π ≤ x ≤ π
            </span>
          </motion.div>
        ) : null}
        {step >= 2 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-[0_6px_16px_rgba(40,24,12,0.04)]"
          >
            <NotebookPen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cast-coral)]" />
            <span>
              <span className="font-semibold">Nova note:</span> zeros of a sum of two waves — not one
            </span>
          </motion.div>
        ) : null}
      </div>

      {step >= 3 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-black/5 bg-white p-3"
        >
          <div className="mb-2 flex items-center gap-2 text-[var(--cast-coral)]">
            <Triangle className="h-3.5 w-3.5" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Nova graphing · Desmos</span>
          </div>
          <ol className="space-y-1 font-mono text-[11px] text-[var(--cast-muted)]">
            <li>1. y = 2sin(3x) + cos(x/2)</li>
            <li>2. Restrict domain −π ≤ x ≤ π</li>
            <li className={step >= 4 ? 'text-[var(--cast-ink)]' : ''}>3. Mark zeros where y = 0</li>
            <li className={step >= 5 ? 'font-semibold text-[var(--cast-ink)]' : ''}>4. Count crossings → 7</li>
          </ol>
          <div className="relative mt-3 h-32 overflow-hidden rounded-xl bg-[linear-gradient(180deg,#f3f7ff,#e8f0ff)]">
            <svg viewBox="0 0 320 128" className="absolute inset-0 h-full w-full">
              <path d="M0 64 H320" stroke="#c9d8ee" strokeWidth="1" />
              <path d="M160 8 V120" stroke="#c9d8ee" strokeWidth="1" />
              <motion.path
                d="M16 64 C40 14, 58 114, 90 64 S140 24, 160 64 S200 108, 230 64 S280 20, 304 64"
                fill="none"
                stroke="#ff5c39"
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.8, ease: 'easeInOut' }}
              />
              {step >= 4
                ? [90, 160, 230].map((cx, i) => (
                    <motion.circle
                      key={cx}
                      cx={cx}
                      cy={64}
                      r={4}
                      fill="#2b9ed9"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 * i }}
                    />
                  ))
                : null}
            </svg>
          </div>
        </motion.div>
      ) : null}
    </Stage>
  )
}

function EnglishDemo() {
  const lines = [
    'Highlighting the claim that needs support.',
    'Writing a note on “however”: contrast signal.',
    'Crossing out A, C, and D — they invent or restate.',
    'Best answer tightens causality without new claims.',
    'Locking B — reframes the causal chain.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]

  return (
    <Stage>
      <NovaBanner line={line} status="Tutoring" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-coral)]">Hard English · multi-step</p>
      <p className="mt-2 text-sm leading-relaxed">
        The historian argues that the treaty failed not because of weak language, but because negotiators treated{' '}
        <motion.span
          animate={step >= 1 ? { backgroundColor: 'rgba(255,92,57,0.22)' } : {}}
          className="rounded px-0.5"
        >
          symbolic concessions as sufficient substitutes for enforceable timelines
        </motion.span>
        . Critics reply that enforcement was impossible without broader coalitions; the author,{' '}
        <motion.span
          animate={step >= 2 ? { backgroundColor: 'rgba(43,158,217,0.2)' } : {}}
          className="rounded px-0.5 font-semibold"
        >
          however
        </motion.span>
        , contends that coalition-building was delayed precisely because timelines were never drafted.
      </p>
      <p className="mt-3 text-sm font-semibold">
        Which choice best describes the function of the underlined sentence in the argument?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { c: 'A', t: 'Concedes a flaw', kill: true },
          { c: 'B', t: 'Reframes the causal chain', kill: false },
          { c: 'C', t: 'Introduces a new example', kill: true },
          { c: 'D', t: 'Restates the critics', kill: true },
        ].map((row) => (
          <motion.span
            key={row.c}
            animate={
              step >= 5 && !row.kill
                ? { backgroundColor: '#ff5c39', color: '#fff', scale: 1.04 }
                : step >= 3 && row.kill
                  ? { opacity: 0.35 }
                  : {}
            }
            className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
            style={step >= 3 && row.kill ? { textDecoration: 'line-through' } : undefined}
          >
            {row.c}) {row.t}
          </motion.span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {step >= 1 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs"
          >
            <Highlighter className="mt-0.5 h-3.5 w-3.5 text-[var(--cast-coral)]" />
            Nova highlight: symbolic concessions… timelines
          </motion.div>
        ) : null}
        {step >= 2 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs"
          >
            <NotebookPen className="mt-0.5 h-3.5 w-3.5 text-[var(--cast-coral)]" />
            Nova note: “however” = contrast with prior clause
          </motion.div>
        ) : null}
      </div>
    </Stage>
  )
}

function ScoreDemo() {
  const lines = [
    'Pulling your month curve onto the screen…',
    'You crossed +50% — writing that down.',
    'Reward threshold hit. Unlocking next month free.',
    'Note: lighter load tomorrow — keep the streak.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]
  const [pct, setPct] = React.useState(0)
  React.useEffect(() => {
    setPct(0)
    const id = window.setTimeout(() => setPct(50), LINE_MS)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <Stage>
      <NovaBanner line={line} status="Celebrating" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-muted)]">Month review</p>
      <motion.p
        className="mt-2 font-display text-6xl tracking-tight text-[var(--cast-coral)] sm:text-7xl"
        animate={{ scale: pct > 0 ? 1 : 0.92, opacity: pct > 0 ? 1 : 0.4 }}
      >
        +{pct}%
      </motion.p>
      <p className="mt-2 text-sm text-[var(--cast-muted)]">Projected improvement this month</p>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/5">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,#ff5c39,#ff8574)]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 2.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {step >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs"
        >
          <NotebookPen className="mt-0.5 h-3.5 w-3.5 text-[var(--cast-coral)]" />
          Nova note: “+50% projected — reward unlocked.”
        </motion.div>
      ) : null}
      {step >= 3 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-[rgba(255,92,57,0.25)] bg-white p-4"
        >
          <div className="flex items-center gap-2 text-[var(--cast-coral)]">
            <Gift className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Nova unlocked</span>
          </div>
          <p className="mt-2 font-display text-2xl">Next month free</p>
          <p className="mt-1 text-sm text-[var(--cast-muted)]">Keep the streak — lighter load, sharper focus.</p>
        </motion.div>
      ) : null}
    </Stage>
  )
}

function PracticeDemo() {
  const qs = [
    { n: 1, text: 'If f(x)=x²−4x+1, what is f(3)−f(1)?', pick: 'C', note: 'Arithmetic on f(x) — pick C.' },
    { n: 2, text: 'Which choice best preserves the author’s tone?', pick: 'B', note: 'Tone stays clean — pick B.' },
    { n: 3, text: 'A circle has radius 5. Area of inscribed square?', pick: 'D', note: 'Inscribed square — pick D.' },
  ]
  const lines = [
    'Working the booklet on screen — flag and move.',
    'Q1: selecting C.',
    'Q2: selecting B — writing a tone note.',
    'Q3: selecting D. Later we only review misses.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]
  const [picked, setPicked] = React.useState<Record<number, string>>({})

  React.useEffect(() => {
    setPicked({})
    const timers = qs.map((q, i) =>
      window.setTimeout(() => {
        setPicked((prev) => ({ ...prev, [q.n]: q.pick }))
      }, 900 + i * Math.round(LINE_MS * 2.1)),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  return (
    <Stage>
      <NovaBanner line={line} status="Coaching" />
      <div className="mb-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-muted)]">Practice test · booklet</p>
        <span className="rounded-full bg-[rgba(255,92,57,0.1)] px-2.5 py-1 font-mono text-[10px] text-[var(--cast-coral)]">
          Nova working
        </span>
      </div>
      <div className="space-y-3">
        {qs.map((q, i) => (
          <motion.div
            key={q.n}
            animate={{
              borderColor: step === i + 1 || (step >= 4 && i === 2) ? 'rgba(255,92,57,0.4)' : 'rgba(20,20,20,0.06)',
            }}
            className="rounded-xl border bg-white px-3 py-3"
          >
            <p className="font-mono text-[11px] text-[var(--cast-coral)]">Q{q.n}</p>
            <p className="mt-1 text-sm font-medium">{q.text}</p>
            <div className="mt-2 flex gap-2">
              {['A', 'B', 'C', 'D'].map((c) => {
                const on = picked[q.n] === c
                return (
                  <motion.span
                    key={c}
                    animate={on ? { backgroundColor: '#ff5c39', color: '#fff', scale: 1.08 } : {}}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-xs font-semibold"
                  >
                    {c}
                  </motion.span>
                )
              })}
            </div>
            {picked[q.n] ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 flex items-center gap-1.5 text-xs text-[var(--cast-muted)]"
              >
                <NotebookPen className="h-3 w-3 text-[var(--cast-coral)]" />
                Nova note: {q.note}
              </motion.p>
            ) : null}
          </motion.div>
        ))}
      </div>
    </Stage>
  )
}

function CalendarDemo() {
  const days = [
    { d: 'Mon', t: 'Algebra drill' },
    { d: 'Tue', t: 'Reading pace' },
    { d: 'Wed', t: 'Grammar' },
    { d: 'Thu', t: 'Desmos lab' },
    { d: 'Fri', t: 'Mixed set' },
    { d: 'Sat', t: 'Full section' },
    { d: 'Sun', t: 'Review' },
  ]
  const lines = [
    'Drafting your week on the calendar…',
    'Weak algebra leads — Monday drills.',
    'Thursday gets Desmos lab. Saturday: full section.',
    'Pinning tonight: 25 min, eight drills, one clarifying Q.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]
  const [filled, setFilled] = React.useState(0)
  const [tonight, setTonight] = React.useState(false)

  React.useEffect(() => {
    setFilled(0)
    setTonight(false)
    const timers: number[] = []
    days.forEach((_, i) => {
      timers.push(window.setTimeout(() => setFilled(i + 1), 700 + i * 550))
    })
    timers.push(window.setTimeout(() => setTonight(true), 700 + days.length * 550 + 500))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [])

  return (
    <Stage>
      <NovaBanner line={line} status="Planning" />
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-[var(--cast-coral)]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-muted)]">
          Calendar · Nova writing live
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {days.map((day, i) => (
          <motion.div
            key={day.d}
            animate={{ opacity: i < filled ? 1 : 0.35, y: i < filled ? 0 : 4 }}
            className="rounded-xl bg-white px-3 py-3"
          >
            <p className="font-mono text-[10px] text-[var(--cast-coral)]">{day.d}</p>
            <p className="mt-1 text-xs font-semibold">{i < filled ? day.t : '…'}</p>
          </motion.div>
        ))}
      </div>
      <AnimatePresence>
        {tonight || step >= 4 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 rounded-2xl border border-[var(--cast-coral)] bg-white p-4 shadow-[0_12px_28px_rgba(255,92,57,0.1)]"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-coral)]">
              Tonight · Nova pinned
            </p>
            <p className="mt-2 font-display text-2xl">25 min · Weak algebra</p>
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--cast-muted)]">
              <li>1. 8 quadratic factor drills</li>
              <li>2. 1 Desmos zero hunt</li>
              <li>3. Ask Nova one clarifying Q</li>
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Stage>
  )
}

function BankDemo() {
  const rows = [
    { k: 'Math', n: 2100 },
    { k: 'Reading', n: 1400 },
    { k: 'Writing', n: 1100 },
    { k: 'Science', n: 400 },
  ]
  const lines = [
    'Scanning the bank on screen…',
    'Math density is highest in your misses — noting that.',
    'Routing next items by weak topic, not random.',
    'Bank depth means you never run out of reps.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]
  const [count, setCount] = React.useState(0)
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    setCount(0)
    setActive(0)
    const start = Date.now()
    const tick = window.setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 4500)
      setCount(Math.round(5000 * (1 - Math.pow(1 - t, 3))))
      if (t >= 1) window.clearInterval(tick)
    }, 40)
    const hops = rows.map((_, i) => window.setTimeout(() => setActive(i), 900 + i * 900))
    return () => {
      window.clearInterval(tick)
      hops.forEach((h) => window.clearTimeout(h))
    }
  }, [])

  return (
    <Stage>
      <NovaBanner line={line} status="Routing" />
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-muted)]">Question bank</p>
      <p className="mt-2 font-display text-6xl tracking-tight text-[var(--cast-coral)] sm:text-7xl">
        {count.toLocaleString()}+
      </p>
      <p className="mt-2 text-sm text-[var(--cast-muted)]">Nova scanning SAT & ACT exam-style items live.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map((row, i) => (
          <motion.div
            key={row.k}
            animate={{
              scale: active === i ? 1.04 : 1,
              borderColor: active === i ? 'rgba(255,92,57,0.45)' : 'rgba(20,20,20,0.06)',
            }}
            className="rounded-2xl border bg-white px-3 py-3"
          >
            <p className="font-mono text-[10px] text-[var(--cast-muted)]">{row.k}</p>
            <p className="font-display text-xl">{row.n.toLocaleString()}</p>
          </motion.div>
        ))}
      </div>
      {step >= 2 ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs"
        >
          <NotebookPen className="h-3.5 w-3.5 text-[var(--cast-coral)]" />
          Nova note: route Math → Reading → Writing.
        </motion.p>
      ) : null}
    </Stage>
  )
}

function LevelsDemo() {
  const levels = ['L1 Foundations', 'L2 Linear', 'L3 Quadratics', 'L4 Functions', 'L5 Advanced']
  const lines = [
    'Climbing your levels on screen…',
    'We’re on Functions — writing the metaphor.',
    'f(x) is the play call. Input x is the pass you receive.',
    'f(g(x)) is a one-two: first touch, then shot.',
  ]
  const step = useStep(lines.length)
  const line = lines[Math.min(step, lines.length - 1)] ?? lines[0]
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    setActive(0)
    const id = window.setInterval(() => {
      setActive((n) => (n < levels.length - 1 ? n + 1 : n))
    }, Math.round(LINE_MS * 2.1))
    return () => window.clearInterval(id)
  }, [levels.length])

  return (
    <Stage>
      <NovaBanner line={line} status="Teaching" />
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-[var(--cast-coral)]" />
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cast-muted)]">Levels · Nova climbing</p>
      </div>
      <div className="space-y-2">
        {levels.map((level, i) => (
          <motion.div
            key={level}
            animate={{
              backgroundColor: i === active ? '#ff5c39' : '#ffffff',
              color: i === active ? '#ffffff' : '#141414',
              opacity: i > active ? 0.45 : 1,
              x: i === active ? 6 : 0,
            }}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold"
          >
            {level}
            {i === active ? (
              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em]">Nova here</span>
            ) : null}
          </motion.div>
        ))}
      </div>
      {step >= 2 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-relaxed"
        >
          <NotebookPen className="mr-1.5 inline h-3.5 w-3.5 text-[var(--cast-coral)]" />
          <span className="font-semibold">Nova note:</span> Functions → soccer. Composition = one-two play.
        </motion.div>
      ) : null}
    </Stage>
  )
}

function Scene({ id }: { id: DemoId }) {
  if (id === 'math') return <MathDemo />
  if (id === 'english') return <EnglishDemo />
  if (id === 'score') return <ScoreDemo />
  if (id === 'practice') return <PracticeDemo />
  if (id === 'calendar') return <CalendarDemo />
  if (id === 'bank') return <BankDemo />
  return <LevelsDemo />
}

export function ProductShowcase() {
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(true)
  const [progress, setProgress] = React.useState(0)
  const demo = DEMOS[index]

  React.useEffect(() => {
    if (!playing) return
    const started = Date.now()
    const tick = window.setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / SCENE_MS) * 100)
      setProgress(pct)
      if (pct >= 100) {
        setIndex((i) => (i + 1) % DEMOS.length)
        setProgress(0)
      }
    }, 50)
    return () => window.clearInterval(tick)
  }, [playing, index])

  function jump(i: number) {
    setIndex(i)
    setProgress(0)
  }

  return (
    <div className="cast-card overflow-hidden shadow-[0_28px_70px_rgba(40,24,12,0.1)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[#faf7f2] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <NovaFace busy={playing} />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--cast-muted)]">
              Nova reel · {demo.label}
            </p>
            <p className="truncate text-xs font-semibold text-[var(--cast-ink)]">{demo.verb}</p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-[10px] text-[var(--cast-muted)]">
          {String(index + 1).padStart(2, '0')} / {String(DEMOS.length).padStart(2, '0')}
        </p>
      </div>

      <div className="relative min-h-[480px] bg-[#faf7f2] p-4 sm:min-h-[520px] sm:p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={demo.id}
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(3px)' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <Scene id={demo.id} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-3 border-t border-[var(--line)] bg-[#faf7f2] px-4 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-black/5">
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5c39,#ff8574)]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.08, ease: 'linear' }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="cast-pill inline-flex items-center gap-1.5 bg-[var(--cast-coral)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => jump((index - 1 + DEMOS.length) % DEMOS.length)}
            className="cast-pill inline-flex items-center gap-1 border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            <SkipBack className="h-3.5 w-3.5" /> Prev
          </button>
          <button
            type="button"
            onClick={() => jump((index + 1) % DEMOS.length)}
            className="cast-pill inline-flex items-center gap-1 border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Next <SkipForward className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex gap-1.5">
            {DEMOS.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jump(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? 'scale-125 bg-[var(--cast-coral)]' : 'bg-black/15 hover:bg-black/30'
                }`}
                aria-label={item.label}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
