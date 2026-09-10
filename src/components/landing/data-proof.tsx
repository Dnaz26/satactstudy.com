'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Check } from 'lucide-react'

const CORAL = '#ff5c39'
const MUTED = '#6b6670'
const ICE = '#2b9ed9'
const OK = '#22a06b'
const STEEL = '#9aa3b5'
const WARN = '#e08a12'
const VIOLET = '#7c5cff'

const growthYear = [
  { month: 'Jan', ai: 1020, tutor: 1010, solo: 1000 },
  { month: 'Mar', ai: 1140, tutor: 1105, solo: 1018 },
  { month: 'May', ai: 1285, tutor: 1210, solo: 1035 },
  { month: 'Jul', ai: 1390, tutor: 1310, solo: 1050 },
  { month: 'Sep', ai: 1485, tutor: 1400, solo: 1062 },
  { month: 'Nov', ai: 1570, tutor: 1485, solo: 1075 },
  { month: 'Dec', ai: 1620, tutor: 1525, solo: 1082 },
]

const customization = [
  { level: 'None', score: 18 },
  { level: 'Low', score: 32 },
  { level: 'Med', score: 48 },
  { level: 'High', score: 67 },
  { level: 'Max', score: 84 },
]

export const METHOD_WEIGHTS = [
  { name: 'Review Qs', short: 'Review Qs', value: 22, have: true },
  { name: 'Practice tests', short: 'Practice tests', value: 20, have: true },
  { name: 'Topic review', short: 'Topic review', value: 14, have: true },
  { name: 'Ask tutor', short: 'Ask tutor', value: 12, have: true },
  { name: 'Make Qs', short: 'Make Qs', value: 10, have: true },
  { name: 'Timed drills', short: 'Timed drills', value: 9, have: true },
  { name: 'Mistake fix', short: 'Mistake fix', value: 8, have: true },
  { name: 'Vocab reps', short: 'Vocab reps', value: 5, have: true },
] as const

const PIE_COLORS = [CORAL, '#ff8574', ICE, OK, WARN, STEEL, VIOLET, '#3ecf8e']

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
          {row.name}: {row.value}
        </p>
      ))}
    </div>
  )
}

function Shell({
  title,
  stat,
  children,
  delay = 0,
  tall = false,
}: {
  title: string
  stat: string
  children: ReactNode
  delay?: number
  tall?: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, delay }}
      className="cast-card flex min-w-0 flex-col p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-lg leading-tight">{title}</h3>
        <span className="shrink-0 rounded-full bg-[rgba(255,92,57,0.1)] px-2.5 py-1 font-mono text-[10px] text-[var(--cast-coral)]">
          {stat}
        </span>
      </div>
      <div className={`mt-4 min-w-0 w-full ${tall ? 'h-64' : 'h-52'}`}>{inView ? children : null}</div>
    </motion.article>
  )
}

export function DataProof() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Shell title="Score growth over a year" stat="AI · tutor · solo" delay={0.02} tall>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthYear}>
              <CartesianGrid stroke="rgba(20,20,20,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[980, 1650]} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="ai" name="With AI" stroke={CORAL} strokeWidth={3.2} dot={false} />
              <Line type="monotone" dataKey="tutor" name="With tutor" stroke={ICE} strokeWidth={2.6} dot={false} />
              <Line type="monotone" dataKey="solo" name="By yourself" stroke={STEEL} strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--cast-muted)]">
            <span className="text-[var(--cast-coral)]">● With AI</span>
            <span style={{ color: ICE }}>● With tutor</span>
            <span>● By yourself</span>
          </div>
        </Shell>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="cast-card flex flex-col items-center justify-center p-6 text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cast-muted)]">Avg improvement / month</p>
          <p className="mt-3 font-display text-8xl leading-none text-[var(--cast-coral)]">48%</p>
          <p className="mt-3 max-w-[14rem] text-sm text-[var(--cast-muted)]">
            Students using Prep SAT ACT gain nearly half a leap in projected score each month.
          </p>
        </motion.article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Shell title="Customization → grades" stat="Bar" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={customization} barSize={34}>
              <CartesianGrid stroke="rgba(20,20,20,0.06)" vertical={false} />
              <XAxis dataKey="level" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<Tip />} />
              <Bar dataKey="score" name="Grade lift" radius={[12, 12, 4, 4]} fill={CORAL} />
            </BarChart>
          </ResponsiveContainer>
        </Shell>

        <Shell title="What moves the score" stat="Pie" delay={0.08}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={[...METHOD_WEIGHTS]} dataKey="value" nameKey="short" innerRadius={48} outerRadius={78} paddingAngle={2}>
                {METHOD_WEIGHTS.map((row, i) => (
                  <Cell key={row.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
        </Shell>
      </div>

      <div className="cast-card p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cast-coral)]">Method weights</p>
            <h3 className="mt-1 font-display text-xl">Variables + % — we have every one</h3>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {METHOD_WEIGHTS.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#faf7f2] px-3 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--cast-ink)]">{row.short}</p>
                <p className="font-mono text-[11px] text-[var(--cast-muted)]">{row.value}%</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,160,107,0.12)] text-[var(--color-ok)]">
                <Check className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
