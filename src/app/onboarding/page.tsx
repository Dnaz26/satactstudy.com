'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, Loader2 } from 'lucide-react'

type TestType = 'SAT' | 'ACT' | 'both'
type StudyDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'

const STUDY_TIMES = [15, 30, 45, 60, 90, 120]
const ALL_DAYS: StudyDay[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<StudyDay, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
}

interface OnboardingData {
  testType: TestType | null
  targetScore: number | null
  testDate: string
  hasTakenPractice: boolean | null
  baselineScore: number | null
  dailyMinutes: number | null
  availableDays: StudyDay[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [processing, setProcessing] = React.useState(false)
  const [data, setData] = React.useState<OnboardingData>({
    testType: null,
    targetScore: null,
    testDate: '',
    hasTakenPractice: null,
    baselineScore: null,
    dailyMinutes: null,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  })

  const totalSteps = 7

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
        test_preference: data.testType === 'both' ? 'Both' : data.testType,
        target_score: data.targetScore,
        current_estimated_score: data.baselineScore,
        test_date: data.testDate || null,
        study_minutes_per_day: data.dailyMinutes,
        study_days: data.availableDays,
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

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }

  const progress = ((step) / (totalSteps - 1)) * 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-fog">Step {step + 1} of {totalSteps}</span>
            <span className="text-sm text-fog">{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 neu-inset overflow-hidden">
            <div
              className="h-full bg-signal rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="neu p-8">
          {step === 0 && (
            <StepWrapper
              title="Which test are you preparing for?"
              description="We'll customize your study plan accordingly."
            >
              <div className="grid grid-cols-3 gap-3">
                {(['SAT', 'ACT', 'both'] as TestType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setData({ ...data, testType: t, targetScore: null }); nextStep() }}
                    className={cn(
                      'rounded-2xl py-4 text-sm font-semibold transition-all',
                      data.testType === t
                        ? 'neu-raised text-white'
                        : 'neu-sm text-paper'
                    )}
                  >
                    {t === 'both' ? 'Both' : t}
                  </button>
                ))}
              </div>
            </StepWrapper>
          )}

          {step === 1 && data.testType && (
            <StepWrapper
              title="What's your target score?"
              description={data.testType === 'ACT' ? 'ACT range: 1–36' : data.testType === 'SAT' ? 'SAT range: 400–1600' : 'Enter your goal score'}
            >
              <div className="space-y-4">
                <div className="text-center text-5xl font-bold text-paper">
                  {data.targetScore ?? getDefaultTarget()}
                </div>
                <input
                  type="range"
                  min={getScoreRange()[0]}
                  max={getScoreRange()[1]}
                  step={data.testType === 'ACT' ? 1 : 10}
                  value={data.targetScore ?? getDefaultTarget()}
                  onChange={(e) => setData({ ...data, targetScore: Number(e.target.value) })}
                  className="w-full accent-[#ff6b57]"
                />
                <div className="flex justify-between text-xs text-fog">
                  <span>{getScoreRange()[0]}</span>
                  <span>{getScoreRange()[1]}</span>
                </div>
                <Button onClick={nextStep} className="w-full">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepWrapper>
          )}

          {step === 2 && (
            <StepWrapper
              title="When is your test?"
              description="We'll build a schedule that fits your timeline."
            >
              <div className="space-y-4">
                <input
                  type="date"
                  value={data.testDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setData({ ...data, testDate: e.target.value })}
                  className="w-full h-12 rounded-2xl neu-inset px-4 text-paper focus:outline-none focus:ring-2 focus:ring-signal/40"
                />
                <Button onClick={nextStep} className="w-full" disabled={!data.testDate}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <button onClick={nextStep} className="w-full text-sm text-fog hover:text-paper">
                  Skip — I don&apos;t have a date yet
                </button>
              </div>
            </StepWrapper>
          )}

          {step === 3 && (
            <StepWrapper
              title="Have you taken a practice test?"
              description="This helps us calibrate your starting score prediction."
            >
              <div className="grid grid-cols-2 gap-3">
                {[{ label: 'Yes, I have', value: true }, { label: 'No, not yet', value: false }].map(({ label, value }) => (
                  <button
                    key={String(value)}
                    onClick={() => { setData({ ...data, hasTakenPractice: value }); if (!value) nextStep() }}
                    className={cn(
                      'rounded-2xl py-4 text-sm font-semibold transition-all',
                      data.hasTakenPractice === value
                        ? 'neu-raised text-white'
                        : 'neu-sm text-paper'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {data.hasTakenPractice && (
                <div className="mt-4 space-y-4">
                  <div className="text-center text-4xl font-bold text-paper">
                    {data.baselineScore ?? getDefaultTarget()}
                  </div>
                  <input
                    type="range"
                    min={getScoreRange()[0]}
                    max={getScoreRange()[1]}
                    step={data.testType === 'ACT' ? 1 : 10}
                    value={data.baselineScore ?? getDefaultTarget()}
                    onChange={(e) => setData({ ...data, baselineScore: Number(e.target.value) })}
                    className="w-full accent-[#ff6b57]"
                  />
                  <Button onClick={nextStep} className="w-full">
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </StepWrapper>
          )}

          {step === 4 && (
            <StepWrapper
              title="How long can you study each day?"
              description="Be realistic — consistency beats marathon sessions."
            >
              <div className="grid grid-cols-3 gap-2">
                {STUDY_TIMES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setData({ ...data, dailyMinutes: t })}
                    className={cn(
                      'rounded-2xl py-3 text-sm font-semibold transition-all',
                      data.dailyMinutes === t
                        ? 'neu-raised text-white'
                        : 'neu-sm text-paper'
                    )}
                  >
                    {t} min
                  </button>
                ))}
              </div>
              <Button onClick={nextStep} className="w-full mt-4" disabled={!data.dailyMinutes}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </StepWrapper>
          )}

          {step === 5 && (
            <StepWrapper
              title="Which days can you study?"
              description="Select all days that work for you."
            >
              <div className="grid grid-cols-4 gap-2">
                {ALL_DAYS.map((day) => {
                  const selected = data.availableDays.includes(day)
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'rounded-2xl py-3 text-sm font-semibold transition-all relative',
                        selected
                          ? 'neu-raised text-white'
                          : 'neu-sm text-paper'
                      )}
                    >
                      {selected && (
                        <Check className="w-3 h-3 absolute top-1 right-1 text-white" />
                      )}
                      {DAY_SHORT[day]}
                    </button>
                  )
                })}
              </div>
              <Button onClick={nextStep} className="w-full mt-4" disabled={data.availableDays.length === 0}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </StepWrapper>
          )}

          {step === 6 && (
            <StepWrapper
              title="Building your personalized plan..."
              description="We're generating your custom study schedule based on your goals."
            >
              <div className="py-4 space-y-3">
                {[
                  'Analyzing your target score',
                  'Calculating optimal study distribution',
                  'Generating your first study plan',
                  'Setting up your dashboard',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <Check className="w-3 h-3 text-ok" />
                    </div>
                    <span className="text-sm text-fog">{item}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleComplete}
                className="w-full"
                size="lg"
                loading={processing}
              >
                {processing ? 'Creating your plan...' : 'Go to Dashboard'}
              </Button>
            </StepWrapper>
          )}
        </div>
      </div>
    </div>
  )
}

function StepWrapper({ title, description, children }: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-paper mb-2">{title}</h2>
      <p className="text-fog text-sm mb-8">{description}</p>
      {children}
    </div>
  )
}
