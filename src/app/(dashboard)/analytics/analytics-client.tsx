'use client'

import * as React from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScoreCard } from '@/components/ui/score-card'
import { MasteryBar } from '@/components/ui/mastery-bar'
import { Badge } from '@/components/ui/badge'
import { getMasteryColor, formatDate } from '@/lib/utils'
import { BarChart2, Target, Zap, Clock } from 'lucide-react'

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
}

interface Profile {
  target_score: number | null
  target_test: string | null
  test_date: string | null
}

interface Attempt {
  is_correct: boolean
  time_seconds: number
  difficulty: string
  created_at: string
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

export function AnalyticsClient({ snapshots, topicMastery, latestPrediction, profile, recentAttempts }: AnalyticsClientProps) {
  const totalAttempts = recentAttempts.length
  const correctAttempts = recentAttempts.filter((a) => a.is_correct).length
  const overallAccuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0
  const avgTime = totalAttempts > 0
    ? Math.round(recentAttempts.reduce((s, a) => s + a.time_seconds, 0) / totalAttempts)
    : 0

  const chartData = snapshots.map((s) => ({
    date: formatDate(s.date),
    score: s.predicted_sat ?? s.predicted_act ?? 0,
    accuracy: Math.round((s.accuracy ?? 0) * 100),
    questions: s.total_questions,
    ovr: s.ovr_score ?? 0,
  }))

  const difficultyData = ['easy', 'medium', 'hard'].map((d) => {
    const filtered = recentAttempts.filter((a) => a.difficulty === d)
    const correct = filtered.filter((a) => a.is_correct).length
    return {
      difficulty: d,
      accuracy: filtered.length > 0 ? Math.round((correct / filtered.length) * 100) : 0,
      count: filtered.length,
    }
  })

  const scatterData = recentAttempts.slice(0, 100).map((a) => ({
    time: a.time_seconds,
    correct: a.is_correct ? 1 : 0,
    z: 1,
  }))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper mb-1">Analytics</h1>
        <p className="text-fog">Your complete performance overview.</p>
      </div>

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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Questions', value: totalAttempts, icon: BarChart2, color: 'text-signal' },
          { label: 'Accuracy', value: `${overallAccuracy}%`, icon: Target, color: 'text-ok' },
          { label: 'Avg Time/Q', value: `${avgTime}s`, icon: Clock, color: 'text-yellow-400' },
          { label: 'OVR Score', value: latestPrediction?.ovr_score ?? '—', icon: Zap, color: 'text-violet-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold text-paper">{value}</p>
                <p className="text-xs text-fog">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Score Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                <XAxis dataKey="date" stroke="#5F7190" tick={{ fontSize: 11 }} />
                <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} dot={false} name="Predicted Score" />
                <Line type="monotone" dataKey="ovr" stroke="#8B5CF6" strokeWidth={2} dot={false} name="OVR" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Accuracy by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={difficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                <XAxis dataKey="difficulty" stroke="#5F7190" tick={{ fontSize: 11 }} />
                <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Accuracy']} />
                <Bar
                  dataKey="accuracy"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  label={{ position: 'top', fill: '#5F7190', fontSize: 11 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Topic Mastery Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {topicMastery.slice(0, 15).map((tm) => (
                <div key={tm.id} className="flex items-center gap-3">
                  <div className="w-32 truncate text-xs text-fog">
                    {tm.topics?.name ?? 'Topic'}
                  </div>
                  <MasteryBar mastery={tm.overall_mastery} className="flex-1" showPercent />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Questions Answered</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#C9D8EE" />
                <XAxis dataKey="date" stroke="#5F7190" tick={{ fontSize: 11 }} />
                <YAxis stroke="#5F7190" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="questions" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Questions" />
                <Bar dataKey="accuracy" fill="#22C55E" radius={[4, 4, 0, 0]} name="Accuracy %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-semibold text-paper mb-4">All Topics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topicMastery.map((tm) => (
            <Card key={tm.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold text-paper">{tm.topics?.name ?? 'Topic'}</p>
                    <p className="text-xs text-fog">{tm.topics?.categories?.name}</p>
                  </div>
                  <Badge
                    variant={
                      tm.trend === 'improving' ? 'success' :
                      tm.trend === 'declining' ? 'danger' : 'secondary'
                    }
                  >
                    {tm.trend}
                  </Badge>
                </div>
                <MasteryBar mastery={tm.overall_mastery} showLabel showPercent />
                <div className="mt-2 flex justify-between text-xs text-fog">
                  <span>{tm.total_attempts} attempts</span>
                  <span>{tm.total_attempts > 0 ? Math.round((tm.correct_attempts / tm.total_attempts) * 100) : 0}% correct</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
