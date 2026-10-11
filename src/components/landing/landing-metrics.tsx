'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CircleDollarSign, Info, ShieldCheck, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const SAT_SCORES = Array.from({ length: 13 }, (_, month) => 1000 + month * 30)
const ACT_SCORES = Array.from({ length: 13 }, (_, month) => Number((22 + month * .5).toFixed(1)))

export function LandingMetrics() {
  const [test, setTest] = React.useState<'SAT' | 'ACT'>('SAT')
  const [month, setMonth] = React.useState(12)
  const [questions, setQuestions] = React.useState(80)
  const [levels, setLevels] = React.useState(4)
  const [days, setDays] = React.useState(5)
  const scores = test === 'SAT' ? SAT_SCORES : ACT_SCORES
  const score = scores[month]
  const start = scores[0]
  const reward = questions * .01 + levels * .05 + days * .05
  const point = (value: number, index: number) => {
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    return `${24 + index * 45},${180 - ((value - min) / Math.max(1, max - min)) * 140}`
  }
  const points = scores.map(point).join(' ')

  return <div className="grid gap-5">
    <motion.article whileHover={{ y: -4 }} className="overflow-hidden rounded-[2rem] border border-line bg-white p-7 shadow-[0_24px_55px_rgba(40,24,12,.08)]">
      <p className="font-mono text-[9px] uppercase tracking-[.22em] text-signal">Average predicted score</p>
      <div className="mt-6 grid grid-cols-2 divide-x divide-line">
        <div className="pr-6"><p className="font-display text-6xl tracking-tight text-paper">1400</p><p className="mt-2 font-mono text-[10px] uppercase tracking-[.18em] text-fog">SAT</p></div>
        <div className="pl-6"><p className="font-display text-6xl tracking-tight text-paper">30</p><p className="mt-2 font-mono text-[10px] uppercase tracking-[.18em] text-fog">ACT</p></div>
      </div>
    </motion.article>

    <motion.article whileHover={{ y: -4 }} className="overflow-hidden rounded-[2rem] border border-line bg-white p-7 shadow-[0_24px_55px_rgba(40,24,12,.08)]">
      <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-signal">Modeled average user</p><h3 className="mt-2 font-display text-3xl">{test === 'SAT' ? '1,000 → 1,360' : '22 → 28'}</h3></div><div className="flex items-center gap-2"><div className="flex rounded-full border border-line bg-panel-2 p-1">{(['SAT','ACT'] as const).map((item) => <button key={item} onClick={() => setTest(item)} className={cn('rounded-full px-3 py-1.5 font-mono text-[9px] transition', test === item ? 'bg-paper text-white' : 'text-fog')}>{item}</button>)}</div><span className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-signal/10 text-signal sm:flex"><TrendingUp className="h-5 w-5" /></span></div></div>
      <div className="relative mt-5 overflow-hidden rounded-[1.4rem] bg-[linear-gradient(180deg,#fff7f3,#fff)] p-3"><svg viewBox="0 0 590 220" className="h-48 w-full" role="img" aria-label="Illustrative twelve-month score projection">{[40,75,110,145,180].map((y) => <line key={y} x1="24" x2="566" y1={y} y2={y} stroke="#eadfd8" strokeDasharray="5 6" />)}<defs><linearGradient id="interactiveScoreArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff5c39" stopOpacity=".3" /><stop offset="1" stopColor="#ff5c39" stopOpacity="0" /></linearGradient></defs><polygon points={`24,180 ${points} 564,180`} fill="url(#interactiveScoreArea)" /><polyline points={points} fill="none" stroke="#ff5c39" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />{scores.map((value,index) => { const [x,y] = point(value,index).split(','); return <g key={index}><circle cx={x} cy={y} r={month === index ? 8 : 4} fill={month === index ? '#171310' : '#fff'} stroke="#ff5c39" strokeWidth="3" /><rect x={Number(x)-15} y={Number(y)-15} width="30" height="30" fill="transparent" className="cursor-pointer" onMouseEnter={() => setMonth(index)} /></g>})}<text x="24" y="208" fill="#827a72" fontSize="11">Start · {start}</text><text x="566" y="208" textAnchor="end" fill="#827a72" fontSize="11">Month 12 · {scores[12]}</text></svg><div className="absolute right-5 top-5 rounded-full border border-line bg-white px-3 py-1.5 font-mono text-[9px] text-paper shadow">Month {month}: {score}</div></div>
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-panel-2 p-3 text-[10px] leading-4 text-fog"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" /> Hover over a point to inspect the modeled path. The curve is illustrative, not observed score-growth data.</div>
    </motion.article>

    <motion.article whileHover={{ y: -4 }} className="relative overflow-hidden rounded-[2rem] p-7 text-white shadow-[0_28px_65px_rgba(15,50,35,.22)]" style={{ background: 'linear-gradient(145deg,#173226,#0e2119)' }}>
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" /><div className="relative flex items-start justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-emerald-300">Reward calculator</p><h3 className="mt-2 max-w-sm font-display text-3xl">See consistent work add up.</h3></div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-300 text-[#153024]"><CircleDollarSign className="h-6 w-6" /></span></div>
      <div className="relative mt-6 rounded-[1.5rem] border border-white/10 bg-white/[.055] p-5"><p className="font-mono text-[8px] uppercase tracking-[.18em] text-white/40">Illustrative weekly balance</p><motion.p key={reward} initial={{ opacity: .4, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 font-display text-6xl text-emerald-300">${reward.toFixed(2)}</motion.p><div className="mt-5 space-y-4">{[{label:'Questions',value:questions,set:setQuestions,max:300},{label:'Levels',value:levels,set:setLevels,max:20},{label:'Daily task bonuses',value:days,set:setDays,max:7}].map((item) => <label key={item.label} className="block"><span className="flex justify-between text-[10px] text-white/55"><span>{item.label}</span><strong className="text-white">{item.value}</strong></span><input type="range" min="0" max={item.max} value={item.value} onChange={(event) => item.set(Number(event.target.value))} className="mt-2 w-full accent-emerald-300" /></label>)}</div></div>
      <div className="relative mt-5 flex items-start gap-2 text-[10px] leading-4 text-white/45"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />Reward calculator preview. Payouts remain unavailable until eligibility and terms are published.</div>
      <div className="relative mt-5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">Build the habit <ArrowUpRight className="h-4 w-4" /></div>
    </motion.article>
  </div>
}
