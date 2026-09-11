'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { TeachingMethod, TutorPreferences } from '@/lib/tutor/types'

const WEEKNIGHTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type Step = 1 | 2 | 3

const STYLE_OPTIONS: Array<{ id: TeachingMethod; label: string; hint: string }> = [
  { id: 'step_by_step', label: 'Step by step', hint: 'Clear numbered moves' },
  { id: 'simplified_example', label: 'Simple examples', hint: 'Easy numbers first' },
  { id: 'analogy', label: 'Analogies', hint: 'Real-life comparisons' },
  { id: 'direct', label: 'Direct', hint: 'Short and straight' },
]

const LEVEL_OPTIONS = [
  { id: 'simple' as const, label: 'Keep it simple' },
  { id: 'normal' as const, label: 'Normal' },
  { id: 'advanced' as const, label: 'Advanced' },
]

interface ProfileShape {
  test_preference: string
  target_score: number | null
  test_date: string
  study_minutes_per_day: number
  study_days: string[]
  study_start_time: string
  current_estimated_score: number | null
}

export function CustomizeClient({
  profile,
  tutorPreferences,
}: {
  profile: ProfileShape
  tutorPreferences: TutorPreferences
}) {
  const router = useRouter()
  const [step, setStep] = React.useState<Step>(1)
  const [test, setTest] = React.useState(profile.test_preference === 'Both' ? 'both' : profile.test_preference || 'SAT')
  const [target, setTarget] = React.useState(profile.target_score?.toString() ?? '')
  const [date, setDate] = React.useState(profile.test_date ?? '')
  const [minutes, setMinutes] = React.useState(String(profile.study_minutes_per_day || 30))
  const [start, setStart] = React.useState(profile.study_start_time || '19:00')
  const [days, setDays] = React.useState<string[]>(profile.study_days?.length ? profile.study_days : WEEKNIGHTS)
  const [method, setMethod] = React.useState<TeachingMethod>(tutorPreferences.methods[0] ?? 'step_by_step')
  const [level, setLevel] = React.useState(tutorPreferences.explanation_level === 'very_simple' ? 'simple' : tutorPreferences.explanation_level)
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const [building, setBuilding] = React.useState(false)

  function applyPreset(kind: 'weeknights' | 'daily' | 'weekend') {
    if (kind === 'weeknights') {
      setDays(WEEKNIGHTS)
      setMinutes('30')
      setStart('19:00')
    } else if (kind === 'daily') {
      setDays([...ALL_DAYS])
      setMinutes('45')
      setStart('19:00')
    } else {
      setDays(['Saturday', 'Sunday'])
      setMinutes('60')
      setStart('10:00')
    }
  }

  async function saveAll() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    await supabase.from('profiles').update({
      test_preference: test === 'both' ? 'Both' : test,
      target_score: target ? Number(target) : null,
      test_date: date || null,
      study_minutes_per_day: Number(minutes) || 30,
      study_start_time: start,
      study_days: days,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    await fetch('/api/tutor/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        methods: [method],
        analogy_topics: tutorPreferences.analogy_topics.length ? tutorPreferences.analogy_topics : ['everyday'],
        custom_interest: tutorPreferences.custom_interest,
        explanation_level: level,
        pacing: tutorPreferences.pacing,
        prefers_visual: method === 'visual',
        prefers_socratic: method === 'socratic',
        prefers_desmos: tutorPreferences.prefers_desmos,
        prefers_manual_algebra: tutorPreferences.prefers_manual_algebra,
        graph_comfort: tutorPreferences.graph_comfort,
        desmos_guidance: tutorPreferences.desmos_guidance,
      }),
    }).catch(() => undefined)

    setSaving(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
    router.refresh()
  }

  async function saveAndRebuild() {
    setBuilding(true)
    await saveAll()
    await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testDate: date || new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
        testType: test === 'both' ? 'both' : test,
        targetScore: target ? Number(target) : 1400,
        baselineScore: profile.current_estimated_score,
        dailyMinutes: Number(minutes) || 30,
        availableDays: days,
      }),
    }).catch(() => undefined)
    setBuilding(false)
    router.push('/study-plan')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 pb-16 pt-4">
      <header className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-paper">Customize</h1>
        <p className="text-sm text-fog">Three quick steps. Everything saves when you finish.</p>
        <div className="flex gap-2 pt-2">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={cn(
                'h-1.5 flex-1 rounded-full transition',
                step >= n ? 'bg-signal' : 'bg-line',
              )}
              aria-label={`Step ${n}`}
            />
          ))}
        </div>
        <p className="text-xs text-fog">
          {step === 1 ? 'Exam' : step === 2 ? 'Study time' : 'Teaching style'}
        </p>
      </header>

      {step === 1 && (
        <section className="space-y-6">
          <div>
            <p className="mb-3 text-sm text-fog">Which test?</p>
            <div className="flex gap-2">
              {(['SAT', 'ACT', 'both'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTest(value)}
                  className={cn(
                    'flex-1 border-b-2 py-2 text-sm capitalize',
                    test === value ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Target score"
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={test === 'ACT' ? 'e.g. 32' : 'e.g. 1400'}
          />
          <div>
            <p className="mb-1.5 text-sm text-fog">Exam date</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 w-full border-b border-line bg-transparent text-paper outline-none"
            />
          </div>
          <Button className="w-full" onClick={() => setStep(2)}>
            Next
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div>
            <p className="mb-3 text-sm text-fog">Pick a simple plan</p>
            <div className="space-y-2">
              {[
                { id: 'weeknights' as const, title: 'Weeknights', detail: 'Mon–Fri · 30 min · 7pm' },
                { id: 'daily' as const, title: 'Every day', detail: '7 days · 45 min · 7pm' },
                { id: 'weekend' as const, title: 'Weekends', detail: 'Sat–Sun · 60 min · 10am' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="flex w-full items-baseline justify-between border-b border-line py-3 text-left"
                >
                  <span className="text-sm font-medium text-paper">{preset.title}</span>
                  <span className="text-xs text-fog">{preset.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1.5 text-sm text-fog">Minutes</p>
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-11 w-full border-b border-line bg-transparent text-sm text-paper outline-none"
              >
                {[15, 20, 30, 45, 60, 90].map((m) => (
                  <option key={m} value={String(m)}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-fog">Start time</p>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-11 w-full border-b border-line bg-transparent text-sm text-paper outline-none"
              />
            </div>
          </div>

          <p className="text-xs text-fog">
            Studying {days.length} day{days.length === 1 ? '' : 's'}: {days.map((d) => d.slice(0, 3)).join(', ')}
          </p>

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Next</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <div>
            <p className="mb-3 text-sm text-fog">How should tutoring teach?</p>
            <div className="space-y-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMethod(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    method === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', method === opt.id ? 'font-medium text-paper' : 'text-fog')}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Explanation level</p>
            <div className="flex gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLevel(opt.id)}
                  className={cn(
                    'flex-1 border-b-2 py-2 text-xs sm:text-sm',
                    level === opt.id ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => void saveAndRebuild()} loading={building || saving}>
              {saved ? 'Saved' : 'Save & build plan'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => void saveAll()} loading={saving}>
              Save only
            </Button>
            <button type="button" className="text-sm text-fog" onClick={() => setStep(2)}>
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
