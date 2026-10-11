'use client'
import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, Atom, BookOpen, Brain, Calculator, FlaskConical, Search, Zap } from 'lucide-react'
import { REFRESH_TOPICS, type RefreshBucket } from '@/lib/study/refresh'
import type { ExamFocus } from '@/lib/schema'
import { cn } from '@/lib/utils'
const FILTERS: Array<{id: RefreshBucket | 'all'; label: string}> = [
  {id:'all',label:'All'}, {id:'math',label:'Math'}, {id:'english',label:'English'},
  {id:'reading',label:'Reading'}, {id:'science',label:'Science'},
]

const BUCKET_STYLE: Record<RefreshBucket, { color: string; bg: string; shadow: string; Icon: typeof Calculator }> = {
  math: { color: '#1cb0f6', bg: 'bg-[#e8f6ff]', shadow: 'shadow-[0_6px_0_#b9e5ff]', Icon: Calculator },
  english: { color: '#58cc02', bg: 'bg-[#edffe6]', shadow: 'shadow-[0_6px_0_#c8efb8]', Icon: BookOpen },
  reading: { color: '#ce82ff', bg: 'bg-[#f6eaff]', shadow: 'shadow-[0_6px_0_#e2c4f6]', Icon: Brain },
  science: { color: '#ff9600', bg: 'bg-[#fff2df]', shadow: 'shadow-[0_6px_0_#ffd49b]', Icon: FlaskConical },
}

type HoverPreview = { title: string; prompt: string; choices: string[]; top: number; left: number }

export function RefreshClient({ examFocus = 'both', onPreviewTopic }: { examFocus?: ExamFocus; onPreviewTopic?: () => void } = {}) {
  const [query,setQuery] = React.useState('')
  const [bucket,setBucket] = React.useState<RefreshBucket | 'all'>('all')
  const [hover, setHover] = React.useState<HoverPreview | null>(null)
  const filters = FILTERS.filter((filter) => examFocus === 'SAT' ? filter.id !== 'science' : true)
  const filtered = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    return REFRESH_TOPICS.filter(({level,bucket:group}) => {
      const examOk = examFocus === 'both' || (examFocus === 'SAT' ? level.sat : level.act)
      return examOk && (bucket === 'all' || bucket === group) && (!search ||
        [level.title,level.category,...level.topicMatch].some(text => text.toLowerCase().includes(search)))
    })
  },[query,bucket,examFocus])
  function showExample(event: React.SyntheticEvent<HTMLElement>, level: { title: string; problems: Array<{ prompt: string; choices: Array<{ key: string; text: string }> }> }) {
    const problem = level.problems[0]
    if (!problem) {
      setHover(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 320
    const left = rect.right + 12 + width < window.innerWidth ? rect.right + 12 : Math.max(12, rect.left - width - 12)
    const top = Math.min(rect.top, window.innerHeight - 280)
    setHover({
      title: level.title,
      prompt: problem.prompt,
      choices: problem.choices.slice(0, 4).map((choice) => `${choice.key}. ${choice.text}`),
      top: Math.max(12, top),
      left,
    })
  }

  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 pt-4">
    <div className="relative rounded-[1.5rem] border-4 border-[#e5e5e5] bg-white p-2 shadow-[0_6px_0_#e5e5e5]">
      <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[#afafaf]" />
      <input aria-label="Search topics" value={query} onChange={event=>setQuery(event.target.value)}
        placeholder="Search a topic like slope, commas, inference, probability…" className="h-14 w-full rounded-[1.1rem] bg-[#f7f7f7] pl-12 pr-4 text-base font-bold text-[#3c3c3c] outline-none focus:bg-white focus:ring-2 focus:ring-[#1cb0f6]" />
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Filter topics">
      {filters.map(filter=><button key={filter.id} type="button" aria-pressed={bucket===filter.id}
        onClick={()=>setBucket(filter.id)} className={cn('rounded-2xl border-2 px-4 py-2 text-sm font-extrabold transition active:translate-y-0.5',bucket===filter.id?'border-[#58cc02] bg-[#58cc02] text-white shadow-[0_4px_0_#46a302]':'border-[#e5e5e5] bg-white text-[#777] shadow-[0_4px_0_#e5e5e5] hover:text-[#3c3c3c]')}>{filter.label}</button>)}
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-extrabold text-[#777]" role="status">{filtered.length} topics ready</p>
      <p className="inline-flex items-center gap-2 rounded-full bg-[#fff2df] px-3 py-1 text-xs font-extrabold text-[#c27000]">
        <Zap className="h-4 w-4" /> Tap any topic to start a review round
      </p>
    </div>

    {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map(({level,href,bucket: group})=>{
        const style = BUCKET_STYLE[group]
        const Icon = style.Icon
        const card = (
            <>
            <div className={cn('mb-4 flex h-14 w-14 items-center justify-center rounded-2xl', style.bg)} style={{ color: style.color }}>
              <Icon className="h-7 w-7" />
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#afafaf]">{level.category}</p>
              <h2 className="mt-1 text-lg font-extrabold leading-tight text-[#3c3c3c]">{level.title}</h2>
              <p className="mt-3 flex items-center gap-2 text-sm font-extrabold" style={{ color: style.color }}>
                Start review <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
              </p>
            </div>
            <Atom className="absolute -right-5 -top-5 h-20 w-20 text-[#f0f0f0]" />
            </>
        )
        const className = cn('group relative overflow-hidden rounded-[1.75rem] border-4 border-[#e5e5e5] bg-white p-5 text-left transition hover:-translate-y-1 hover:border-[#1cb0f6] focus-visible:outline-2 focus-visible:outline-[#1cb0f6]', style.shadow)
        return onPreviewTopic ? (
          <button key={href} type="button" onClick={onPreviewTopic} onMouseEnter={(event) => showExample(event, level)} onMouseLeave={() => setHover(null)} onFocus={(event) => showExample(event, level)} onBlur={() => setHover(null)} className={className}>{card}</button>
        ) : (
          <Link key={href} href={href} onMouseEnter={(event) => showExample(event, level)} onMouseLeave={() => setHover(null)} onFocus={(event) => showExample(event, level)} onBlur={() => setHover(null)} className={className}>{card}</Link>
        )
      })}
    </div> : <div className="rounded-2xl border border-line bg-white p-6">
      <p className="text-sm text-fog">No topics match your search.</p>
      <button type="button" onClick={()=>{setQuery('');setBucket('all')}} className="mt-3 text-sm font-semibold text-signal">Show all topics</button>
    </div>}
    {hover ? (
      <div className="pointer-events-none fixed z-50 w-80 rounded-2xl border-2 border-[#1cb0f6] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.16)]" style={{ top: hover.top, left: hover.left }}>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#1cb0f6]">Example · {hover.title}</p>
        <p className="mt-2 text-sm font-bold leading-5 text-[#3c3c3c]">{hover.prompt}</p>
        <div className="mt-3 space-y-1">
          {hover.choices.map((choice) => <p key={choice} className="text-xs font-semibold text-[#555]">{choice}</p>)}
        </div>
      </div>
    ) : null}
  </div>
}
