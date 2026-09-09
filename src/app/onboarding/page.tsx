'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { hasProductAccess, ONBOARDING_TRIAL } from '@/lib/access'
import { asPlan } from '@/lib/schema'
import { CHECKOUT_PROMO, isCheckoutPromo } from '@/lib/plans'
import { redeemPendingPromo, redeemPromoCode } from '@/lib/promo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Companion } from '@/components/ui/companion'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, CalendarDays, MessageCircleHeart, ClipboardList } from 'lucide-react'

type TestType = 'SAT' | 'ACT' | 'both'
type StudyDay = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'
type Phase = 'questions' | 'schedule' | 'practice' | 'tutor' | 'unlock'

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

interface ScheduleDay {
  date: string
  title: string
  minutes: number
}

function OnboardingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phaseParam = searchParams.get('phase') as Phase | null

  const [phase, setPhase] = React.useState<Phase>(
    phaseParam === 'tutor' || phaseParam === 'practice' || phaseParam === 'schedule' || phaseParam === 'unlock'
      ? phaseParam
      : 'questions',
  )
  const [step, setStep] = React.useState(0)
  const [processing, setProcessing] = React.useState(false)
  const [schedulePreview, setSchedulePreview] = React.useState<ScheduleDay[]>([])
  const [promoCode, setPromoCode] = React.useState('')
  const [promoNote, setPromoNote] = React.useState('')
  const [promoError, setPromoError] = React.useState('')
  const [tutorOpen, setTutorOpen] = React.useState(false)
  const [tutorUsed, setTutorUsed] = React.useState(0)
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
    if (phaseParam === 'tutor' || phaseParam === 'practice' || phaseParam === 'schedule' || phaseParam === 'unlock') {
      setPhase(phaseParam)
    }
  }, [phaseParam])

  React.useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(async ({ data: auth }) => {
      const user = auth.user
      if (!user) return
      const name = (user.user_metadata.full_name as string | undefined) ?? user.user_metadata.name ?? ''
      if (name) setData((prev) => ({ ...prev, fullName: prev.fullName || String(name) }))

      const { data: profile } = await supabase
        .from('profiles')
        .select('trial_ai_chats_used, diagnostic_completed, billing_promo')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.trial_ai_chats_used != null) setTutorUsed(profile.trial_ai_chats_used)
      if (profile?.billing_promo && isCheckoutPromo(profile.billing_promo)) {
        setPromoCode(CHECKOUT_PROMO.code)
        setPromoNote(`${CHECKOUT_PROMO.label} saved.`)
      }
    })
    void redeemPendingPromo().then((result) => {
      if (result?.checkoutPromo) {
        setPromoCode(CHECKOUT_PROMO.code)
        setPromoNote(`${CHECKOUT_PROMO.label} ready — ${CHECKOUT_PROMO.trialDays} days free after setup.`)
      }
    })
  }, [])

  const questionSteps = 15
  const progress = phase === 'questions'
    ? ((step + 1) / questionSteps) * 70
    : phase === 'schedule'
      ? 75
      : phase === 'practice'
        ? 82
        : phase === 'tutor'
          ? 90
          : 98

  function nextStep() {
    if (step < questionSteps - 1) setStep(step + 1)
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

  async function saveProfileDraft() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
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
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    return user
  }

  async function buildScheduleAndContinue() {
    setProcessing(true)
    try {
      const user = await saveProfileDraft()
      if (!user) return

      const testDate = data.testDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const targetScore = data.targetScore ?? getDefaultTarget()
      const dailyMinutes = data.dailyMinutes ?? 30

      await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate,
          testType: data.testType ?? 'SAT',
          targetScore,
          baselineScore: data.baselineScore,
          dailyMinutes,
          availableDays: data.availableDays,
        }),
      })

      const supabase = createClient()
      const today = new Date().toISOString().slice(0, 10)
      const { data: plans } = await supabase
        .from('study_plans')
        .select('id, plan_date, total_minutes')
        .eq('user_id', user.id)
        .gte('plan_date', today)
        .order('plan_date', { ascending: true })
        .limit(7)

      if (plans?.length) {
        const planIds = plans.map((p) => p.id)
        const { data: tasks } = await supabase
          .from('study_plan_tasks')
          .select('plan_id, title, target_minutes')
          .in('plan_id', planIds)
          .order('sort_order', { ascending: true })

        setSchedulePreview(
          plans.map((plan) => {
            const first = (tasks ?? []).find((t) => t.plan_id === plan.id)
            return {
              date: plan.plan_date,
              title: first?.title ?? 'Study block',
              minutes: first?.target_minutes ?? plan.total_minutes ?? dailyMinutes,
            }
          }),
        )
      } else {
        setSchedulePreview(
          data.availableDays.slice(0, 5).map((day, i) => ({
            date: day,
            title: i % 2 === 0 ? 'Topic practice' : 'Review + tutor',
            minutes: dailyMinutes,
          })),
        )
      }

      setPhase('schedule')
    } finally {
      setProcessing(false)
    }
  }

  async function finishOnboarding(opts?: { skipPromo?: boolean }) {
    setProcessing(true)
    setPromoError('')
    try {
      const user = await saveProfileDraft()
      if (!user) return

      const code = promoCode.trim() || (typeof window !== 'undefined' ? sessionStorage.getItem('pending_promo') ?? '' : '')
      if (code && !opts?.skipPromo) {
        const redeemed = await redeemPromoCode(code)
        if (!redeemed.ok && redeemed.error !== 'pending') {
          setPromoError(redeemed.error ?? 'Invalid code')
          setProcessing(false)
          return
        }
        if (redeemed.checkoutPromo) {
          setPromoNote(`${CHECKOUT_PROMO.label} unlocked — free until your trial ends.`)
        }
      }

      const supabase = createClient()
      await supabase.from('profiles').update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan, role, trial_ends_at, billing_promo')
        .eq('id', user.id)
        .single()

      const product = hasProductAccess({
        plan: asPlan(profile?.subscription_plan),
        role: profile?.role,
        trialEndsAt: profile?.trial_ends_at,
      })

      router.push(product ? '/dashboard' : '/pricing')
      router.refresh()
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }

  async function applyUnlockCode() {
    setPromoError('')
    setPromoNote('')
    const trimmed = promoCode.trim()
    if (!trimmed) {
      setPromoError('Enter a code or continue to pricing')
      return
    }
    setProcessing(true)
    const redeemed = await redeemPromoCode(trimmed)
    setProcessing(false)
    if (!redeemed.ok && redeemed.error !== 'pending') {
      setPromoError(redeemed.error ?? 'Invalid code')
      return
    }
    if (redeemed.accessCode) {
      setPromoNote('Access code applied — full product unlocked.')
      await finishOnboarding({ skipPromo: true })
      return
    }
    if (redeemed.checkoutPromo) {
      setPromoNote(`${CHECKOUT_PROMO.label}: ${CHECKOUT_PROMO.trialDays} days free, then ${CHECKOUT_PROMO.percentOff}% off.`)
      return
    }
  }

  const companionMessage =
    phase === 'schedule'
      ? 'Here is the schedule built from your answers.'
      : phase === 'practice'
        ? `Try ${ONBOARDING_TRIAL.questions} real questions — same sheet as the product.`
        : phase === 'tutor'
          ? `Ask Nova up to ${ONBOARDING_TRIAL.aiChats} times (${Math.max(0, ONBOARDING_TRIAL.aiChats - tutorUsed)} left).`
          : phase === 'unlock'
            ? 'Enter DN126 for free access, RHS for 2 weeks free + special pricing, or continue to paywall.'
            : 'One screen at a time.'

  return (
    <div className="flex min-h-screen flex-col px-5 py-5">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-fog">
            {phase === 'questions' ? `Step ${step + 1} of ${questionSteps}` : phase === 'schedule' ? 'Your schedule' : phase === 'practice' ? 'Try practice' : phase === 'tutor' ? 'Try tutoring' : 'Unlock'}
          </span>
          <span className="text-sm text-fog">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden neu-inset">
          <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <Companion compact mode={phase === 'unlock' ? 'success' : 'studying'} message={companionMessage} />

        <div className="mt-4 flex flex-1 flex-col">
          {phase === 'questions' && (
            <>
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
                <StepScreen title="Which days can you study?" description="Select every day that works — then see your schedule.">
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
                  <Button onClick={() => void buildScheduleAndContinue()} className="mt-4 w-full" loading={processing} disabled={data.availableDays.length === 0}>
                    {processing ? 'Building…' : 'See my schedule'}
                  </Button>
                </StepScreen>
              )}
            </>
          )}

          {phase === 'schedule' && (
            <StepScreen title="Your study schedule" description="Built from your answers — this is what the product runs every week.">
              <div className="neu space-y-2 p-3">
                <div className="mb-2 flex items-center gap-2 text-signal">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Next blocks</span>
                </div>
                {(schedulePreview.length ? schedulePreview : [{ date: 'Soon', title: 'Topic practice', minutes: data.dailyMinutes ?? 30 }]).map((row, i) => (
                  <div key={`${row.date}-${i}`} className="flex items-center justify-between rounded-xl neu-sm px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-paper">{row.title}</p>
                      <p className="text-xs text-fog">{row.date}</p>
                    </div>
                    <span className="font-mono text-xs text-fog">{row.minutes}m</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setPhase('practice')} className="mt-4 w-full">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </StepScreen>
          )}

          {phase === 'practice' && (
            <StepScreen title="5-question practice" description="Same booklet UI as the product. Score them, then come back.">
              <div className="neu flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-signal">
                  <ClipboardList className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Diagnostic</span>
                </div>
                <p className="text-sm text-fog">
                  {ONBOARDING_TRIAL.questions} questions · mixed difficulty · full answer sheet + Nova
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    const testType = data.testType === 'ACT' ? 'ACT' : 'SAT'
                    router.push(`/onboarding/practice?testType=${testType}&count=5&from=onboarding`)
                  }}
                >
                  Start practice
                </Button>
                <button type="button" className="text-sm text-fog hover:text-paper" onClick={() => setPhase('tutor')}>
                  Skip for now
                </button>
              </div>
            </StepScreen>
          )}

          {phase === 'tutor' && (
            <StepScreen title="Try tutoring mode" description={`You get ${ONBOARDING_TRIAL.aiChats} chats during setup.`}>
              <div className="neu flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2 text-signal">
                  <MessageCircleHeart className="h-4 w-4" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Nova</span>
                </div>
                <p className="text-sm text-fog">
                  {Math.max(0, ONBOARDING_TRIAL.aiChats - tutorUsed)} of {ONBOARDING_TRIAL.aiChats} tries left
                </p>
                <Button
                  className="w-full"
                  disabled={tutorUsed >= ONBOARDING_TRIAL.aiChats}
                  onClick={() => setTutorOpen(true)}
                >
                  Open tutoring
                </Button>
                <Button variant="outline" className="w-full" onClick={() => setPhase('unlock')}>
                  Continue
                </Button>
              </div>
              <AiTutorPanel
                open={tutorOpen}
                onClose={() => {
                  setTutorOpen(false)
                  const supabase = createClient()
                  void supabase.auth.getUser().then(async ({ data: auth }) => {
                    if (!auth.user) return
                    const { data: profile } = await supabase
                      .from('profiles')
                      .select('trial_ai_chats_used')
                      .eq('id', auth.user.id)
                      .maybeSingle()
                    if (profile?.trial_ai_chats_used != null) setTutorUsed(profile.trial_ai_chats_used)
                  })
                }}
                context={{
                  questionText: 'I just finished onboarding. Help me plan how to use my first study week.',
                  topicName: 'Study plan',
                  sectionName: 'Onboarding',
                  desmosAvailable: false,
                }}
              />
            </StepScreen>
          )}

          {phase === 'unlock' && (
            <StepScreen title="Unlock the product" description="Code DN126 = free forever. Code RHS = 2 weeks free, then special pricing. No code = paywall.">
              <div className="neu space-y-3 p-4">
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Promo or access code"
                />
                <Button className="w-full" loading={processing} onClick={() => void applyUnlockCode()} disabled={!promoCode.trim()}>
                  Apply code
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  loading={processing}
                  onClick={() => void finishOnboarding()}
                >
                  {promoCode.trim() && isCheckoutPromo(promoCode)
                    ? `Start ${CHECKOUT_PROMO.trialDays}-day free access`
                    : 'Continue to pricing'}
                </Button>
              </div>
              {promoNote && <p className="mt-3 text-sm text-ok">{promoNote}</p>}
              {promoError && <p className="mt-3 text-sm text-bad">{promoError}</p>}
            </StepScreen>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center text-fog">Loading…</div>}>
      <OnboardingInner />
    </React.Suspense>
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
