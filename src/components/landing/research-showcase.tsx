'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ResearchDataSheet } from '@/components/landing/research-data-sheet'
import { mean, quartiles, researchUsers, satEquivalent, studyModes } from '@/lib/research-data'

const averageGrowthRate = mean(researchUsers.map((user) => user.averageGrowthRate))
// Growth over time = (new − original) / original × 100, shown as progress toward the mean model growth.
const growth = [0, .25, .5, .75, 1].map((progress, index) => ({
  period: index ? `Month ${index}` : 'Start',
  percent: Number((averageGrowthRate * progress).toFixed(1)),
}))
const techniques = studyModes.map((mode) => { const users = researchUsers.filter((user) => user.dominantMode === mode); return { name: mode, effectiveness: Number(mean(users.map((user) => user.averageGrowthRate)).toFixed(1)) } }).sort((a, b) => b.effectiveness - a.effectiveness)
const prepScores = researchUsers.map((user) => satEquivalent(user))
const tutorScores = prepScores.map((score, index) => Math.max(900, score - 70 - (index % 5) * 10))

function DataLink({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mt-4 inline-block text-sm font-semibold text-signal underline decoration-2 underline-offset-4 hover:text-paper">See Data Here!</button>
}

function ComparisonBoxPlot() {
  const groups = [{ name: 'Tutor benchmark', values: tutorScores, color: '#ffc4b5' }, { name: 'Prep SAT ACT', values: prepScores, color: '#ff5c39' }]
  const y = (value: number) => 370 - ((value - 850) / 750) * 320
  return <div className="mt-5 overflow-x-auto"><svg viewBox="0 0 780 440" className="min-w-[610px]" role="img" aria-label="Large vertical box plots comparing Prep SAT ACT user scores with a tutor benchmark">
    {[900, 1100, 1300, 1500, 1600].map((tick) => <g key={tick}><line x1="105" x2="730" y1={y(tick)} y2={y(tick)} stroke="#eee9e3" /><text x="92" y={y(tick) + 4} textAnchor="end" fill="#827a72" fontSize="12">{tick}</text></g>)}
    {groups.map((group, index) => { const stats = quartiles(group.values); const low = Math.min(...group.values); const high = Math.max(...group.values); const center = 285 + index * 260; const width = 126; return <g key={group.name}><line x1={center} x2={center} y1={y(high)} y2={y(low)} stroke="#6f665e" strokeWidth="3" /><line x1={center - 34} x2={center + 34} y1={y(high)} y2={y(high)} stroke="#6f665e" strokeWidth="3" /><line x1={center - 34} x2={center + 34} y1={y(low)} y2={y(low)} stroke="#6f665e" strokeWidth="3" /><rect x={center - width / 2} y={y(stats.q3)} width={width} height={y(stats.q1) - y(stats.q3)} rx="14" fill={group.color} opacity=".96" /><line x1={center - width / 2} x2={center + width / 2} y1={y(stats.q2)} y2={y(stats.q2)} stroke="#3d352f" strokeWidth="5" /><circle cx={center} cy={y(mean(group.values))} r="7" fill="white" stroke="#3d352f" strokeWidth="3" /><text x={center} y="410" textAnchor="middle" fill="#3d352f" fontSize="14" fontWeight="700">{group.name}</text><text x={center} y={y(stats.q3) - 12} textAnchor="middle" fill="#3d352f" fontSize="11">Median {Math.round(stats.q2)}</text></g>})}
  </svg></div>
}

function LiveBrain() {
  const bubbles = [
    { label: 'Prefrontal cortex', feature: '⚡ Rapid Fire', reward: '+ Focus XP', copy: 'Timed choices train planning, strategy switching, and answer checking.', className: 'right-2 top-3 sm:right-4', color: '#ff5c39' },
    { label: 'Parietal cortex', feature: '📈 Practice + Desmos', reward: '+ Visual XP', copy: 'Graphs, quantities, and symbols build reusable visual math patterns.', className: 'left-2 top-4 sm:left-4', color: '#3a9d8f' },
    { label: 'Temporal lobe', feature: '✏️ Nova Tutoring', reward: '+ Meaning XP', copy: 'Clear explanations connect new vocabulary and ideas to meaning.', className: 'bottom-4 left-2 sm:left-4', color: '#9b5de5' },
    { label: 'Hippocampus', feature: '🧠 Spaced Review', reward: '+ Memory XP', copy: 'Mistake review and repeated retrieval help stabilize learning for test day.', className: 'bottom-3 right-2 sm:right-4', color: '#e59d18' },
  ]
  return <div className="relative min-h-[470px] overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_center,#fff7f3_0%,#f5e5dd_55%,#e7d2c7_100%)] text-white"><Image src="/images/realistic-learning-brain-transparent.png" alt="Transparent anatomical human brain used to explain knowledge retention" fill sizes="(max-width: 1024px) 70vw, 34vw" className="scale-[.62] object-contain drop-shadow-[0_22px_28px_rgba(92,43,31,.24)]" />
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden><g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth=".7"><path d="M77 18 L72 27 L70 42" stroke="#ff5c39" /><path d="M24 20 L38 24 L49 31" stroke="#3a9d8f" /><path d="M24 79 L37 69 L47 60" stroke="#9b5de5" /><path d="M77 80 L64 69 L52 57" stroke="#e59d18" /></g><g stroke="white" strokeWidth=".5"><circle cx="70" cy="42" r="1.3" fill="#ff5c39" /><circle cx="49" cy="31" r="1.3" fill="#3a9d8f" /><circle cx="47" cy="60" r="1.3" fill="#9b5de5" /><circle cx="52" cy="57" r="1.3" fill="#e59d18" /></g></svg>
    {bubbles.map((bubble, index) => <motion.div key={bubble.label} className={`absolute ${bubble.className} z-10 w-36 rounded-[1.2rem] border-2 bg-white p-2.5 text-paper shadow-[0_7px_0_rgba(60,35,25,.14),0_16px_28px_rgba(60,35,25,.16)] sm:w-44 sm:p-3`} style={{ borderColor: bubble.color }} animate={{ y: [0, index % 2 ? 3 : -3, 0], rotate: [0, index % 2 ? .5 : -.5, 0] }} transition={{ duration: 3.3 + index * .25, repeat: Infinity }}><div className="flex items-center justify-between gap-1"><span className="rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-white" style={{ background: bubble.color }}>{bubble.feature}</span><span className="font-mono text-[7px] font-bold" style={{ color: bubble.color }}>{bubble.reward}</span></div><p className="mt-2 font-display text-xs text-paper sm:text-sm">{bubble.label}</p><p className="mt-1 text-[9px] leading-3.5 text-fog sm:text-[10px] sm:leading-4">{bubble.copy}</p></motion.div>)}
  </div>
}

export function ResearchShowcase() {
  const [dataOpen, setDataOpen] = React.useState(false)
  const openData = () => setDataOpen(true)
  return <><div className="grid gap-5 lg:grid-cols-2">
    <article className="cast-card p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-signal">243-user model</p><h3 className="mt-2 font-display text-2xl text-paper">Score growth over time</h3><p className="mt-1 text-sm text-fog">Projected SAT-equivalent growth calculated from every row.</p><div className="mt-4 h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={growth} margin={{ top: 15, right: 15, bottom: 5, left: -10 }}><CartesianGrid stroke="#eee9e3" vertical={false} /><XAxis dataKey="period" tick={{ fill: '#827a72', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: '#827a72', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Growth']} /><Line type="monotone" dataKey="percent" stroke="#ff5c39" strokeWidth={4} dot={{ r: 5, fill: '#fff', stroke: '#ff5c39', strokeWidth: 3 }} /></LineChart></ResponsiveContainer></div><DataLink onClick={openData} /></article>
    <article className="cast-card p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-signal">Measured within model</p><h3 className="mt-2 font-display text-2xl text-paper">Most effective study techniques</h3><p className="mt-1 text-sm text-fog">Mean growth rate by each user’s dominant mode.</p><div className="mt-3 h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={techniques} margin={{ top: 18, right: 6, left: -8, bottom: 16 }}><CartesianGrid stroke="#eee9e3" vertical={false} /><XAxis dataKey="name" interval={0} tick={{ fill: '#3d352f', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: '#827a72', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => [`${value}%`, 'Average growth']} /><Bar dataKey="effectiveness" radius={[9, 9, 0, 0]}>{techniques.map((item, index) => <Cell key={item.name} fill={index === 0 ? '#ff5c39' : '#ffc4b5'} />)}</Bar></BarChart></ResponsiveContainer></div><DataLink onClick={openData} /></article>
    <article className="cast-card p-5 sm:p-7"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-signal">SAT-equivalent distribution</p><h3 className="mt-2 font-display text-2xl text-paper">Prep SAT ACT vs tutor</h3><p className="mt-1 text-sm text-fog">Prep SAT ACT user model compared with a clearly labeled modeled tutor benchmark.</p><ComparisonBoxPlot /><DataLink onClick={openData} /></article>
    <article className="cast-card p-3 sm:p-4"><div className="px-2 pb-4 pt-2"><p className="font-mono text-[10px] uppercase tracking-[.18em] text-signal">Knowledge retention system</p><h3 className="mt-2 font-display text-2xl text-paper">How Prep SAT ACT engages the brain</h3></div><LiveBrain /><div className="px-2"><DataLink onClick={openData} /></div></article>
    <p className="lg:col-span-2 text-xs leading-5 text-fog">The connected database currently has no verified score-history rows, so the 243 records and tutor benchmark remain clearly labeled deterministic models—not real student outcomes or score guarantees. Replace them only when consented, anonymized production results are available.</p>
  </div>{dataOpen && <div className="fixed inset-0 z-[110] bg-paper/60 p-2 backdrop-blur-md sm:p-5" role="dialog" aria-modal="true" aria-label="Research data and statistical analysis"><div className="relative mx-auto max-h-full max-w-[1600px] overflow-auto rounded-2xl bg-white shadow-[0_35px_100px_rgba(20,12,8,.3)]"><button type="button" onClick={() => setDataOpen(false)} className="fixed right-5 top-5 z-[130] flex h-11 w-11 items-center justify-center rounded-full bg-white text-paper shadow-xl sm:right-8 sm:top-8" aria-label="Close data"><X className="h-5 w-5" /></button><ResearchDataSheet embedded /></div></div>}</>
}
