'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  ANALOGY_TOPICS,
  type AgentTone,
  type AnalogyTopic,
  type CheckInFreq,
  type EncouragementLevel,
  type FocusArea,
  type ResponseShape,
  type StuckStyle,
  type TeachingMethod,
  type TutorPreferences,
} from '@/lib/tutor/types'

const WEEKNIGHTS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type Step = 1 | 2 | 3 | 4

const STYLE_OPTIONS: Array<{ id: TeachingMethod; label: string; hint: string }> = [
  { id: 'step_by_step', label: 'Step by step', hint: 'Numbered moves' },
  { id: 'simplified_example', label: 'Simple examples', hint: 'Easy numbers first' },
  { id: 'analogy', label: 'Make connections', hint: 'Link ideas to real life' },
  { id: 'visual', label: 'Visuals', hint: 'Pictures & graphs' },
  { id: 'direct', label: 'Direct', hint: 'Short and straight' },
  { id: 'socratic', label: 'Guided questions', hint: 'Hints that make you think' },
  { id: 'teach_back', label: 'Teach it back', hint: 'You explain it to Nova' },
  { id: 'practice_first', label: 'Practice first', hint: 'Try a problem, then learn' },
  { id: 'mistake_focus', label: 'Mistake focus', hint: 'Fix the exact error pattern' },
  { id: 'compare_contrast', label: 'Compare choices', hint: 'Why A beats B' },
  { id: 'story', label: 'Story mode', hint: 'Tiny narrative examples' },
]

const LEVEL_OPTIONS = [
  { id: 'very_simple' as const, label: 'Very simple' },
  { id: 'simple' as const, label: 'Simple' },
  { id: 'normal' as const, label: 'Normal' },
  { id: 'advanced' as const, label: 'Advanced' },
  { id: 'expert' as const, label: 'Expert' },
]

const PACING_OPTIONS = [
  { id: 'ultra_short' as const, label: 'Ultra short', hint: 'One or two lines' },
  { id: 'quick' as const, label: 'Short', hint: 'Brief answers' },
  { id: 'balanced' as const, label: 'Balanced', hint: 'Clear middle length' },
  { id: 'detailed' as const, label: 'Long', hint: 'Full walkthroughs' },
  { id: 'deep_dive' as const, label: 'Deep dive', hint: 'Extra why + practice' },
]

const TONE_OPTIONS: Array<{ id: AgentTone; label: string; hint: string }> = [
  { id: 'warm', label: 'Warm', hint: 'Friendly and patient' },
  { id: 'coach', label: 'Coach', hint: 'Motivational push' },
  { id: 'chill', label: 'Chill', hint: 'Calm and low-pressure' },
  { id: 'strict', label: 'Strict', hint: 'Clear and no fluff' },
  { id: 'funny', label: 'Funny', hint: 'Light jokes welcome' },
]

const ENCOURAGE_OPTIONS: Array<{ id: EncouragementLevel; label: string; hint: string }> = [
  { id: 'high', label: 'High', hint: 'Lots of cheer' },
  { id: 'normal', label: 'Normal', hint: 'Balanced support' },
  { id: 'minimal', label: 'Minimal', hint: 'Just the teaching' },
]

const STUCK_OPTIONS: Array<{ id: StuckStyle; label: string; hint: string }> = [
  { id: 'hint_first', label: 'Hint first', hint: 'Smallest nudge' },
  { id: 'show_example', label: 'Show example', hint: 'Tiny worked sample' },
  { id: 'ask_question', label: 'Ask a question', hint: 'Guide with a prompt' },
]

const CHECKIN_OPTIONS: Array<{ id: CheckInFreq; label: string; hint: string }> = [
  { id: 'often', label: 'Often', hint: 'Frequent check questions' },
  { id: 'sometimes', label: 'Sometimes', hint: 'At natural pauses' },
  { id: 'rare', label: 'Rare', hint: 'Only key moments' },
]

const SHAPE_OPTIONS: Array<{ id: ResponseShape; label: string; hint: string }> = [
  { id: 'numbered', label: 'Numbered steps', hint: '1 · 2 · 3' },
  { id: 'bullets', label: 'Bullets', hint: 'Short point list' },
  { id: 'short_paragraphs', label: 'Short paragraphs', hint: 'Talky but tight' },
]

const FOCUS_OPTIONS: Array<{ id: FocusArea; label: string }> = [
  { id: 'math', label: 'Math' },
  { id: 'reading', label: 'Reading' },
  { id: 'writing', label: 'Writing' },
  { id: 'science', label: 'Science' },
  { id: 'mixed', label: 'Mixed' },
]

const CONNECTION_LABELS: Record<AnalogyTopic, string> = {
  business: 'Business',
  sports: 'Sports',
  gaming: 'Gaming',
  cars: 'Cars',
  money: 'Money',
  technology: 'Tech',
  everyday: 'Everyday',
  food: 'Food',
  school: 'School',
  music: 'Music',
  movies: 'Movies',
  science: 'Science',
  nature: 'Nature',
  art: 'Art',
  travel: 'Travel',
  fashion: 'Fashion',
  custom: 'Custom',
}

interface ProfileShape {
  test_preference: string
  target_score: number | null
  test_date: string
  study_minutes_per_day: number
  study_days: string[]
  study_start_time: string
  current_estimated_score: number | null
}

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
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

  const [methods, setMethods] = React.useState<TeachingMethod[]>(
    tutorPreferences.methods.length ? tutorPreferences.methods : ['step_by_step'],
  )
  const [level, setLevel] = React.useState(tutorPreferences.explanation_level)
  const [pacing, setPacing] = React.useState(tutorPreferences.pacing)
  const [topics, setTopics] = React.useState<AnalogyTopic[]>(
    tutorPreferences.analogy_topics.length ? tutorPreferences.analogy_topics : ['everyday'],
  )
  const [customInterest, setCustomInterest] = React.useState(tutorPreferences.custom_interest ?? '')
  const [prefersDesmos, setPrefersDesmos] = React.useState(tutorPreferences.prefers_desmos)
  const [prefersManual, setPrefersManual] = React.useState(tutorPreferences.prefers_manual_algebra)
  const [graphComfort, setGraphComfort] = React.useState(tutorPreferences.graph_comfort)
  const [desmosGuidance, setDesmosGuidance] = React.useState(tutorPreferences.desmos_guidance)

  const [agentName, setAgentName] = React.useState(tutorPreferences.agent.name || 'Nova')
  const [tone, setTone] = React.useState(tutorPreferences.agent.tone)
  const [encouragement, setEncouragement] = React.useState(tutorPreferences.agent.encouragement)
  const [stuckStyle, setStuckStyle] = React.useState(tutorPreferences.agent.stuck_style)
  const [checkIns, setCheckIns] = React.useState(tutorPreferences.agent.check_ins)
  const [humor, setHumor] = React.useState(tutorPreferences.agent.humor)
  const [responseShape, setResponseShape] = React.useState(tutorPreferences.agent.response_shape)
  const [focusAreas, setFocusAreas] = React.useState<FocusArea[]>(
    tutorPreferences.agent.focus_areas.length ? tutorPreferences.agent.focus_areas : ['mixed'],
  )

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

  function toggleDay(day: string) {
    setDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== day)
      }
      return [...prev, day]
    })
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

    const nextMethods = methods.length ? methods : ['step_by_step' as TeachingMethod]
    const nextTopics = topics.length ? topics : (['everyday'] as AnalogyTopic[])
    const nextFocus = focusAreas.length ? focusAreas : (['mixed'] as FocusArea[])

    await fetch('/api/tutor/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        methods: nextMethods,
        analogy_topics: nextTopics,
        custom_interest: customInterest.trim() || null,
        explanation_level: level,
        pacing,
        prefers_visual: nextMethods.includes('visual'),
        prefers_socratic: nextMethods.includes('socratic'),
        prefers_desmos: prefersDesmos,
        prefers_manual_algebra: prefersManual,
        graph_comfort: graphComfort,
        desmos_guidance: desmosGuidance,
        agent: {
          name: agentName.trim() || 'Nova',
          tone,
          encouragement,
          stuck_style: stuckStyle,
          check_ins: checkIns,
          humor,
          response_shape: responseShape,
          focus_areas: nextFocus,
        },
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

  const stepLabel =
    step === 1 ? 'Exam'
      : step === 2 ? 'Study time'
        : step === 3 ? 'How you learn'
          : 'Build your agent'

  return (
    <div className="mx-auto w-full max-w-lg space-y-8 pb-16 pt-4">
      <header className="space-y-2">
        <h1 className="font-display text-4xl tracking-tight text-paper">Customize</h1>
        <p className="text-sm text-fog">Shape how you study and how tutoring teaches you.</p>
        <div className="flex gap-2 pt-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStep(n)}
              className={cn('h-1.5 flex-1 rounded-full transition', step >= n ? 'bg-signal' : 'bg-line')}
              aria-label={`Step ${n}`}
            />
          ))}
        </div>
        <p className="text-xs text-fog">Step {step} · {stepLabel}</p>
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
          <Button className="w-full" onClick={() => setStep(2)}>Next</Button>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div>
            <p className="mb-3 text-sm text-fog">Pick a plan</p>
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
              <p className="mb-1.5 text-sm text-fog">Minutes / night</p>
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-11 w-full border-b border-line bg-transparent text-sm text-paper outline-none"
              >
                {[15, 20, 30, 45, 60, 90, 120].map((m) => (
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

          <div>
            <p className="mb-2 text-sm text-fog">Study days</p>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={cn(
                    'border-b px-1.5 py-1 text-sm',
                    days.includes(day) ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Next</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <div>
            <p className="mb-1 text-sm text-fog">How should tutoring teach?</p>
            <p className="mb-3 text-xs text-fog">Pick one or more.</p>
            <div className="space-y-2">
              {STYLE_OPTIONS.map((opt) => {
                const on = methods.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethods((prev) => {
                      const next = toggleValue(prev, opt.id)
                      return next.length ? next : prev
                    })}
                    className={cn(
                      'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                      on ? 'border-signal' : 'border-line',
                    )}
                  >
                    <span className={cn('text-sm', on ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                    <span className="text-xs text-fog">{opt.hint}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Answer length</p>
            <div className="space-y-2">
              {PACING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPacing(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    pacing === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', pacing === opt.id ? 'font-medium text-paper' : 'text-fog')}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Explanation level</p>
            <div className="flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLevel(opt.id)}
                  className={cn(
                    'border-b-2 px-1 py-2 text-xs sm:text-sm',
                    level === opt.id ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setStep(2)}>Back</Button>
            <Button className="flex-1" onClick={() => setStep(4)}>Next</Button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-6">
          <Input
            label="Agent name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Nova"
          />

          <div>
            <p className="mb-3 text-sm text-fog">Tutor vibe</p>
            <div className="space-y-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTone(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    tone === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', tone === opt.id ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Encouragement</p>
            <div className="space-y-2">
              {ENCOURAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEncouragement(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    encouragement === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', encouragement === opt.id ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">When you get stuck</p>
            <div className="space-y-2">
              {STUCK_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStuckStyle(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    stuckStyle === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', stuckStyle === opt.id ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Check-in questions</p>
            <div className="space-y-2">
              {CHECKIN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCheckIns(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    checkIns === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', checkIns === opt.id ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Reply format</p>
            <div className="space-y-2">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setResponseShape(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    responseShape === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', responseShape === opt.id ? 'font-medium text-paper' : 'text-fog')}>{opt.label}</span>
                  <span className="text-xs text-fog">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Focus areas</p>
            <div className="flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((opt) => {
                const on = focusAreas.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFocusAreas((prev) => {
                      const next = toggleValue(prev, opt.id)
                      return next.length ? next : prev
                    })}
                    className={cn(
                      'border-b px-1.5 py-1 text-sm',
                      on ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setHumor((v) => !v)}
            className={cn(
              'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
              humor ? 'border-signal' : 'border-line',
            )}
          >
            <span className={cn('text-sm', humor ? 'font-medium text-paper' : 'text-fog')}>Light humor</span>
            <span className="text-xs text-fog">{humor ? 'On' : 'Off'}</span>
          </button>

          <div>
            <p className="mb-1 text-sm text-fog">Make connections with</p>
            <p className="mb-3 text-xs text-fog">Used when tutoring links ideas to your world.</p>
            <div className="flex flex-wrap gap-2">
              {ANALOGY_TOPICS.filter((t) => t !== 'custom').map((topic) => {
                const on = topics.includes(topic)
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setTopics((prev) => {
                      const next = toggleValue(prev, topic)
                      return next.length ? next : prev
                    })}
                    className={cn(
                      'border-b px-1.5 py-1 text-sm',
                      on ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                    )}
                  >
                    {CONNECTION_LABELS[topic]}
                  </button>
                )
              })}
            </div>
          </div>

          <Input
            label="Your interests (optional)"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            placeholder="e.g. soccer, startups, cooking"
          />

          <div>
            <p className="mb-3 text-sm text-fog">Math tools</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPrefersDesmos((v) => !v)}
                className={cn(
                  'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                  prefersDesmos ? 'border-signal' : 'border-line',
                )}
              >
                <span className={cn('text-sm', prefersDesmos ? 'font-medium text-paper' : 'text-fog')}>Prefer Desmos</span>
                <span className="text-xs text-fog">{prefersDesmos ? 'On' : 'Off'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPrefersManual((v) => !v)}
                className={cn(
                  'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                  prefersManual ? 'border-signal' : 'border-line',
                )}
              >
                <span className={cn('text-sm', prefersManual ? 'font-medium text-paper' : 'text-fog')}>Prefer by hand</span>
                <span className="text-xs text-fog">{prefersManual ? 'On' : 'Off'}</span>
              </button>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Graph comfort</p>
            <div className="flex gap-2">
              {([
                { id: 'struggles' as const, label: 'Still learning' },
                { id: 'ok' as const, label: 'Okay' },
                { id: 'strong' as const, label: 'Strong' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGraphComfort(opt.id)}
                  className={cn(
                    'flex-1 border-b-2 py-2 text-xs sm:text-sm',
                    graphComfort === opt.id ? 'border-signal font-medium text-paper' : 'border-transparent text-fog',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm text-fog">Desmos help level</p>
            <div className="space-y-2">
              {([
                { id: 'step_by_step' as const, label: 'Step by step', hint: 'Tell me exactly what to type' },
                { id: 'guided' as const, label: 'Guided', hint: 'Hints, then I try' },
                { id: 'independent' as const, label: 'Independent', hint: 'I drive Desmos myself' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDesmosGuidance(opt.id)}
                  className={cn(
                    'flex w-full items-baseline justify-between border-b-2 py-3 text-left',
                    desmosGuidance === opt.id ? 'border-signal' : 'border-line',
                  )}
                >
                  <span className={cn('text-sm', desmosGuidance === opt.id ? 'font-medium text-paper' : 'text-fog')}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-fog">{opt.hint}</span>
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
            <button type="button" className="text-sm text-fog" onClick={() => setStep(3)}>
              Back
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
