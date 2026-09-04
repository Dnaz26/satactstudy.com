'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Companion } from '@/components/ui/companion'
import { TutorPreferencesCard } from '@/components/tutor/tutor-preferences-card'
import { formatTimeOfDay } from '@/lib/utils'
import type { TutorPreferences } from '@/lib/tutor/types'

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

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
  const [test, setTest] = React.useState(profile.test_preference || 'SAT')
  const [target, setTarget] = React.useState(profile.target_score?.toString() ?? '')
  const [date, setDate] = React.useState(profile.test_date ?? '')
  const [minutes, setMinutes] = React.useState(String(profile.study_minutes_per_day || 30))
  const [start, setStart] = React.useState(profile.study_start_time || '19:00')
  const [days, setDays] = React.useState<string[]>(profile.study_days?.length ? profile.study_days : [...ALL_DAYS])
  const [saving, setSaving] = React.useState(false)
  const [building, setBuilding] = React.useState(false)
  const [saved, setSaved] = React.useState(false)
  const first = React.useRef(true)

  function toggleDay(day: string) {
    setDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  async function saveProfile() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      test_preference: test === 'both' ? 'Both' : test,
      target_score: target ? Number(target) : null,
      test_date: date || null,
      study_minutes_per_day: Number(minutes) || 30,
      study_start_time: start,
      study_days: days,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
    router.refresh()
  }

  React.useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = window.setTimeout(() => {
      void saveProfile()
    }, 800)
    return () => window.clearTimeout(timer)
  }, [test, target, date, minutes, start, days])

  async function novaRebuild() {
    setBuilding(true)
    await saveProfile()
    await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testDate: date || new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
        testType: test === 'both' || test === 'Both' ? 'both' : test,
        targetScore: target ? Number(target) : 1400,
        baselineScore: profile.current_estimated_score,
        dailyMinutes: Number(minutes) || 30,
        availableDays: days,
      }),
    })
    setBuilding(false)
    router.push('/study-plan')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pt-2 pb-10">
      <h1 className="font-display text-2xl">Customization</h1>
      <Companion
        mode="studying"
        message={`Nova will teach in your style and schedule you at ${formatTimeOfDay(start)} for ${minutes} minutes.`}
      />

      <div className="space-y-4 neu p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Schedule Nova uses</p>
        <Select value={test} onValueChange={setTest}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SAT">SAT</SelectItem>
            <SelectItem value="ACT">ACT</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Input label="Target score" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 w-full rounded-xl neu-inset px-3 text-paper"
        />
        <Select value={minutes} onValueChange={setMinutes}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[15, 20, 30, 45, 60, 90, 120].map((m) => (
              <SelectItem key={m} value={String(m)}>{m} min / day</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <p className="mb-2 text-sm text-fog">Study starts at</p>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-10 w-full rounded-xl neu-inset px-3 text-sm text-paper"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`rounded-xl px-4 py-3 text-sm ${days.includes(day) ? 'neu-raised text-white' : 'neu-sm text-fog'}`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>
        <Button onClick={() => void saveProfile()} loading={saving} className="w-full">
          {saved ? 'Saved' : 'Save schedule'}
        </Button>
        <Button variant="secondary" onClick={() => void novaRebuild()} loading={building} className="w-full">
          Let Nova rebuild my plan
        </Button>
      </div>

      <TutorPreferencesCard initial={tutorPreferences} openAll />
    </div>
  )
}
