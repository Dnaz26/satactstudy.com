'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, BarChart3, Download, Search } from 'lucide-react'
import { mean, median, quartiles, researchUsers, studyModes } from '@/lib/research-data'

const equivalentChanges = researchUsers.map((user) => user.test === 'SAT' ? user.projectedScoreChange : user.projectedScoreChange * (1600 / 36))
const growthRates = researchUsers.map((user) => user.averageGrowthRate)
const studyMinutes = researchUsers.map((user) => user.averageStudyMinutes)
const growthQuartiles = quartiles(growthRates)
const growthMean = mean(growthRates)
const variance = mean(growthRates.map((value) => (value - growthMean) ** 2))
const standardDeviation = Math.sqrt(variance)
const lowerFence = growthQuartiles.q1 - growthQuartiles.iqr * 1.5
const upperFence = growthQuartiles.q3 + growthQuartiles.iqr * 1.5
const outliers = growthRates.filter((value) => value < lowerFence || value > upperFence)
const skewness = mean(growthRates.map((value) => ((value - growthMean) / standardDeviation) ** 3))
const confidenceMargin = 1.96 * standardDeviation / Math.sqrt(researchUsers.length)
const format = (value: number, digits = 1) => value.toFixed(digits)

const summary = [
  ['Records', researchUsers.length.toString()], ['Mean growth', `${format(growthMean)}%`], ['Median growth', `${format(median(growthRates))}%`],
  ['Q1 / Q3', `${format(growthQuartiles.q1)}% / ${format(growthQuartiles.q3)}%`], ['IQR', `${format(growthQuartiles.iqr)} pts`], ['Std. deviation', `${format(standardDeviation, 2)} pts`],
  ['Minimum / maximum', `${format(Math.min(...growthRates))}% / ${format(Math.max(...growthRates))}%`], ['Outliers (1.5× IQR)', outliers.length.toString()],
  ['Distribution shape', Math.abs(skewness) < .35 ? 'Approximately symmetric' : skewness > 0 ? 'Right-skewed' : 'Left-skewed'], ['Skewness', format(skewness, 2)],
  ['95% CI, mean growth', `${format(growthMean - confidenceMargin)}–${format(growthMean + confidenceMargin)}%`], ['Avg. SAT-eq. change', `+${Math.round(mean(equivalentChanges))}`],
  ['Avg. study time', `${Math.round(mean(studyMinutes))} min`], ['Range', `${format(Math.max(...growthRates) - Math.min(...growthRates))} pts`],
]

function downloadCsv() {
  const headers = ['User', 'SAT / ACT', 'Study path', 'Baseline score', 'Current score', 'Average growth rate', 'Average study time', 'Projected score change', 'Signup time', ...studyModes.map((mode) => `${mode} %`), 'Most-used mode']
  const rows = researchUsers.map((user) => [user.name, user.test, user.path, user.baselineScore, user.currentScore, user.averageGrowthRate, user.averageStudyMinutes, user.projectedScoreChange, user.signupTime, ...studyModes.map((mode) => user.modes[mode]), user.dominantMode])
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'prep-sat-act-research-model.csv'; anchor.click(); URL.revokeObjectURL(url)
}

export function ResearchDataSheet({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = React.useState('')
  const visible = researchUsers.filter((user) => `${user.name} ${user.test} ${user.path} ${user.dominantMode}`.toLowerCase().includes(query.toLowerCase()))
  return <main className={`${embedded ? 'min-h-0' : 'min-h-screen'} bg-[#ecebe8] text-[#1f1f1f]`}>
    <header className="border-b border-[#b7b7b7] bg-[#217346] px-4 py-3 text-white"><div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Link href="/#research" className="rounded p-2 hover:bg-white/10" aria-label="Back to research"><ArrowLeft className="h-5 w-5" /></Link><BarChart3 className="h-6 w-6" /><div><h1 className="text-base font-semibold">Research_Model_243.xlsx</h1><p className="text-xs text-white/70">Synthetic dataset · formulas reconciled</p></div></div><button onClick={downloadCsv} className="inline-flex items-center gap-2 rounded border border-white/25 bg-white/10 px-3 py-2 text-sm hover:bg-white/20"><Download className="h-4 w-4" /> Download CSV</button></div></header>
    <div className="border-b border-[#c9c9c9] bg-[#f6f6f6] px-4 py-2"><div className="mx-auto flex max-w-[1600px] items-center gap-4 text-xs"><span className="font-semibold">File</span><span>Home</span><span>Insert</span><span>Data</span><span>Formulas</span><span className="ml-auto text-[#217346]">243 of 243 records</span></div></div>
    <section className="mx-auto grid max-w-[1600px] gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <div className="min-w-0 overflow-hidden border border-[#a6a6a6] bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-[#c9c9c9] bg-[#f3f3f3] p-2"><div className="flex flex-1 items-center gap-2 border border-[#a6a6a6] bg-white px-3 py-1.5"><Search className="h-4 w-4 text-[#666]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter users, test, path, or mode" className="w-full bg-transparent text-sm outline-none" /></div><span className="text-xs text-[#666]">{visible.length} rows</span></div>
        <div className={embedded ? 'max-h-[58vh] overflow-auto' : 'max-h-[calc(100vh-190px)] overflow-auto'}><table className="w-max min-w-full border-collapse text-[11px]"><thead className="sticky top-0 z-20"><tr>{['User', 'SAT / ACT', 'Study path', 'Baseline', 'Current', 'Average Growth Rate', 'Average Study Time', 'Projected Score Change', 'Signup Time', 'Tutoring %', 'Rapid Fire %', 'Game %', 'Practice Test %', 'Most-used Mode'].map((header, index) => <th key={header} className="whitespace-nowrap border border-[#b7b7b7] bg-[#d9ead3] px-3 py-2 text-left font-semibold"><span className="mr-2 text-[#777]">{String.fromCharCode(65 + index)}</span>{header}</th>)}</tr></thead><tbody>{visible.map((user, rowIndex) => <tr key={user.id} className={rowIndex % 2 ? 'bg-[#f8fbf7]' : 'bg-white'}><td className="sticky left-0 border border-[#d0d0d0] bg-inherit px-3 py-2 font-medium"><span className="mr-3 text-[#888]">{user.id}</span>{user.name}</td><td className="border border-[#d0d0d0] px-3 py-2">{user.test}</td><td className="border border-[#d0d0d0] px-3 py-2">{user.path}</td><td className="border border-[#d0d0d0] px-3 py-2 text-right">{user.baselineScore}</td><td className="border border-[#d0d0d0] px-3 py-2 text-right">{user.currentScore}</td><td className="border border-[#d0d0d0] bg-[#fff8dc] px-3 py-2 text-right">{user.averageGrowthRate}%</td><td className="border border-[#d0d0d0] px-3 py-2 text-right">{user.averageStudyMinutes} min</td><td className="border border-[#d0d0d0] px-3 py-2 text-right">+{user.projectedScoreChange}</td><td className="whitespace-nowrap border border-[#d0d0d0] px-3 py-2">{new Date(user.signupTime).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })}</td>{studyModes.map((mode) => <td key={mode} className="border border-[#d0d0d0] px-3 py-2 text-right">{user.modes[mode]}%</td>)}<td className="border border-[#d0d0d0] px-3 py-2 font-medium text-[#217346]">{user.dominantMode}</td></tr>)}</tbody></table></div>
      </div>
      <aside className="space-y-4"><div className="border border-[#a6a6a6] bg-white shadow-sm"><div className="border-b border-[#a6a6a6] bg-[#217346] px-4 py-3 text-sm font-semibold text-white">Statistical Analysis</div><div className="grid grid-cols-2">{summary.map(([label, value]) => <React.Fragment key={label}><div className="border-b border-r border-[#d0d0d0] bg-[#f3f3f3] px-3 py-2 text-xs text-[#555]">{label}</div><div className="border-b border-[#d0d0d0] px-3 py-2 text-right text-xs font-semibold">{value}</div></React.Fragment>)}</div></div>
        <div className="border border-[#a6a6a6] bg-white shadow-sm"><div className="border-b border-[#a6a6a6] bg-[#d9ead3] px-4 py-3 text-sm font-semibold">Breakdowns</div><div className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#666]">Mean growth by test</p>{(['SAT', 'ACT'] as const).map((test) => <div key={test} className="mt-2 flex justify-between border-b border-[#e2e2e2] pb-2 text-sm"><span>{test}</span><b>{format(mean(researchUsers.filter((user) => user.test === test).map((user) => user.averageGrowthRate)))}%</b></div>)}<p className="mt-5 text-xs font-semibold uppercase tracking-wide text-[#666]">Mode usage across all time</p>{studyModes.map((mode) => <div key={mode} className="mt-2"><div className="flex justify-between text-xs"><span>{mode}</span><b>{format(mean(researchUsers.map((user) => user.modes[mode])))}%</b></div><div className="mt-1 h-2 bg-[#e8e8e8]"><div className="h-full bg-[#217346]" style={{ width: `${mean(researchUsers.map((user) => user.modes[mode])) * 2.4}%` }} /></div></div>)}</div></div>
        <div className="border border-[#d6b656] bg-[#fff8dc] p-4 text-xs leading-5 text-[#665500]"><b>Data note:</b> These 243 anonymous rows are deterministic synthetic examples, not real student records. The landing-page graphs and every statistic above are calculated directly from this dataset. SAT-equivalent comparisons normalize ACT scores to a 1600-point scale.</div>
      </aside>
    </section>
  </main>
}
