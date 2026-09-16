'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const CORAL = '#ff5c39'
const ICE = '#2b9ed9'
const MUTED = '#8a7168'

/** Retention curves — illustrative synthesis of widely cited learning-science findings
 *  (retrieval practice / testing effect, spaced practice, dual coding). Not a claim of
 *  a single Prep SAT ACT clinical trial. */
const retentionDays = [
  { day: 'Day 1', reread: 68, retrieve: 82, spaced: 88 },
  { day: 'Day 3', reread: 44, retrieve: 71, spaced: 81 },
  { day: 'Day 7', reread: 31, retrieve: 63, spaced: 76 },
  { day: 'Day 14', reread: 22, retrieve: 56, spaced: 71 },
  { day: 'Day 30', reread: 16, retrieve: 49, spaced: 66 },
]

const methodLift = [
  { method: 'Re-read notes', retain: 28 },
  { method: 'Highlight only', retain: 34 },
  { method: 'Watch explanation', retain: 41 },
  { method: 'Practice test', retain: 62 },
  { method: 'Teach-back', retain: 68 },
  { method: 'Spaced + retrieve', retain: 79 },
]

const featureMap = [
  {
    feature: 'Nova Tutoring',
    lever: 'Explain → check → redo',
    why: 'Retrieval + corrective feedback beats passive review.',
  },
  {
    feature: 'Practice Tests',
    lever: 'Full-exam retrieval',
    why: 'Testing effect: recalling under exam conditions sticks.',
  },
  {
    feature: 'Rapid Fire',
    lever: 'High-frequency retrieval',
    why: 'Short spaced reps fight the forgetting curve.',
  },
  {
    feature: 'Customization',
    lever: 'Personal encoding',
    why: 'Self-relevant analogies deepen memory traces.',
  },
  {
    feature: 'Game → Questions',
    lever: 'Interleaved practice',
    why: 'Switching contexts after play forces re-encoding.',
  },
]

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-black/5 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="font-mono text-[10px] text-[var(--cast-muted)]">{label}</p>
      {payload.map((row) => (
        <p key={row.name} className="font-semibold" style={{ color: row.color }}>
          {row.name}: {row.value}%
        </p>
      ))}
    </div>
  )
}

function FadeIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const on = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={on ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function RetentionProof() {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <FadeIn className="cast-card p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">Forgetting curve</p>
          <h3 className="mt-2 font-display text-2xl text-paper">What still sticks after 30 days</h3>
          <p className="mt-2 text-sm leading-relaxed text-fog">
            Re-reading fades fast. Retrieval practice and spaced reps keep more of the skill alive.
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionDays} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(201,68,36,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="reread" name="Re-read" stroke="#c4b5a8" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="retrieve" name="Retrieve" stroke={ICE} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="spaced" name="Spaced retrieve" stroke={CORAL} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-fog">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#c4b5a8]" /> Re-read</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#2b9ed9]" /> Retrieve</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#ff5c39]" /> Spaced retrieve</span>
          </div>
        </FadeIn>

        <FadeIn className="cast-card p-5 sm:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">Method lift</p>
          <h3 className="mt-2 font-display text-2xl text-paper">Relative retention by study move</h3>
          <p className="mt-2 text-sm leading-relaxed text-fog">
            Active methods — practice tests, teach-back, spaced retrieval — outperform passive ones.
          </p>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodLift} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="rgba(201,68,36,0.08)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="method"
                  width={110}
                  tick={{ fill: MUTED, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<Tip />} />
                <Bar dataKey="retain" name="Retention" radius={[0, 8, 8, 0]} barSize={16}>
                  {methodLift.map((row) => (
                    <Cell
                      key={row.method}
                      fill={row.retain >= 60 ? CORAL : row.retain >= 45 ? ICE : '#d4c4b8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </FadeIn>
      </div>

      <FadeIn className="cast-card overflow-hidden">
        <div className="border-b border-[var(--line)] bg-[#fff7f3] px-5 py-4 sm:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">How our features map</p>
          <h3 className="mt-1 font-display text-2xl text-paper">Built around methods that raise retention</h3>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {featureMap.map((row) => (
            <div key={row.feature} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.1fr_1fr_1.4fr] sm:px-6">
              <p className="font-semibold text-paper">{row.feature}</p>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-signal">{row.lever}</p>
              <p className="text-sm text-fog">{row.why}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--line)] bg-[#fffaf7] px-5 py-3 sm:px-6">
          <p className="text-xs leading-relaxed text-fog">
            Figures summarize patterns from learning research on the testing effect and spaced practice
            (e.g. Roediger &amp; Karpicke; Cepeda et al.). They illustrate relative trends — not a guarantee of any score.
          </p>
        </div>
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { k: '2–3×', t: 'Testing vs restudy', d: 'Typical recall lift when students retrieve instead of re-read.' },
          { k: '30d+', t: 'Spacing window', d: 'Distributed practice beats cramming for long-term hold.' },
          { k: 'Active', t: 'Teach-back edge', d: 'Explaining in your own words strengthens the memory trace.' },
        ].map((card) => (
          <FadeIn key={card.k} className="cast-card p-5">
            <p className="font-display text-3xl text-signal">{card.k}</p>
            <p className="mt-1 font-semibold text-paper">{card.t}</p>
            <p className="mt-2 text-sm leading-relaxed text-fog">{card.d}</p>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
