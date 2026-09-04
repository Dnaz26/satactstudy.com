'use client'

import * as React from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { ScoreCard } from '@/components/ui/score-card'
import { MasteryBar } from '@/components/ui/mastery-bar'
import { Badge } from '@/components/ui/badge'
import { Companion } from '@/components/ui/companion'
import { daysUntil, formatDate } from '@/lib/utils'

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

const TOOLTIP_STYLE = {
  backgroundColor: '#EAF4FF',
  border: '1px solid #C9D8EE',
  borderRadius: '16px',
  color: '#1F2D4A',
  boxShadow: '8px 8px 16px #C5D4EA, -8px -8px 16px #FFFFFF',
}

const PIE_COLORS = ['#ff6b57', '#3B82F6', '#8B5CF6', '#22C55E', '#F59E0B', '#14B8A6']

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

function groupAccuracy(attempts: Attempt[], key: (a: Attempt) => string): Array<{ name: string; accuracy: number; count: number }> {
  const map = new Map<string, { correct: number; total: number }>()
  for (const a of attempts) {
    const name = key(a) || 'Other'
    const row = map.get(name) ?? { correct: 0, total: 0 }
    row.total += 1
    if (a.is_correct) row.correct += 1
    map.set(name, row)
  }
  return [...map.entries()].map(([name, row]) => ({ name, accuracy: pct(row.correct, row.total), count: row.total }))
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="neu space-y-3 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">{title}</p>
      {children}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="neu p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog">{label}</p>
      <p className="mt-1 font-display text-xl leading-none">{value}</p>
    </div>
  )
}

export function AnalyticsClient({ snapshots, topicMastery, latestPrediction, profile, recentAttempts }: AnalyticsClientProps) {
  const [view, setView] = React.useState<'charts' | 'topics'>('charts')
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

  const metrics: Array<{ label: string; value: string }> = [
    { label: 'Questions', value: String(total) },
    { label: 'Correct', value: String(correct) },
    { label: 'Accuracy', value: `${pct(correct, total)}%` },
    { label: 'Avg time', value: `${avg(times)}s` },
    { label: 'Median time', value: `${percentile(times, 50)}s` },
    { label: 'Fast 10%', value: `${percentile(times, 10)}s` },
    { label: 'Slow 10%', value: `${percentile(times, 90)}s` },
    { label: 'Today Q', value: String(todayAttempts.length) },
    { label: 'Today acc', value: `${pct(todayAttempts.filter((a) => a.is_correct).length, todayAttempts.length)}%` },
    { label: '7-day Q', value: String(last7.length) },
    { label: '7-day acc', value: `${pct(last7.filter((a) => a.is_correct).length, last7.length)}%` },
    { label: '30-day Q', value: String(last30.length) },
    { label: 'Easy acc', value: `${pct(easy.filter((a) => a.is_correct).length, easy.length)}%` },
    { label: 'Med acc', value: `${pct(medium.filter((a) => a.is_correct).length, medium.length)}%` },
    { label: 'Hard acc', value: `${pct(hard.filter((a) => a.is_correct).length, hard.length)}%` },
    { label: 'SAT Q', value: String(sat.length) },
    { label: 'SAT acc', value: `${pct(sat.filter((a) => a.is_correct).length, sat.length)}%` },
    { label: 'ACT Q', value: String(act.length) },
    { label: 'ACT acc', value: `${pct(act.filter((a) => a.is_correct).length, act.length)}%` },
    { label: 'Hint rate', value: `${pct(recentAttempts.filter((a) => a.hint_used).length, total)}%` },
    { label: 'Nova rate', value: `${pct(recentAttempts.filter((a) => a.tutor_used).length, total)}%` },
    { label: 'Desmos rate', value: `${pct(recentAttempts.filter((a) => a.desmos_used).length, total)}%` },
    { label: 'Misses', value: String(total - correct) },
    { label: 'Topics', value: String(topicMastery.length) },
    { label: 'Weak topics', value: String(topicMastery.filter((t) => t.overall_mastery < 40).length) },
    { label: 'Strong topics', value: String(topicMastery.filter((t) => t.overall_mastery >= 70).length) },
    { label: 'Improving', value: String(topicMastery.filter((t) => t.trend === 'improving').length) },
    { label: 'Declining', value: String(topicMastery.filter((t) => t.trend === 'declining').length) },
    { label: 'Knowledge', value: `${knowledgeAvg}` },
    { label: 'Speed', value: `${speedAvg}` },
    { label: 'Mastery', value: `${overallMastery}` },
    { label: 'OVR', value: String(latestPrediction?.ovr_score ?? '—') },
    { label: 'Predicted', value: String(latestPrediction?.predicted_total ?? '—') },
    { label: 'Range low', value: String(latestPrediction?.score_low ?? '—') },
    { label: 'Range high', value: String(latestPrediction?.score_high ?? '—') },
    { label: 'Math pred', value: String(latestPrediction?.predicted_math ?? '—') },
    { label: 'R&W pred', value: String(latestPrediction?.predicted_reading_writing ?? '—') },
    { label: 'Eng pred', value: String(latestPrediction?.predicted_english ?? '—') },
    { label: 'Read pred', value: String(latestPrediction?.predicted_reading ?? '—') },
    { label: 'Sci pred', value: String(latestPrediction?.predicted_science ?? '—') },
    { label: 'Target', value: String(profile?.target_score ?? '—') },
    { label: 'Gap', value: gap == null ? '—' : String(gap) },
    { label: 'Days out', value: days == null ? '—' : String(days) },
    { label: 'Study min', value: String(studyMinutes) },
    { label: 'Daily goal', value: `${profile?.daily_minutes ?? 30}m` },
  ]

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.date),
    score: s.predicted_sat ?? s.predicted_act ?? 0,
    accuracy: Math.round((s.accuracy ?? 0) * 100),
    questions: s.total_questions,
    ovr: s.ovr_score ?? 0,
    minutes: s.study_time_minutes,
  }))

  const difficultyData = ['easy', 'medium', 'hard'].map((d) => {
    const filtered = recentAttempts.filter((a) => a.difficulty === d)
    return { difficulty: d, accuracy: pct(filtered.filter((a) => a.is_correct).length, filtered.length), count: filtered.length }
  })
  const testData = groupAccuracy(recentAttempts, (a) => a.test_type || 'Unknown')
  const sectionData = groupAccuracy(recentAttempts, (a) => a.section_name || 'Unknown')
  const categoryData = groupAccuracy(recentAttempts, (a) => a.category_name || 'Unknown')
  const outcomeData = [
    { name: 'Correct', value: correct },
    { name: 'Missed', value: Math.max(0, total - correct) },
  ].filter((row) => row.value > 0)
  const toolData = [
    { name: 'Solo', value: recentAttempts.filter((a) => !a.hint_used && !a.tutor_used && !a.desmos_used).length },
    { name: 'Hint', value: recentAttempts.filter((a) => a.hint_used).length },
    { name: 'Nova', value: recentAttempts.filter((a) => a.tutor_used).length },
    { name: 'Desmos', value: recentAttempts.filter((a) => a.desmos_used).length },
  ].filter((row) => row.value > 0)
  const radarData = [
    { skill: 'Knowledge', value: knowledgeAvg },
    { skill: 'Speed', value: speedAvg },
    { skill: 'Mastery', value: overallMastery },
    { skill: 'Accuracy', value: pct(correct, total) },
    { skill: 'OVR', value: latestPrediction?.ovr_score ?? 0 },
  ]
  const empty = total === 0 && chartData.length === 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-2 pb-8">
      <h1 className="font-display text-2xl">Analytics</h1>
      <Companion
        mode={empty ? 'idle' : (overallMastery >= 70 ? 'success' : 'studying')}
        message={empty ? 'Practice a few questions and every chart will fill in here.' : `${pct(correct, total)}% accuracy across ${total} questions.`}
      />

      {latestPrediction && (
        <ScoreCard
          predicted={latestPrediction.predicted_total}
          target={profile?.target_score ?? null}
          testType={(profile?.target_test ?? 'SAT') as 'SAT' | 'ACT' | 'both'}
          confidence={latestPrediction.confidence}
          scoreLow={latestPrediction.score_low}
          scoreHigh={latestPrediction.score_high}
        />
      )}

      <div className="neu flex gap-2 p-3">
        {(['charts', 'topics'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            className={value === view ? 'neu-raised rounded-xl px-4 py-2 text-sm text-white' : 'neu-sm rounded-xl px-4 py-2 text-sm text-paper'}
          >
            {value === 'charts' ? 'Charts' : 'Topics'}
          </button>
        ))}
      </div>

      {view === 'charts' ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {metrics.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value} />
            ))}
          </div>

            <ChartBlock title="Projected score · line">
              {chartData.length < 2 ? (
                <p className="text-sm text-fog">Need at least two study days to draw this line.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                    <XAxis dataKey="date" stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#ff6b57" strokeWidth={2} dot={false} name="Predicted" />
                    <Line type="monotone" dataKey="ovr" stroke="#8B5CF6" strokeWidth={2} dot={false} name="OVR" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartBlock>

            <ChartBlock title="Study minutes · area">
              {chartData.length === 0 ? (
                <p className="text-sm text-fog">Study time will area-chart here after sessions.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                    <XAxis dataKey="date" stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="minutes" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} name="Minutes" />
                    <Area type="monotone" dataKey="questions" stroke="#22C55E" fill="#22C55E" fillOpacity={0.15} name="Questions" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartBlock>

            <ChartBlock title="Difficulty accuracy · bar">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={difficultyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                  <XAxis dataKey="difficulty" stroke="#5F7190" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="accuracy" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Accuracy" />
                  <Bar dataKey="count" fill="#ff6b57" radius={[4, 4, 0, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>

            <div className="grid gap-8 md:grid-cols-2">
              <ChartBlock title="Outcomes · pie">
                {outcomeData.length === 0 ? (
                  <p className="text-sm text-fog">Answer questions to fill this pie.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={outcomeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3}>
                        {outcomeData.map((row, i) => (
                          <Cell key={row.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBlock>

              <ChartBlock title="Tools used · pie">
                {toolData.length === 0 ? (
                  <p className="text-sm text-fog">Hints, Nova, and Desmos usage will show here.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={toolData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                        {toolData.map((row, i) => (
                          <Cell key={row.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartBlock>
            </div>

            <ChartBlock title="Skills · radar">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#C9D8EE" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#5F7190', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#5F7190', fontSize: 10 }} />
                  <Radar name="You" dataKey="value" stroke="#ff6b57" fill="#ff6b57" fillOpacity={0.35} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartBlock>

            <ChartBlock title="Sections · bar">
              {sectionData.length === 0 ? (
                <p className="text-sm text-fog">Section accuracy appears after you practice.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(180, sectionData.length * 36)}>
                  <BarChart data={sectionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                    <XAxis type="number" domain={[0, 100]} stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={90} stroke="#5F7190" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="accuracy" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Accuracy" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBlock>

          <div className="neu space-y-3 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Tests</p>
            {testData.length === 0 ? (
              <p className="text-sm text-fog">Test accuracy appears after you practice.</p>
            ) : testData.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm">{row.name}</span>
                <MasteryBar mastery={row.accuracy} className="flex-1" showPercent />
                <span className="font-mono text-xs text-fog">{row.count}</span>
              </div>
            ))}
          </div>
          <div className="neu space-y-3 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Categories</p>
            {categoryData.length === 0 ? (
              <p className="text-sm text-fog">Category accuracy appears after you practice.</p>
            ) : categoryData.map((row) => (
              <div key={`cat-${row.name}`} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm">{row.name}</span>
                <MasteryBar mastery={row.accuracy} className="flex-1" showPercent />
                <span className="font-mono text-xs text-fog">{row.count}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-3">
          {topicMastery.length === 0 ? (
            <div className="neu p-5">
              <p className="text-sm text-fog">Topic mastery fills in as you practice.</p>
            </div>
          ) : topicMastery.map((tm) => (
            <div key={tm.id} className="neu p-5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm text-paper">{tm.topics?.name ?? 'Topic'}</p>
                <Badge variant={tm.trend === 'improving' ? 'success' : tm.trend === 'declining' ? 'danger' : 'secondary'}>
                  {tm.trend}
                </Badge>
              </div>
              <p className="mb-1 font-mono text-[10px] text-fog">{tm.topics?.categories?.name}</p>
              <MasteryBar mastery={tm.overall_mastery} showPercent />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
