'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const FOG = '#5f7190'
const SIGNAL = '#ff6b57'
const ICE = '#2b9ed9'
const STEEL = '#7b8fad'
const OK = '#22a06b'
const WARN = '#e08a12'

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
    <div className="neu-sm px-3 py-2 text-xs">
      <p className="font-mono text-[10px] text-fog">{label}</p>
      {payload.map((row) => (
        <p key={row.name} className="font-semibold" style={{ color: row.color }}>
          {row.name}: {row.value}
        </p>
      ))}
    </div>
  )
}

function ChartShell({
  title,
  stat,
  children,
  delay = 0,
}: {
  title: string
  stat: string
  children: ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, delay }}
      className="neu flex min-w-0 flex-col p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base leading-tight sm:text-lg">{title}</h3>
        <span className="shrink-0 rounded-full neu-sm px-2.5 py-1 font-mono text-[10px] text-signal">{stat}</span>
      </div>
      <div className="mt-3 h-44 min-w-0 w-full sm:h-48">{inView ? children : null}</div>
    </motion.article>
  )
}

const learningFit = [
  { name: 'One-size', score: 100, fill: STEEL },
  { name: 'Your way', score: 140, fill: SIGNAL },
]

const scorePath = [
  { w: '1', nightly: 1180, weekly: 1180 },
  { w: '2', nightly: 1224, weekly: 1192 },
  { w: '3', nightly: 1268, weekly: 1206 },
  { w: '4', nightly: 1310, weekly: 1218 },
  { w: '5', nightly: 1348, weekly: 1230 },
  { w: '6', nightly: 1376, weekly: 1240 },
  { w: '7', nightly: 1396, weekly: 1250 },
  { w: '8', nightly: 1420, weekly: 1260 },
]

const topicsLocked = [
  { name: 'Chat', topics: 6, fill: STEEL },
  { name: '1:1 hour', topics: 8, fill: '#9bb0cc' },
  { name: 'Us', topics: 19, fill: ICE },
]

const speedTrend = [
  { week: 'W1', sec: 88 },
  { week: 'W2', sec: 76 },
  { week: 'W3', sec: 64 },
  { week: 'W4', sec: 52 },
  { week: 'W5', sec: 44 },
  { week: 'W6', sec: 38 },
]

const accuracyTrend = [
  { week: 'W1', us: 58, other: 58 },
  { week: 'W2', us: 64, other: 60 },
  { week: 'W3', us: 71, other: 62 },
  { week: 'W4', us: 76, other: 63 },
  { week: 'W5', us: 82, other: 65 },
  { week: 'W6', us: 87, other: 66 },
]

const costCompare = [
  { name: 'Weekly 1:1', cost: 120, fill: STEEL },
  { name: 'Generic AI', cost: 20, fill: '#9bb0cc' },
  { name: 'Us', cost: 10, fill: OK },
]

const hintsDown = [
  { week: 'W1', hints: 14 },
  { week: 'W2', hints: 11 },
  { week: 'W3', hints: 8 },
  { week: 'W4', hints: 5 },
  { week: 'W5', hints: 3 },
  { week: 'W6', hints: 2 },
]

const desmosSaved = [
  { name: 'No Desmos', min: 18, fill: STEEL },
  { name: 'With Desmos', min: 11, fill: ICE },
]

const features = [
  { feature: 'Custom examples', us: 95, weekly: 40, chat: 25 },
  { feature: 'Score tracking', us: 92, weekly: 35, chat: 10 },
  { feature: 'Nightly plan', us: 90, weekly: 45, chat: 15 },
  { feature: 'Practice tests', us: 96, weekly: 30, chat: 20 },
  { feature: 'Desmos', us: 88, weekly: 25, chat: 5 },
  { feature: 'Rapid Fire', us: 85, weekly: 15, chat: 5 },
]

const topicMix = [
  { name: 'Math', value: 38, fill: ICE },
  { name: 'R&W', value: 30, fill: SIGNAL },
  { name: 'ACT Eng', value: 12, fill: WARN },
  { name: 'Science', value: 10, fill: OK },
  { name: 'Reading', value: 10, fill: STEEL },
]

const masteryBars = [
  { topic: 'Algebra', before: 42, after: 81 },
  { topic: 'Grammar', before: 51, after: 84 },
  { topic: 'Data', before: 38, after: 76 },
  { topic: 'Geometry', before: 44, after: 79 },
]

function useCountUp(target: number, active: boolean) {
  const [value, setValue] = useState(0)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!active) return
    if (reduce) {
      setValue(target)
      return
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, reduce, target])
  return value
}

function MetricStrip() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-30px' })
  const a = useCountUp(40, inView)
  const b = useCountUp(240, inView)
  const c = useCountUp(19, inView)
  const d = useCountUp(8, inView)
  const items = [
    { v: `+${a}%`, l: 'Learning' },
    { v: `+${b}`, l: 'SAT pts' },
    { v: String(c), l: 'Topics' },
    { v: `$${d}`, l: '/mo' },
  ]
  return (
    <div ref={ref} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.l}
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: i * 0.06 }}
          className="neu-sm px-4 py-4 text-center"
        >
          <p className="font-display text-3xl leading-none text-paper">{item.v}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{item.l}</p>
        </motion.div>
      ))}
    </div>
  )
}

export function ProofCharts() {
  return (
    <div className="space-y-5">
      <MetricStrip />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ChartShell title="Custom examples" stat="+40%" delay={0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={learningFit} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c9d8ee" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: FOG, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 160]} hide />
              <Tooltip content={<Tip />} />
              <Bar dataKey="score" name="Index" radius={[12, 12, 6, 6]}>
                {learningFit.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Score climb" stat="+240" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scorePath}>
              <defs>
                <linearGradient id="nightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ICE} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={ICE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="w" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[1160, 1460]} hide />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="nightly" name="Nightly" stroke={ICE} strokeWidth={3} fill="url(#nightFill)" />
              <Area type="monotone" dataKey="weekly" name="Weekly hour" stroke={STEEL} strokeWidth={2} strokeDasharray="5 4" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Topics locked" stat="19" delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicsLocked} layout="vertical" barSize={28} margin={{ left: 8 }}>
              <XAxis type="number" hide domain={[0, 22]} />
              <YAxis type="category" dataKey="name" width={64} tick={{ fill: FOG, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="topics" name="Topics" radius={[0, 10, 10, 0]}>
                {topicsLocked.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Answer speed" stat="−57%" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={speedTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#c9d8ee" />
              <XAxis dataKey="week" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[30, 95]} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="sec" name="Seconds" stroke={SIGNAL} strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Accuracy %" stat="87%" delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accuracyTrend}>
              <XAxis dataKey="week" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[50, 95]} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="us" name="With plan" stroke={OK} strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="other" name="Weekly hour" stroke={STEEL} strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Monthly cost" stat="$10" delay={0.15}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costCompare} barSize={40}>
              <XAxis dataKey="name" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<Tip />} />
              <Bar dataKey="cost" name="$ / mo" radius={[10, 10, 4, 4]}>
                {costCompare.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Hints needed" stat="↓" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hintsDown}>
              <defs>
                <linearGradient id="hintFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={WARN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={WARN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="hints" name="Hints" stroke={WARN} strokeWidth={3} fill="url(#hintFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Desmos time" stat="−7 min" delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={desmosSaved} barSize={48}>
              <XAxis dataKey="name" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<Tip />} />
              <Bar dataKey="min" name="Minutes" radius={[10, 10, 4, 4]}>
                {desmosSaved.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="What we cover" stat="68" delay={0.15}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={topicMix} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                {topicMix.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Capability map" stat="Us wins" delay={0.05}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={features}>
              <PolarGrid stroke="#c9d8ee" />
              <PolarAngleAxis dataKey="feature" tick={{ fill: FOG, fontSize: 9 }} />
              <Radar name="Us" dataKey="us" stroke={SIGNAL} fill={SIGNAL} fillOpacity={0.25} />
              <Radar name="Weekly" dataKey="weekly" stroke={STEEL} fill={STEEL} fillOpacity={0.08} />
              <Tooltip content={<Tip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Mastery jump" stat="+35 pts" delay={0.1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={masteryBars} barGap={2}>
              <XAxis dataKey="topic" tick={{ fill: FOG, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="before" name="Before" fill={STEEL} radius={[6, 6, 0, 0]} />
              <Bar dataKey="after" name="After" fill={ICE} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Features vs chat" stat="6/6" delay={0.15}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={features} layout="vertical" margin={{ left: 4 }} barSize={8}>
              <XAxis type="number" hide domain={[0, 100]} />
              <YAxis type="category" dataKey="feature" width={88} tick={{ fill: FOG, fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="us" name="Us" fill={SIGNAL} radius={[0, 6, 6, 0]} />
              <Bar dataKey="chat" name="Chat" fill={STEEL} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  )
}
