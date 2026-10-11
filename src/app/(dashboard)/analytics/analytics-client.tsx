'use client'

import * as React from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { LANGUAGE_KEY, t, isUiLanguage, type UiLanguage } from '@/lib/i18n'

export interface ScoreAttempt {
  is_correct: boolean
  time_seconds: number
  created_at: string
  test_type: string | null
  section_name: string | null
}

export interface ScheduleDay {
  date: string
  done: boolean
}

export interface TopicPercent {
  name: string
  group: 'math' | 'verbal'
  percent: number
}

type RangeId = 'day' | 'week' | 'month' | 'half' | 'custom'

const RANGES: Array<{ id: RangeId; key: 'day' | 'week' | 'month' | 'half' | 'custom' }> = [
  { id: 'day', key: 'day' },
  { id: 'week', key: 'week' },
  { id: 'month', key: 'month' },
  { id: 'half', key: 'half' },
  { id: 'custom', key: 'custom' },
]

function dayKey(iso: string) {
  return iso.slice(0, 10)
}

function inRange(iso: string, range: RangeId, from: string, to: string) {
  const day = dayKey(iso)
  if (range === 'custom') return day >= from && day <= to
  const span = range === 'day' ? 1 : range === 'week' ? 7 : range === 'month' ? 30 : 182
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (span - 1))
  return day >= start.toISOString().slice(0, 10)
}

function pct(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

function isMath(section: string | null) {
  return (section ?? '').toLowerCase().includes('math')
}

function isEnglish(section: string | null) {
  const name = (section ?? '').toLowerCase()
  return name.includes('english') || name.includes('reading') || name.includes('writing')
}

export function AnalyticsClient({
  attempts,
  schedule,
  topics,
  language,
}: {
  attempts: ScoreAttempt[]
  schedule: ScheduleDay[]
  topics: TopicPercent[]
  language: string
}) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 6)
  const [uiLanguage, setUiLanguage] = React.useState<UiLanguage>(isUiLanguage(language) ? language : 'en')
  const [range, setRange] = React.useState<RangeId>('week')
  const [from, setFrom] = React.useState(weekAgo.toISOString().slice(0, 10))
  const [to, setTo] = React.useState(today)
  const [perfectOpen, setPerfectOpen] = React.useState(false)
  const copy = (key: Parameters<typeof t>[1]) => t(uiLanguage, key)

  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      if (isUiLanguage(saved)) setUiLanguage(saved)
    } catch { /* ignore */ }
  }, [])

  const filtered = attempts.filter((attempt) => inRange(attempt.created_at, range, from, to))
  const correct = filtered.filter((attempt) => attempt.is_correct).length
  const incorrect = filtered.length - correct
  const averageTime = filtered.length
    ? Math.round(filtered.reduce((sum, attempt) => sum + attempt.time_seconds, 0) / filtered.length)
    : 0

  const byDay = new Map<string, { mathCorrect: number; mathTotal: number; englishCorrect: number; englishTotal: number; load: number }>()
  for (const attempt of filtered) {
    const key = dayKey(attempt.created_at)
    const row = byDay.get(key) ?? { mathCorrect: 0, mathTotal: 0, englishCorrect: 0, englishTotal: 0, load: 0 }
    row.load += 1
    if (isMath(attempt.section_name)) {
      row.mathTotal += 1
      if (attempt.is_correct) row.mathCorrect += 1
    } else if (isEnglish(attempt.section_name)) {
      row.englishTotal += 1
      if (attempt.is_correct) row.englishCorrect += 1
    }
    byDay.set(key, row)
  }
  const trend = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({
    date: date.slice(5),
    math: row.mathTotal ? pct(row.mathCorrect, row.mathTotal) : null,
    english: row.englishTotal ? pct(row.englishCorrect, row.englishTotal) : null,
    load: row.load,
  }))
  const latestMath = [...trend].reverse().find((row) => row.math != null)?.math ?? 0
  const latestEnglish = [...trend].reverse().find((row) => row.english != null)?.english ?? 0

  const scheduled = schedule.filter((day) => inRange(day.date, range, from, to))
  const doneDays = scheduled.filter((day) => day.done).length
  const missedDays = scheduled.length - doneDays

  const sat = filtered.filter((attempt) => (attempt.test_type ?? '').toUpperCase() === 'SAT')
  const act = filtered.filter((attempt) => (attempt.test_type ?? '').toUpperCase() === 'ACT')
  const satScore = pct(sat.filter((attempt) => attempt.is_correct).length, sat.length)
  const actScore = pct(act.filter((attempt) => attempt.is_correct).length, act.length)
  const satTime = sat.length ? sat.reduce((sum, attempt) => sum + attempt.time_seconds, 0) / sat.length : 0
  const actTime = act.length ? act.reduce((sum, attempt) => sum + attempt.time_seconds, 0) / act.length : 0
  const recommendation = sat.length > 0 && act.length > 0
    ? (satScore > actScore && satTime < actTime ? 'SAT' : actScore > satScore && actTime < satTime ? 'ACT' : null)
    : null

  const mathTopics = topics.filter((topic) => topic.group === 'math')
  const verbalTopics = topics.filter((topic) => topic.group === 'verbal')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16 pt-2" dir={uiLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={range === item.id
              ? 'rounded-full bg-[#1cb0f6] px-4 py-2 text-sm font-black text-white shadow-[0_4px_0_#1899d6]'
              : 'rounded-full bg-white px-4 py-2 text-sm font-bold text-[#64748b] ring-1 ring-[#e2e8f0]'}
          >
            {copy(item.key)}
          </button>
        ))}
      </div>
      {range === 'custom' && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-bold text-[#334155]">{copy('from')}
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="ml-2 rounded-xl border border-[#e2e8f0] px-3 py-2" />
          </label>
          <label className="text-sm font-bold text-[#334155]">{copy('to')}
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="ml-2 rounded-xl border border-[#e2e8f0] px-3 py-2" />
          </label>
        </div>
      )}

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#64748b]">{copy('answered')}</p>
        <p className="font-display text-6xl text-[#173d6e]">{filtered.length}</p>
        <h2 className="mt-2 font-display text-2xl">{copy('pie')}</h2>
        {filtered.length === 0 ? <p className="mt-4 text-sm font-bold text-[#64748b]">{copy('noData')}</p> : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ name: copy('correct'), value: correct }, { name: copy('incorrect'), value: incorrect }]} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88}>
                  <Cell fill="#58cc02" />
                  <Cell fill="#ff4b4b" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-sm font-bold text-[#64748b]">{copy('correct')} {correct} · {copy('incorrect')} {incorrect}</p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
        <h2 className="font-display text-2xl">{copy('trend')}</h2>
        <div className="mt-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} onClick={() => undefined}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <ReferenceLine y={100} stroke="#111827" strokeWidth={3} strokeDasharray="6 4" label={{ value: copy('perfect'), position: 'insideTopRight', fill: '#111827' }} onClick={() => setPerfectOpen(true)} />
              <Line type="monotone" dataKey="math" name={copy('math')} stroke="#1cb0f6" strokeWidth={3} connectNulls dot={false} />
              <Line type="monotone" dataKey="english" name={copy('english')} stroke="#ff9600" strokeWidth={3} connectNulls dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <button type="button" onClick={() => setPerfectOpen((open) => !open)} className="mt-2 text-sm font-black text-[#111827] underline">{copy('perfect')}</button>
        {perfectOpen && (
          <p className="mt-3 rounded-2xl bg-[#f8fafc] p-4 text-sm font-bold leading-6 text-[#334155]">
            {copy('perfectBody')} {copy('math')} {latestMath}% — {100 - latestMath} {copy('away')}. {copy('english')} {latestEnglish}% — {100 - latestEnglish} {copy('away')}.
          </p>
        )}
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
        <h2 className="font-display text-2xl">{copy('load')}</h2>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid stroke="#e2e8f0" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="load" name={copy('answered')} fill="#58cc02" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm font-bold text-[#334155]">{copy('avgTime')}: {averageTime} {copy('seconds')}</p>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
        <h2 className="font-display text-2xl">{copy('schedule')}</h2>
        <p className="mt-2 text-sm font-bold text-[#334155]">{copy('doneDays')} {doneDays} · {copy('missedDays')} {missedDays}</p>
        <p className="text-sm font-bold text-[#334155]">{copy('ratio')} {doneDays}/{scheduled.length || 0} · {pct(doneDays, scheduled.length)}%</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {scheduled.map((day) => (
            <span key={day.date} className={day.done ? 'rounded-xl bg-[#58cc02] px-3 py-2 text-xs font-black text-white' : 'rounded-xl bg-[#ff4b4b] px-3 py-2 text-xs font-black text-white'}>
              {day.date.slice(5)}
            </span>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {[{ title: copy('math'), rows: mathTopics }, { title: copy('english'), rows: verbalTopics }].map((group) => (
          <div key={group.title} className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
            <h2 className="font-display text-2xl">{copy('topics')} · {group.title}</h2>
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {group.rows.map((topic, index) => (
                <div key={`${group.title}-${index}-${topic.name}`}>
                  <div className="flex justify-between text-xs font-bold text-[#334155]"><span>{topic.name}</span><span>{topic.percent}%</span></div>
                  <div className="mt-1 h-2 rounded-full bg-[#e2e8f0]"><div className="h-2 rounded-full bg-[#1cb0f6]" style={{ width: `${topic.percent}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-[0_10px_0_#e2e8f0]">
        <h2 className="font-display text-2xl">{copy('easier')}</h2>
        <p className="mt-2 text-sm font-bold text-[#334155]">SAT {satScore}% · {Math.round(satTime)} {copy('seconds')} · {sat.length} {copy('questions')}</p>
        <p className="text-sm font-bold text-[#334155]">ACT {actScore}% · {Math.round(actTime)} {copy('seconds')} · {act.length} {copy('questions')}</p>
        <p className="mt-3 text-base font-black text-[#173d6e]">
          {copy('recommend')}: {recommendation ?? (sat.length && act.length ? copy('neither') : copy('needBoth'))}
          {recommendation ? ` — ${copy('higherAndFaster')}` : ''}
        </p>
      </section>
    </div>
  )
}
