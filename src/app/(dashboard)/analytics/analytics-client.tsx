'use client'

import * as React from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { daysUntil, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Snapshot {
  date: string
  predicted_sat: number | null
  predicted_act: number | null
  ovr_score: number | null
  accuracy: number
  total_questions: number
  study_time_minutes: number
}

interface TopicMasteryRow {
  id: string
  topic_id: string
  overall_mastery: number
  knowledge_mastery: number
  speed_mastery: number
  total_attempts: number
  correct_attempts: number
  avg_time_seconds: number
  trend: string
  topics?: { name: string; categories?: { name: string } | null } | null
}

interface Prediction {
  predicted_total: number
  score_low: number
  score_high: number
  confidence: number
  ovr_score: number
  predicted_math: number | null
  predicted_reading_writing: number | null
  predicted_english?: number | null
  predicted_reading?: number | null
  predicted_science?: number | null
}

interface Profile {
  target_score: number | null
  target_test: string | null
  test_date: string | null
  daily_minutes?: number | null
}

interface Attempt {
  is_correct: boolean
  time_seconds: number
  difficulty: string
  created_at: string
  hint_used: boolean
  tutor_used: boolean
  desmos_used: boolean
  mistake_type: string | null
  test_type: string | null
  section_name: string | null
  category_name: string | null
  topic_name: string | null
}

interface AnalyticsClientProps {
  snapshots: Snapshot[]
  topicMastery: TopicMasteryRow[]
  latestPrediction: Prediction | null
  profile: Profile | null
  recentAttempts: Attempt[]
}

const AQUA = '#2ec4b6'
const GREEN = '#7ed99a'
const MUTED = '#5a8a86'
const GRID = 'rgba(15,118,110,0.12)'

const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  border: `1px solid ${GRID}`,
  borderRadius: '8px',
  color: '#134e4a',
  fontSize: 12,
}

type SectionId = 'overview' | 'accuracy' | 'timing' | 'tests' | 'mastery' | 'forecast' | 'topics'

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length)
}

function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0
}

function groupAccuracy(attempts: Attempt[], key: (a: Attempt) => string) {
  const map = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const name = key(a) || 'Other'
    const row = map.get(name) ?? { correct: 0, total: 0 }
    row.total += 1
    if (a.is_correct) row.correct += 1
    map.set(name, row)
  }
  return [...map.entries()]
    .map(([name, row]) => ({ name, accuracy: pct(row.correct, row.total), count: row.total }))
    .sort((a, b) => b.count - a.count)
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-line py-3 text-sm last:border-b-0">
      <dt className="text-fog">{label}</dt>
      <dd className="font-mono tabular-nums text-paper">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl text-paper">{title}</h2>
      {children}
    </section>
  )
}

export function AnalyticsClient({ snapshots, topicMastery, latestPrediction, profile, recentAttempts }: AnalyticsClientProps) {
  const [section, setSection] = React.useState<SectionId>('overview')
  const total = recentAttempts.length
  const correct = recentAttempts.filter((a) => a.is_correct).length
  const times = recentAttempts.map((a) => a.time_seconds)
  const easy = recentAttempts.filter((a) => a.difficulty === 'easy')
  const medium = recentAttempts.filter((a) => a.difficulty === 'medium')
  const hard = recentAttempts.filter((a) => a.difficulty === 'hard')
  const sat = recentAttempts.filter((a) => (a.test_type ?? '').toUpperCase() === 'SAT')
  const act = recentAttempts.filter((a) => (a.test_type ?? '').toUpperCase() === 'ACT')
  const today = new Date().toISOString().slice(0, 10)
  const todayAttempts = recentAttempts.filter((a) => a.created_at.slice(0, 10) === today)
  const last7 = recentAttempts.filter((a) => Date.now() - new Date(a.created_at).getTime() < 7 * 86400000)
  const last30 = recentAttempts.filter((a) => Date.now() - new Date(a.created_at).getTime() < 30 * 86400000)

  const knowledgeAvg = avg(topicMastery.map((t) => t.knowledge_mastery))
  const speedAvg = avg(topicMastery.map((t) => t.speed_mastery))
  const overallMastery = avg(topicMastery.map((t) => t.overall_mastery))
  const studyMinutes = snapshots.reduce((s, x) => s + (x.study_time_minutes ?? 0), 0)
  const days = profile?.test_date ? daysUntil(profile.test_date) : null
  const gap = latestPrediction && profile?.target_score != null
    ? profile.target_score - latestPrediction.predicted_total
    : null

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.date),
    score: s.predicted_sat ?? s.predicted_act ?? 0,
    questions: s.total_questions,
    ovr: s.ovr_score ?? 0,
    minutes: s.study_time_minutes,
  }))

  const difficultyData = ['easy', 'medium', 'hard'].map((d) => {
    const filtered = recentAttempts.filter((a) => a.difficulty === d)
    return { difficulty: d, accuracy: pct(filtered.filter((a) => a.is_correct).length, filtered.length), count: filtered.length }
  })
  const sectionData = groupAccuracy(recentAttempts, (a) => a.section_name || 'Unknown')
  const categoryData = groupAccuracy(recentAttempts, (a) => a.category_name || 'Unknown')
  const testData = groupAccuracy(recentAttempts, (a) => a.test_type || 'Unknown')

  const topicsByCategory = React.useMemo(() => {
    const map = new Map<string, TopicMasteryRow[]>()
    for (const tm of topicMastery) {
      const cat = tm.topics?.categories?.name ?? 'Uncategorized'
      const list = map.get(cat) ?? []
      list.push(tm)
      map.set(cat, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [topicMastery])

  const nav: Array<{ id: SectionId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'accuracy', label: 'Accuracy' },
    { id: 'timing', label: 'Timing' },
    { id: 'tests', label: 'Tests & sections' },
    { id: 'mastery', label: 'Mastery' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'topics', label: 'Topics' },
  ]

  return (
    <div className="mx-auto w-full max-w-4xl pb-16 pt-4">
      <header className="mb-8 space-y-2 border-b border-line pb-6">
        <h1 className="font-display text-4xl tracking-tight text-paper">Analytics</h1>
        <p className="text-sm text-fog">
          {total === 0
            ? 'Practice a few questions and this page fills in.'
            : `${pct(correct, total)}% accuracy · ${total} questions · ${studyMinutes} study minutes`}
        </p>
      </header>

      <div className="mb-10 flex flex-wrap gap-x-5 gap-y-2 border-b border-line pb-3">
        {nav.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={cn(
              'pb-2 text-sm transition',
              section === item.id
                ? 'border-b-2 border-signal font-medium text-paper'
                : 'text-fog hover:text-paper',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <div className="space-y-10">
          <Section title="Volume">
            <dl>
              <Row label="Questions answered" value={total} />
              <Row label="Correct" value={correct} />
              <Row label="Missed" value={total - correct} />
              <Row label="Today" value={todayAttempts.length} />
              <Row label="Last 7 days" value={last7.length} />
              <Row label="Last 30 days" value={last30.length} />
              <Row label="Study minutes (tracked)" value={studyMinutes} />
              <Row label="Daily goal" value={`${profile?.daily_minutes ?? 30}m`} />
            </dl>
          </Section>

          <Section title="Score trend">
            {chartData.length < 2 ? (
              <p className="text-sm text-fog">Need at least two study days for a trend line.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="date" stroke={MUTED} tick={{ fontSize: 11 }} />
                  <YAxis stroke={MUTED} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="score" stroke={AQUA} strokeWidth={2} dot={false} name="Predicted" />
                  <Line type="monotone" dataKey="ovr" stroke={GREEN} strokeWidth={2} dot={false} name="Ready" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Study load">
            {chartData.length === 0 ? (
              <p className="text-sm text-fog">Study minutes appear after sessions.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="date" stroke={MUTED} tick={{ fontSize: 11 }} />
                  <YAxis stroke={MUTED} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="minutes" stroke={AQUA} fill={AQUA} fillOpacity={0.2} name="Minutes" />
                  <Area type="monotone" dataKey="questions" stroke={GREEN} fill={GREEN} fillOpacity={0.15} name="Questions" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Section>
        </div>
      )}

      {section === 'accuracy' && (
        <div className="space-y-10">
          <Section title="Accuracy">
            <dl>
              <Row label="Overall" value={`${pct(correct, total)}%`} />
              <Row label="Today" value={`${pct(todayAttempts.filter((a) => a.is_correct).length, todayAttempts.length)}%`} />
              <Row label="Last 7 days" value={`${pct(last7.filter((a) => a.is_correct).length, last7.length)}%`} />
              <Row label="Last 30 days" value={`${pct(last30.filter((a) => a.is_correct).length, last30.length)}%`} />
              <Row label="Easy" value={`${pct(easy.filter((a) => a.is_correct).length, easy.length)}%`} />
              <Row label="Medium" value={`${pct(medium.filter((a) => a.is_correct).length, medium.length)}%`} />
              <Row label="Hard" value={`${pct(hard.filter((a) => a.is_correct).length, hard.length)}%`} />
            </dl>
          </Section>
          <Section title="By difficulty">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="difficulty" stroke={MUTED} tick={{ fontSize: 11 }} />
                <YAxis stroke={MUTED} tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="accuracy" fill={AQUA} radius={[2, 2, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </Section>
        </div>
      )}

      {section === 'timing' && (
        <Section title="Timing">
          <dl>
            <Row label="Average" value={`${avg(times)}s`} />
            <Row label="Median" value={`${percentile(times, 50)}s`} />
            <Row label="Fastest 10%" value={`${percentile(times, 10)}s`} />
            <Row label="Slowest 10%" value={`${percentile(times, 90)}s`} />
            <Row label="Hint rate" value={`${pct(recentAttempts.filter((a) => a.hint_used).length, total)}%`} />
            <Row label="Tutor rate" value={`${pct(recentAttempts.filter((a) => a.tutor_used).length, total)}%`} />
            <Row label="Desmos rate" value={`${pct(recentAttempts.filter((a) => a.desmos_used).length, total)}%`} />
          </dl>
        </Section>
      )}

      {section === 'tests' && (
        <div className="space-y-10">
          <Section title="Test type">
            <dl>
              <Row label="SAT questions" value={sat.length} />
              <Row label="SAT accuracy" value={`${pct(sat.filter((a) => a.is_correct).length, sat.length)}%`} />
              <Row label="ACT questions" value={act.length} />
              <Row label="ACT accuracy" value={`${pct(act.filter((a) => a.is_correct).length, act.length)}%`} />
            </dl>
            {testData.length > 0 && (
              <div className="mt-4 space-y-2">
                {testData.map((row) => (
                  <div key={row.name} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="text-fog">{row.name}</span>
                    <div className="h-px bg-line">
                      <div className="h-0.5 bg-signal" style={{ width: `${row.accuracy}%` }} />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-paper">{row.accuracy}%</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Sections">
            {sectionData.length === 0 ? (
              <p className="text-sm text-fog">Section accuracy appears after you practice.</p>
            ) : (
              <div className="space-y-2">
                {sectionData.map((row) => (
                  <div key={row.name} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-fog">{row.name}</span>
                    <div className="h-px bg-line">
                      <div className="h-0.5 bg-ok" style={{ width: `${row.accuracy}%` }} />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-paper">{row.accuracy}% · {row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Categories">
            {categoryData.length === 0 ? (
              <p className="text-sm text-fog">Category accuracy appears after you practice.</p>
            ) : (
              <div className="space-y-2">
                {categoryData.map((row) => (
                  <div key={row.name} className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="truncate text-fog">{row.name}</span>
                    <div className="h-px bg-line">
                      <div className="h-0.5 bg-signal" style={{ width: `${row.accuracy}%` }} />
                    </div>
                    <span className="font-mono text-xs tabular-nums text-paper">{row.accuracy}% · {row.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {section === 'mastery' && (
        <Section title="Mastery">
          <dl>
            <Row label="Topics tracked" value={topicMastery.length} />
            <Row label="Weak (&lt;40)" value={topicMastery.filter((t) => t.overall_mastery < 40).length} />
            <Row label="Strong (≥70)" value={topicMastery.filter((t) => t.overall_mastery >= 70).length} />
            <Row label="Improving" value={topicMastery.filter((t) => t.trend === 'improving').length} />
            <Row label="Declining" value={topicMastery.filter((t) => t.trend === 'declining').length} />
            <Row label="Knowledge avg" value={knowledgeAvg} />
            <Row label="Speed avg" value={speedAvg} />
            <Row label="Overall mastery" value={overallMastery} />
          </dl>
        </Section>
      )}

      {section === 'forecast' && (
        <Section title="Score forecast">
          <dl>
            <Row label="Ready rate" value={latestPrediction?.ovr_score ?? '—'} />
            <Row label="Predicted total" value={latestPrediction?.predicted_total ?? '—'} />
            <Row label="Range" value={latestPrediction ? `${latestPrediction.score_low}–${latestPrediction.score_high}` : '—'} />
            <Row label="Math" value={latestPrediction?.predicted_math ?? '—'} />
            <Row label="Reading & Writing" value={latestPrediction?.predicted_reading_writing ?? '—'} />
            <Row label="English" value={latestPrediction?.predicted_english ?? '—'} />
            <Row label="Reading" value={latestPrediction?.predicted_reading ?? '—'} />
            <Row label="Science" value={latestPrediction?.predicted_science ?? '—'} />
            <Row label="Target" value={profile?.target_score ?? '—'} />
            <Row label="Gap to target" value={gap == null ? '—' : gap} />
            <Row label="Days until exam" value={days == null ? '—' : days} />
          </dl>
        </Section>
      )}

      {section === 'topics' && (
        <div className="space-y-10">
          {topicsByCategory.length === 0 ? (
            <p className="text-sm text-fog">Topic mastery fills in as you practice.</p>
          ) : topicsByCategory.map(([category, rows]) => (
            <Section key={category} title={category}>
              <div className="divide-y divide-line">
                {rows.map((tm) => (
                  <div key={tm.id} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3 text-sm">
                    <div>
                      <p className="text-paper">{tm.topics?.name ?? 'Topic'}</p>
                      <p className="mt-0.5 text-xs capitalize text-fog">{tm.trend}</p>
                    </div>
                    <p className="font-mono tabular-nums text-paper">{Math.round(tm.overall_mastery)}</p>
                  </div>
                ))}
              </div>
            </Section>
          ))}
        </div>
      )}
    </div>
  )
}
