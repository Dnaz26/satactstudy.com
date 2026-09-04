'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasPaidAccess } from '@/lib/access'
import { asPlan } from '@/lib/schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Companion } from '@/components/ui/companion'
import { cn } from '@/lib/utils'
import { Check, ChevronRight } from 'lucide-react'

type TestType = 'SAT' | 'ACT' | 'both'
type StudyDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

const STUDY_TIMES = [15, 30, 45, 60, 90, 120]
const START_TIMES = ['06:00', '07:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']
const GRADES = ['9', '10', '11', '12', 'College', 'Other']
const GOALS = ['First SAT/ACT', 'Score jump', 'Scholarship', 'Retake']
const PREP = ['None', 'A little', 'A class', 'A tutor']
const FOCUS = ['Math', 'English', 'Both']
const WEAK = ['Algebra', 'Geometry', 'Reading', 'Grammar', 'Science', 'Timing']
const ALL_DAYS: StudyDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<StudyDay, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

interface OnboardingData {
  fullName: string
  testType: TestType | null
  targetScore: number | null
  testDate: string
  hasTakenPractice: boolean | null
  baselineScore: number | null
  gradeLevel: string
  schoolName: string
  focusSection: string
  weakestAreas: string[]
  testGoal: string
  priorPrep: string
  dailyMinutes: number | null
  studyStartTime: string
  availableDays: StudyDay[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [processing, setProcessing] = React.useState(false)
  const [data, setData] = React.useState<OnboardingData>({
    fullName: '',
    testType: null,
    targetScore: null,
    testDate: '',
    hasTakenPractice: null,
    baselineScore: null,
    gradeLevel: '',
    schoolName: '',
    focusSection: '',
    weakestAreas: [],
    testGoal: '',
    priorPrep: '',
    dailyMinutes: null,
    studyStartTime: '19:00',
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  })

  React.useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data: auth }) => {
      const name = (auth.user?.user_metadata.full_name as string | undefined) ?? auth.user?.user_metadata.name ?? ''
      if (name) setData((prev) => ({ ...prev, fullName: prev.fullName || String(name) }))
    })
  }, [])

  const totalSteps = 15
  const progress = ((step + 1) / totalSteps) * 100

  function nextStep() {
    if (step < totalSteps - 1) setStep(step + 1)
  }

  function getScoreRange(): [number, number] {
    if (data.testType === 'ACT') return [1, 36]
    return [400, 1600]
  }

  function getDefaultTarget(): number {
    if (data.testType === 'ACT') return 30
    return 1400
  }

  function toggleDay(day: StudyDay) {
    setData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }))
  }

  function toggleWeak(item: string) {
    setData((prev) => ({
      ...prev,
      weakestAreas: prev.weakestAreas.includes(item)
        ? prev.weakestAreas.filter((d) => d !== item)
        : [...prev.weakestAreas, item],
    }))
  }

  async function handleComplete() {
    setProcessing(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      await supabase.from('profiles').update({
        full_name: data.fullName.trim() || null,
        test_preference: data.testType === 'both' ? 'Both' : data.testType,
        target_score: data.targetScore,
        current_estimated_score: data.baselineScore,
        test_date: data.testDate || null,
        study_minutes_per_day: data.dailyMinutes,
        study_start_time: data.studyStartTime,
        study_days: data.availableDays,
        grade_level: data.gradeLevel || null,
        school_name: data.schoolName.trim() || null,
        focus_section: data.focusSection || null,
        weakest_areas: data.weakestAreas,
        test_goal: data.testGoal || null,
        prior_prep: data.priorPrep || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      if (data.testDate && data.targetScore) {
        await fetch('/api/schedule/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            testDate: data.testDate,
            testType: data.testType,
            targetScore: data.targetScore,
            baselineScore: data.baselineScore,
            dailyMinutes: data.dailyMinutes,
            availableDays: data.availableDays,
          }),
        })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, role')
        .eq('id', user.id)
        .single()

      router.push(hasPaidAccess(asPlan(profile?.subscription_plan), profile?.role) ? '/dashboard' : '/pricing')
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-5 py-5">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-fog">Step {step + 1} of {totalSteps}</span>
          <span className="text-sm text-fog">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden neu-inset">
          <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Companion compact mode="studying" message="One screen at a time." />

        <div className="mt-4 flex flex-1 flex-col">
          {step === 0 && (
            <StepScreen title="What should Nova call you?" description="This name shows on your home screen.">
              <Input value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} placeholder="Your name" />
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.fullName.trim()}>
                Continue <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </StepScreen>
          )}

          {step === 1 && (
            <StepScreen title="Which test are you preparing for?" description="We'll customize your study plan accordingly.">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                {(['SAT', 'ACT', 'both'] as TestType[]).map((t) => (
                  <Choice key={t} tall selected={data.testType === t} onClick={() => { setData({ ...data, testType: t, targetScore: null }); nextStep() }}>
                    {t === 'both' ? 'Both' : t}
                  </Choice>
                ))}
              </div>
            </StepScreen>
          )}

          {step === 2 && data.testType && (
            <StepScreen title="What's your target score?" description={data.testType === 'ACT' ? 'ACT range: 1–36' : 'SAT range: 400–1600'}>
              <div className="flex flex-1 flex-col justify-center">
                <div className="text-center font-display text-3xl">{data.targetScore ?? getDefaultTarget()}</div>
                <input
                  type="range"
                  min={getScoreRange()[0]}
                  max={getScoreRange()[1]}
                  step={data.testType === 'ACT' ? 1 : 10}
                  value={data.targetScore ?? getDefaultTarget()}
                  onChange={(e) => setData({ ...data, targetScore: Number(e.target.value) })}
                  className="mt-5 h-2 w-full accent-[#ff6b57]"
                />
              </div>
              <Button onClick={nextStep} className="mt-4 w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </StepScreen>
          )}

          {step === 3 && (
            <StepScreen title="When is your test?" description="We'll build a schedule that fits your timeline.">
              <input
                type="date"
                value={data.testDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setData({ ...data, testDate: e.target.value })}
                className="h-11 w-full rounded-2xl neu-inset px-4 text-sm text-paper focus:outline-none focus:ring-2 focus:ring-signal/40"
              />
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.testDate}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
              <button onClick={nextStep} className="mt-3 w-full text-sm text-fog hover:text-paper">Skip — I don&apos;t have a date yet</button>
            </StepScreen>
          )}

          {step === 4 && (
            <StepScreen title="Have you taken a practice test?" description="This sets your starting projected score.">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                {[{ label: 'Yes, I have', value: true }, { label: 'No, not yet', value: false }].map(({ label, value }) => (
                  <Choice key={String(value)} tall selected={data.hasTakenPractice === value} onClick={() => { setData({ ...data, hasTakenPractice: value }); nextStep() }}>
                    {label}
                  </Choice>
                ))}
              </div>
            </StepScreen>
          )}

          {step === 5 && (
            <StepScreen title="What was your practice score?" description="Skip if you have not taken one yet.">
              <div className="flex flex-1 flex-col justify-center">
                <div className="text-center font-display text-3xl">{data.baselineScore ?? getDefaultTarget()}</div>
                <input
                  type="range"
                  min={getScoreRange()[0]}
                  max={getScoreRange()[1]}
                  step={data.testType === 'ACT' ? 1 : 10}
                  value={data.baselineScore ?? getDefaultTarget()}
                  onChange={(e) => setData({ ...data, baselineScore: Number(e.target.value) })}
                  className="mt-5 h-2 w-full accent-[#ff6b57]"
                />
              </div>
              <Button onClick={nextStep} className="mt-4 w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
              <button onClick={nextStep} className="mt-3 w-full text-sm text-fog hover:text-paper">Skip</button>
            </StepScreen>
          )}

          {step === 6 && (
            <StepScreen title="What grade are you in?" description="So the plan matches your year.">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                {GRADES.map((grade) => (
                  <Choice key={grade} selected={data.gradeLevel === grade} onClick={() => setData({ ...data, gradeLevel: grade })}>
                    {grade}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.gradeLevel}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
            </StepScreen>
          )}

          {step === 7 && (
            <StepScreen title="School name" description="Optional, but useful if a teacher shares a code later.">
              <Input value={data.schoolName} onChange={(e) => setData({ ...data, schoolName: e.target.value })} placeholder="School" />
              <Button onClick={nextStep} className="mt-4 w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </StepScreen>
          )}

          {step === 8 && (
            <StepScreen title="What should we focus on?" description="Nova will weight your plan toward this.">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                {FOCUS.map((item) => (
                  <Choice key={item} tall selected={data.focusSection === item} onClick={() => setData({ ...data, focusSection: item })}>
                    {item}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.focusSection}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
            </StepScreen>
          )}

          {step === 9 && (
            <StepScreen title="Where do you feel weakest?" description="Pick every area that slows you down.">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                {WEAK.map((item) => (
                  <Choice key={item} selected={data.weakestAreas.includes(item)} onClick={() => toggleWeak(item)}>
                    {item}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </StepScreen>
          )}

          {step === 10 && (
            <StepScreen title="Why are you taking this test?" description="This changes how Nova talks to you.">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                {GOALS.map((item) => (
                  <Choice key={item} tall selected={data.testGoal === item} onClick={() => setData({ ...data, testGoal: item })}>
                    {item}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.testGoal}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
            </StepScreen>
          )}

          {step === 11 && (
            <StepScreen title="How much prep have you done?" description="So Nova starts at the right level.">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                {PREP.map((item) => (
                  <Choice key={item} tall selected={data.priorPrep === item} onClick={() => setData({ ...data, priorPrep: item })}>
                    {item}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.priorPrep}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
            </StepScreen>
          )}

          {step === 12 && (
            <StepScreen title="How long can you study each day?" description="Be realistic — consistency beats marathon sessions.">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                {STUDY_TIMES.map((t) => (
                  <Choice key={t} selected={data.dailyMinutes === t} onClick={() => setData({ ...data, dailyMinutes: t })}>
                    {t} min
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full" disabled={!data.dailyMinutes}>Continue <ChevronRight className="ml-1 h-5 w-5" /></Button>
            </StepScreen>
          )}

          {step === 13 && (
            <StepScreen title="What time do you study?" description="Home and Plan will lock to this window.">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                {START_TIMES.map((t) => (
                  <Choice key={t} selected={data.studyStartTime === t} onClick={() => setData({ ...data, studyStartTime: t })}>
                    {t}
                  </Choice>
                ))}
              </div>
              <Button onClick={nextStep} className="mt-4 w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
            </StepScreen>
          )}

          {step === 14 && (
            <StepScreen title="Which days can you study?" description="Select every day that works.">
              <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                {ALL_DAYS.map((day) => {
                  const selected = data.availableDays.includes(day)
                  return (
                    <Choice key={day} selected={selected} onClick={() => toggleDay(day)}>
                      {selected && <Check className="absolute right-3 top-3 h-5 w-5" />}
                      {DAY_SHORT[day]}
                    </Choice>
                  )
                })}
              </div>
              <Button onClick={handleComplete} className="mt-4 w-full" loading={processing} disabled={data.availableDays.length === 0}>
                {processing ? 'Saving…' : 'Build my plan'}
              </Button>
            </StepScreen>
          )}
        </div>
      </div>
    </div>
  )
}

function StepScreen({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="mb-1 text-xl font-bold text-paper">{title}</h2>
      <p className="mb-4 text-sm text-fog">{description}</p>
      {children}
    </div>
  )
}

function Choice({
  selected,
  onClick,
  children,
  tall,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  tall?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-2xl text-sm font-semibold',
        tall ? 'min-h-[64px]' : 'min-h-[40px]',
        selected ? 'neu-raised text-white' : 'neu-sm text-paper'
      )}
    >
      {children}
    </button>
  )
}
