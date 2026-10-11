'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TutorPreferences } from '@/lib/tutor/types'

const EVERY_DAY = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface ProfileShape {
  test_preference: string
  target_score: number | null
  test_date: string
  study_minutes_per_day: number
  study_days: string[]
  study_start_time: string
  current_estimated_score: number | null
}

function daysUntil(date: string | null | undefined) {
  if (!date) return 30
  const end = new Date(`${date}T12:00:00`).getTime()
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  const diff = Math.ceil((end - start.getTime()) / 86400000)
  return Number.isFinite(diff) && diff > 0 ? diff : 30
}

function dateFromDays(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + Math.max(1, Math.round(days)))
  return date.toISOString().slice(0, 10)
}

export function CustomizeClient({
  profile,
  tutorPreferences: _tutorPreferences,
}: {
  profile: ProfileShape
  tutorPreferences: TutorPreferences
}) {
  const router = useRouter()
  const initialTest = profile.test_preference === 'Both' ? 'both' : profile.test_preference === 'ACT' ? 'ACT' : 'SAT'
  const [test, setTest] = React.useState<'SAT' | 'ACT' | 'both'>(initialTest)
  const [satGoal, setSatGoal] = React.useState(initialTest !== 'ACT' && profile.target_score ? String(profile.target_score) : '')
  const [actGoal, setActGoal] = React.useState(initialTest === 'ACT' && profile.target_score ? String(profile.target_score) : '')
  const [minutes, setMinutes] = React.useState(String(Math.max(15, profile.study_minutes_per_day || 30)))
  const [studyDays, setStudyDays] = React.useState(String(daysUntil(profile.test_date)))
  const [saving, setSaving] = React.useState(false)
  const [saved, setSaved] = React.useState(false)

  const cleanMinutes = Math.max(15, Math.round(Number(minutes) || 15))
  const cleanDays = Math.max(1, Math.round(Number(studyDays) || 1))
  const computedDate = dateFromDays(cleanDays)
  const primaryTarget =
    test === 'ACT'
      ? Number(actGoal) || null
      : test === 'both'
        ? Number(satGoal || actGoal) || null
        : Number(satGoal) || null

  async function savePlan() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }

    await supabase.from('profiles').update({
      test_preference: test === 'both' ? 'Both' : test,
      target_score: primaryTarget,
      test_date: computedDate,
      study_minutes_per_day: cleanMinutes,
      study_start_time: profile.study_start_time || '19:00',
      study_days: EVERY_DAY,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testDate: computedDate,
        testType: test,
        targetScore: primaryTarget ?? (test === 'ACT' ? 30 : 1400),
        baselineScore: profile.current_estimated_score,
        dailyMinutes: cleanMinutes,
        availableDays: EVERY_DAY,
      }),
    }).catch(() => undefined)

    setSaved(true)
    setSaving(false)
    window.setTimeout(() => setSaved(false), 1800)
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-16 pt-4">
      <header className="space-y-2">
        <p className="text-sm font-bold text-fog">
          Set your score goals and study time. Tutoring style is fixed so every lesson builds from easy to very hard.
        </p>
      </header>

      <section className="rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-5 shadow-[0_8px_0_#e5e5e5]">
        <p className="font-display text-2xl text-[#3c3c3c]">Test goal</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {(['SAT', 'ACT', 'both'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTest(value)}
              className={cn(
                'rounded-2xl border-2 px-3 py-3 text-sm font-extrabold capitalize shadow-[0_4px_0_#e5e5e5] active:translate-y-1 active:shadow-none',
                test === value ? 'border-[#58cc02] bg-[#58cc02] text-white shadow-[0_4px_0_#46a302]' : 'border-[#e5e5e5] bg-white text-[#777]',
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-extrabold text-[#777]">SAT goal score</span>
            <input
              type="number"
              min={400}
              max={1600}
              value={satGoal}
              onChange={(event) => setSatGoal(event.target.value)}
              placeholder="1600"
              className="mt-2 h-12 w-full rounded-2xl border-2 border-[#e5e5e5] px-4 font-bold text-[#3c3c3c] outline-none focus:border-[#58cc02]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-[#777]">ACT goal score</span>
            <input
              type="number"
              min={1}
              max={36}
              value={actGoal}
              onChange={(event) => setActGoal(event.target.value)}
              placeholder="36"
              className="mt-2 h-12 w-full rounded-2xl border-2 border-[#e5e5e5] px-4 font-bold text-[#3c3c3c] outline-none focus:border-[#58cc02]"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-5 shadow-[0_8px_0_#e5e5e5]">
        <p className="font-display text-2xl text-[#3c3c3c]">Study plan</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-extrabold text-[#777]">Minutes per day</span>
            <input
              type="number"
              min={15}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              onBlur={() => setMinutes(String(cleanMinutes))}
              placeholder="15 minimum"
              className="mt-2 h-12 w-full rounded-2xl border-2 border-[#e5e5e5] px-4 font-bold text-[#3c3c3c] outline-none focus:border-[#1cb0f6]"
            />
            <span className="mt-1 block text-xs font-bold text-[#afafaf]">Minimum 15 minutes. No maximum.</span>
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-[#777]">Days to study</span>
            <input
              type="number"
              min={1}
              value={studyDays}
              onChange={(event) => setStudyDays(event.target.value)}
              onBlur={() => setStudyDays(String(cleanDays))}
              placeholder="30"
              className="mt-2 h-12 w-full rounded-2xl border-2 border-[#e5e5e5] px-4 font-bold text-[#3c3c3c] outline-none focus:border-[#1cb0f6]"
            />
            <span className="mt-1 block text-xs font-bold text-[#afafaf]">Your test countdown ends on {computedDate}.</span>
          </label>
        </div>

        <div className="mt-5 rounded-2xl bg-[#f7f7f7] p-4 text-sm font-bold text-[#3c3c3c]">
          Every day includes one topic to master and at least 15 minutes of Rapid Fire at night. The full plan also schedules all tutoring lessons and at least 3 practice exams before test day.
        </div>
      </section>

      <Button className="w-full rounded-2xl py-6 text-base" onClick={() => void savePlan()} loading={saving}>
        {saved ? 'Saved' : 'Save plan'}
      </Button>
    </div>
  )
}
