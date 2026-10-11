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
import { NovaCharacter } from '@/components/study/nova-character'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { AnswerSheet, TestBooklet, type BookletMark } from '@/components/practice/test-booklet'
import {
  DIAGNOSTIC_QUESTIONS,
  SAT_ACT_DIFFERENCES,
  diagnosticSatScore,
  satToAct,
} from '@/lib/onboarding/diagnostic'
import { cn } from '@/lib/utils'
import { Check, ChevronRight, ChevronLeft, CalendarDays, MessageCircleHeart, HelpCircle } from 'lucide-react'

type ExamHistory = 'SAT' | 'ACT' | 'Both' | 'None'
type PlannedExam = 'SAT' | 'ACT' | 'Not sure yet'
type Phase = 'questions' | 'schedule' | 'practice' | 'tutor' | 'unlock'

type StepId =
  | 'name'
  | 'age'
  | 'history'
  | 'planned'
  | 'method'
  | 'struggle'
  | 'source'
  | 'target'
  | 'minutes'
  | 'prior'
  | 'diagnostic'
  | 'results'

const STUDY_METHODS = ['Self-study', 'School class', 'Prep course', 'Private tutor', "Didn't really study"]
const PRIOR_METHODS = ['Practice tests', 'Prep book', 'Online videos', 'Tutor or class', "Didn't study much"]
const STRUGGLES = ['Math', 'English', 'Reading']
const SOURCES = ['TikTok', 'Google Search', 'AI Recommendation', 'Instagram', 'From a friend', 'YouTube', 'Other']
const STUDY_TIMES = [15, 30, 45, 60, 90, 120]

interface OnboardingData {
  fullName: string
  age: string
  examHistory: ExamHistory | null
  plannedExam: PlannedExam | null
  studyMethod: string
  struggleAreas: string[]
  discoverySource: string
  targetScore: number | null
  dailyMinutes: number | null
  priorStudyMethod: string
}

interface ScheduleDay {
  date: string
  title: string
  minutes: number
}

function effectiveTargetTest(data: OnboardingData): 'SAT' | 'ACT' {
  if (data.examHistory === 'ACT') return 'ACT'
  if (data.examHistory === 'None') {
    if (data.plannedExam === 'ACT') return 'ACT'
    return 'SAT'
  }
  if (data.examHistory === 'SAT' || data.examHistory === 'Both') return 'SAT'
  return 'SAT'
}

function visibleSteps(data: OnboardingData): StepId[] {
  const steps: StepId[] = ['name', 'age', 'history']
  if (data.examHistory === 'None') steps.push('planned')
  if (data.examHistory && data.examHistory !== 'None') steps.push('method')
  steps.push('struggle', 'source', 'target', 'minutes')
  if (data.examHistory && data.examHistory !== 'None') steps.push('prior')
  steps.push('diagnostic', 'results')
  return steps
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
  const [stepIndex, setStepIndex] = React.useState(0)
  const [processing, setProcessing] = React.useState(false)
  const [schedulePreview, setSchedulePreview] = React.useState<ScheduleDay[]>([])
  const [promoCode, setPromoCode] = React.useState('')
  const [promoNote, setPromoNote] = React.useState('')
  const [promoError, setPromoError] = React.useState('')
  const [tutorOpen, setTutorOpen] = React.useState(false)
  const [tutorUsed, setTutorUsed] = React.useState(0)
  const [showDifferences, setShowDifferences] = React.useState(false)

  const [data, setData] = React.useState<OnboardingData>({
    fullName: '',
    age: '',
    examHistory: null,
    plannedExam: null,
    studyMethod: '',
    struggleAreas: [],
    discoverySource: '',
    targetScore: null,
    dailyMinutes: null,
    priorStudyMethod: '',
  })

  // Diagnostic state — same TestBooklet + AnswerSheet components as the practice test.
  const [diagAnswers, setDiagAnswers] = React.useState<Record<string, string>>({})
  const [diagMarks, setDiagMarks] = React.useState<Record<string, BookletMark>>({})
  const [diagFocused, setDiagFocused] = React.useState<string | null>(DIAGNOSTIC_QUESTIONS[0]?.id ?? null)
  const [diagSubmitted, setDiagSubmitted] = React.useState(false)

  const steps = visibleSteps(data)
  const step: StepId = steps[Math.min(stepIndex, steps.length - 1)] ?? 'name'

  const diagCorrect = React.useMemo(() => {
    if (!diagSubmitted) return null
    return DIAGNOSTIC_QUESTIONS.filter((q) => diagMarks[q.id]?.correct).length
  }, [diagSubmitted, diagMarks])
  const diagSat = diagCorrect == null ? null : diagnosticSatScore(diagCorrect)
  const diagAct = diagSat == null ? null : satToAct(diagSat)

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

  // Keep step index in range when conditional steps appear/disappear.
  React.useEffect(() => {
    setStepIndex((i) => Math.min(i, visibleSteps(data).length - 1))
  }, [data.examHistory])

  const progress = phase === 'questions'
    ? ((stepIndex + 1) / steps.length) * 70
    : phase === 'schedule'
      ? 78
      : phase === 'practice'
        ? 84
        : phase === 'tutor'
          ? 92
          : 98

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  function getScoreRange(): [number, number] {
    if (effectiveTargetTest(data) === 'ACT') return [1, 36]
    return [400, 1600]
  }
  function getDefaultTarget(): number {
    if (effectiveTargetTest(data) === 'ACT') return 30
    return 1400
  }

  function toggleStruggle(item: string) {
    setData((prev) => ({
      ...prev,
      struggleAreas: prev.struggleAreas.includes(item)
        ? prev.struggleAreas.filter((d) => d !== item)
        : [...prev.struggleAreas, item],
    }))
  }

  function examLabel(): string {
    if (data.examHistory === 'Both') return 'SAT / ACT'
    if (data.examHistory === 'SAT' || data.examHistory === 'ACT') return data.examHistory
    if (data.examHistory === 'None') {
      if (data.plannedExam === 'Not sure yet' || !data.plannedExam) return 'SAT / ACT'
      return data.plannedExam
    }
    return 'SAT / ACT'
  }

  async function saveProfileDraft(opts?: { diagnosticCorrect?: number; diagnosticSat?: number; diagnosticAct?: number }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return null
    }

    const ageNum = data.age.trim() === '' ? null : Number(data.age.trim())
    const validAge = ageNum != null && Number.isFinite(ageNum) && ageNum >= 5 && ageNum <= 120 ? Math.round(ageNum) : null
    const targetTest = effectiveTargetTest(data)
    const testPreference = data.examHistory === 'Both'
      ? 'Both'
      : data.examHistory === 'None'
        ? (data.plannedExam === 'Not sure yet' || !data.plannedExam ? 'Both' : data.plannedExam)
        : data.examHistory

    const fullPayload: Record<string, unknown> = {
      full_name: data.fullName.trim() || null,
      test_preference: testPreference,
      target_score: data.targetScore ?? getDefaultTarget(),
      current_estimated_score: opts?.diagnosticSat ?? diagSat ?? null,
      study_minutes_per_day: data.dailyMinutes,
      study_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      focus_section: data.struggleAreas.length === 1 ? data.struggleAreas[0] : data.struggleAreas.length > 1 ? 'Both' : null,
      weakest_areas: data.struggleAreas,
      prior_prep: data.studyMethod || data.priorStudyMethod || null,
      test_goal: data.discoverySource || null,
      // New survey columns (see supabase/migrations/202609200001_onboarding_survey.sql).
      age: validAge,
      exam_history: data.examHistory,
      planned_exam: data.plannedExam,
      study_method: data.studyMethod || null,
      struggle_areas: data.struggleAreas,
      discovery_source: data.discoverySource || null,
      prior_study_method: data.priorStudyMethod || null,
      diagnostic_sat: opts?.diagnosticSat ?? diagSat,
      diagnostic_act: opts?.diagnosticAct ?? diagAct,
      diagnostic_correct: opts?.diagnosticCorrect ?? diagCorrect,
      diagnostic_completed: diagSubmitted ? true : undefined,
      updated_at: new Date().toISOString(),
    }
    void targetTest

    const tryUpdate = async (payload: Record<string, unknown>) => {
      // Strip undefined so we never overwrite with undefined.
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) clean[k] = v
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return supabase.from('profiles').update(clean as any).eq('id', user.id)
    }

    let res = await tryUpdate(fullPayload)
    if (res.error && /column .* does not exist|schema cache/i.test(res.error.message)) {
      // Fallback for DBs where the survey migration hasn't been applied yet.
      const legacyPayload: Record<string, unknown> = {
        full_name: fullPayload.full_name,
        test_preference: fullPayload.test_preference,
        target_score: fullPayload.target_score,
        current_estimated_score: fullPayload.current_estimated_score,
        study_minutes_per_day: fullPayload.study_minutes_per_day,
        study_days: fullPayload.study_days,
        focus_section: fullPayload.focus_section,
        weakest_areas: fullPayload.weakest_areas,
        prior_prep: fullPayload.prior_prep,
        test_goal: fullPayload.test_goal,
        diagnostic_completed: fullPayload.diagnostic_completed,
        updated_at: fullPayload.updated_at,
      }
      res = await tryUpdate(legacyPayload)
    }
    if (res.error) throw res.error

    return user
  }

  function submitDiagnostic() {
    const marks: Record<string, BookletMark> = {}
    for (const q of DIAGNOSTIC_QUESTIONS) {
      const given = (diagAnswers[q.id] ?? '').trim().toUpperCase()
      const correct = given !== '' && given === q.correct_answer.toUpperCase()
      marks[q.id] = { correct }
    }
    setDiagMarks(marks)
    setDiagSubmitted(true)
    const correctCount = DIAGNOSTIC_QUESTIONS.filter((q) => marks[q.id]?.correct).length
    const sat = diagnosticSatScore(correctCount)
    const act = satToAct(sat)
    void saveProfileDraft({ diagnosticCorrect: correctCount, diagnosticSat: sat, diagnosticAct: act }).catch(() => undefined)
    void fetch('/api/onboarding/diagnostic-done', { method: 'POST' }).catch(() => undefined)
  }

  async function buildScheduleAndContinue() {
    setProcessing(true)
    try {
      const user = await saveProfileDraft()
      if (!user) return

      const testDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const targetScore = data.targetScore ?? getDefaultTarget()
      const dailyMinutes = data.dailyMinutes ?? 30
      const testType = effectiveTargetTest(data)

      await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testDate,
          testType,
          targetScore,
          baselineScore: diagSat,
          dailyMinutes,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
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
          ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, i) => ({
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
            : step === 'diagnostic'
              ? 'Diagnostic: 10 hard questions — 3 Reading, 3 Math, 4 Grammar.'
              : step === 'results'
                ? 'Here is where you stand right now.'
                : 'One screen at a time.'

  const diagFilled = DIAGNOSTIC_QUESTIONS.filter((q) => (diagAnswers[q.id] ?? '').trim() !== '').length

  return (
    <div className="flex min-h-screen flex-col px-5 py-5">
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-fog">
            {phase === 'questions' ? `Step ${stepIndex + 1} of ${steps.length}` : phase === 'schedule' ? 'Your schedule' : phase === 'practice' ? 'Try practice' : phase === 'tutor' ? 'Try tutoring' : 'Unlock'}
          </span>
          <span className="text-sm text-fog">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden neu-inset">
          <div className="h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className={cn('mx-auto flex w-full flex-1 flex-col', step === 'diagnostic' ? 'max-w-6xl' : 'max-w-4xl')}>
        <div className="relative mb-5 overflow-hidden rounded-[2rem] border-2 border-[#e5e5e5] bg-[linear-gradient(135deg,#f4ffe9,#eef9ff)] p-4 shadow-[0_6px_0_#e5e5e5] sm:p-5">
          <div className="absolute right-4 top-3 font-mono text-[9px] font-black uppercase tracking-[.18em] text-[#58cc02]">AI onboarding · live</div>
          <div className="flex items-center gap-4">
            <NovaCharacter mood={processing ? 'think' : phase === 'unlock' || step === 'results' ? 'cheer' : 'talk'} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-[#1cb0f6]">Nova is {processing ? 'thinking' : step === 'results' ? 'ready with your results' : 'learning about you'}</p>
              <p className="mt-2 font-display text-xl leading-snug text-[#3c3c3c]">{companionMessage}</p>
              <div className="mt-3 flex gap-1.5" aria-label={processing ? 'Nova is analyzing' : 'Nova is ready'}>{[0,1,2,3,4].map((dot)=><span key={dot} className={`h-2 rounded-full transition-all ${dot <= Math.min(4, Math.floor(progress/20)) ? 'w-8 bg-[#58cc02]' : 'w-2 bg-[#d7d7d7]'}`} />)}</div>
              {step === 'results' && diagSat != null ? <p className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#3c3c3c] shadow-sm">Analysis complete: SAT {diagSat} · ACT {diagAct}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {phase === 'questions' && (
            <>
              {step === 'name' && (
                <StepScreen title="Enter your name" description="This name shows on your home screen.">
                  <Input value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} placeholder="Your name" />
                  <Button onClick={goNext} className="mt-4 w-full" disabled={!data.fullName.trim()}>
                    Continue <ChevronRight className="ml-1 h-5 w-5" />
                  </Button>
                </StepScreen>
              )}

              {step === 'age' && (
                <StepScreen title="Enter your age" description="So we can tune pacing and recommendations.">
                  <Input
                    value={data.age}
                    onChange={(e) => setData({ ...data, age: e.target.value.replace(/[^0-9]/g, '').slice(0, 3) })}
                    placeholder="Your age"
                    inputMode="numeric"
                  />
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={goNext}
                      className="w-full"
                      disabled={(() => {
                        const n = Number(data.age)
                        return !(data.age.trim() !== '' && Number.isFinite(n) && n >= 5 && n <= 120)
                      })()}
                    >
                      Continue <ChevronRight className="ml-1 h-5 w-5" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'history' && (
                <StepScreen title="Have you taken the SAT or ACT before?" description="Pick the option that fits you best.">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    {(['SAT', 'ACT', 'Both', 'None'] as ExamHistory[]).map((t) => (
                      <Choice key={t} tall selected={data.examHistory === t} onClick={() => { setData({ ...data, examHistory: t, plannedExam: null }); }}>
                        {t === 'None' ? 'None yet' : t}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.examHistory}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'planned' && (
                <StepScreen title="Which exam are you planning to take?" description="Not sure? Tap the ? to see the differences.">
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDifferences((v) => !v)}
                      className="inline-flex items-center gap-1 text-sm text-fog hover:text-paper"
                      aria-label="What is the difference between SAT and ACT?"
                    >
                      <HelpCircle className="h-4 w-4" /> ?
                    </button>
                  </div>
                  {showDifferences && (
                    <div className="neu mb-3 space-y-2 p-3 text-sm text-fog">
                      {SAT_ACT_DIFFERENCES.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  )}
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    {(['SAT', 'ACT', 'Not sure yet'] as PlannedExam[]).map((t) => (
                      <Choice key={t} tall selected={data.plannedExam === t} onClick={() => setData({ ...data, plannedExam: t })}>
                        {t}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.plannedExam}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'method' && (
                <StepScreen
                  title={`How did you study for the ${data.examHistory === 'Both' ? 'SAT / ACT' : data.examHistory}?`}
                  description="Pick the closest option."
                >
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    {STUDY_METHODS.map((item) => (
                      <Choice key={item} tall selected={data.studyMethod === item} onClick={() => setData({ ...data, studyMethod: item })}>
                        {item}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.studyMethod}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'struggle' && (
                <StepScreen title="What do you struggle in?" description="Pick every area that slows you down.">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
                    {STRUGGLES.map((item) => (
                      <Choice key={item} tall selected={data.struggleAreas.includes(item)} onClick={() => toggleStruggle(item)}>
                        {item}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={data.struggleAreas.length === 0}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'source' && (
                <StepScreen title="How did you find us?" description="This helps us know which marketing is working.">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOURCES.map((item) => (
                      <Choice key={item} tall selected={data.discoverySource === item} onClick={() => setData({ ...data, discoverySource: item })}>
                        {item}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.discoverySource}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'target' && (
                <StepScreen
                  title={`What do you want to get on the ${examLabel()}?`}
                  description={effectiveTargetTest(data) === 'ACT' ? 'ACT range: 1–36' : 'SAT range: 400–1600'}
                >
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="text-center font-display text-3xl">{data.targetScore ?? getDefaultTarget()}</div>
                    <input
                      type="range"
                      min={getScoreRange()[0]}
                      max={getScoreRange()[1]}
                      step={effectiveTargetTest(data) === 'ACT' ? 1 : 10}
                      value={data.targetScore ?? getDefaultTarget()}
                      onChange={(e) => setData({ ...data, targetScore: Number(e.target.value) })}
                      className="mt-5 h-2 w-full accent-[#ff6b57]"
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full">Continue <ChevronRight className="ml-1 h-4 w-4" /></Button>
                  </div>
                </StepScreen>
              )}

              {step === 'minutes' && (
                <StepScreen title="How long do you plan to study per night?" description="Be realistic — consistency beats marathon sessions.">
                  <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                    {STUDY_TIMES.map((t) => (
                      <Choice key={t} selected={data.dailyMinutes === t} onClick={() => setData({ ...data, dailyMinutes: t })}>
                        {t} min
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.dailyMinutes}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'prior' && (
                <StepScreen title="How did you study before finding us?" description="Pick the resource you used most.">
                  <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    {PRIOR_METHODS.map((item) => (
                      <Choice key={item} tall selected={data.priorStudyMethod === item} onClick={() => setData({ ...data, priorStudyMethod: item })}>
                        {item}
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={goNext} className="w-full" disabled={!data.priorStudyMethod}>
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </StepScreen>
              )}

              {step === 'diagnostic' && (
                <div className="flex flex-1 flex-col">
                  <h2 className="mb-1 text-xl font-bold text-paper">Quick diagnostic — where do you stand?</h2>
                  <p className="mb-4 text-sm text-fog">
                    10 hard questions: 1 reading passage + 3 questions, 3 math, 4 grammar. Same answer sheet as the practice test.
                    Fill every bubble, then submit.
                  </p>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_min(220px,34vw)]">
                    <TestBooklet
                      testType="SAT"
                      sectionLabel="Diagnostic"
                      questions={DIAGNOSTIC_QUESTIONS}
                      answers={diagAnswers}
                      marks={diagSubmitted ? diagMarks : {}}
                      focusedId={diagFocused}
                      onFocus={(id) => {
                        setDiagFocused(id)
                        document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      onAnswer={(id, value) => {
                        if (diagSubmitted) return
                        setDiagAnswers((prev) => ({ ...prev, [id]: value }))
                        setDiagFocused(id)
                      }}
                      onCheck={() => undefined}
                      allowCheck={false}
                    />
                    <div className="sticky top-2 h-fit space-y-3 self-start">
                      <AnswerSheet
                        questions={DIAGNOSTIC_QUESTIONS}
                        answers={diagAnswers}
                        marks={diagSubmitted ? diagMarks : {}}
                        focusedId={diagFocused}
                        onJump={(id) => {
                          setDiagFocused(id)
                          document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }}
                      />
                      <p className="text-sm text-fog">{diagFilled}/10 answered</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    {!diagSubmitted ? (
                      <Button onClick={submitDiagnostic} className="w-full" disabled={diagFilled < 10}>
                        Submit diagnostic
                      </Button>
                    ) : (
                      <Button onClick={goNext} className="w-full">
                        See my projected score <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {!diagSubmitted && diagFilled < 10 && (
                    <p className="mt-2 text-sm text-fog">Answer all 10 to unlock your projected score.</p>
                  )}
                </div>
              )}

              {step === 'results' && (
                <StepScreen
                  title="Where you stand right now"
                  description="Each correct answer is worth 120 points, starting from 400."
                >
                  <div className="neu space-y-3 p-4 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
                      Diagnostic: {diagCorrect ?? 0}/10 correct
                    </p>
                    <p className="font-display text-5xl text-paper">{diagSat ?? diagnosticSatScore(0)}</p>
                    <p className="text-sm text-fog">Projected SAT score</p>
                    <div className="rounded-xl neu-sm px-3 py-2">
                      <p className="text-sm text-paper">
                        That is about a <span className="font-bold">{diagAct ?? satToAct(diagSat ?? 400)}</span> on the ACT.
                      </p>
                      <p className="mt-1 text-xs text-fog">
                        SAT 400–1600 · ACT 1–36. Your baseline is saved and your study plan will target the gap to your goal
                        of {data.targetScore ?? getDefaultTarget()} on the {examLabel()}.
                      </p>
                    </div>
                    {diagSubmitted && (
                      <div className="grid grid-cols-10 gap-1 pt-1">
                        {DIAGNOSTIC_QUESTIONS.map((q) => (
                          <span
                            key={q.id}
                            className={cn(
                              'flex h-7 items-center justify-center rounded-lg font-mono text-xs font-bold',
                              diagMarks[q.id]?.correct ? 'bg-ok/20 text-ok' : 'bg-bad/15 text-bad',
                            )}
                          >
                            {diagMarks[q.id]?.correct ? '✓' : '×'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" onClick={goBack} className="shrink-0">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => void buildScheduleAndContinue()} className="w-full" loading={processing} disabled={!diagSubmitted}>
                      {processing ? 'Building…' : 'See my schedule'}
                    </Button>
                  </div>
                  {!diagSubmitted && (
                    <p className="mt-2 text-sm text-fog">Go back and submit the diagnostic first.</p>
                  )}
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
              <Button onClick={() => setPhase('tutor')} className="mt-4 w-full">
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </StepScreen>
          )}

          {phase === 'practice' && (
            <StepScreen title="Diagnostic complete" description="You already finished the 10-question diagnostic.">
              <div className="neu flex flex-col gap-3 p-4">
                <p className="text-sm text-fog">
                  Projected SAT {diagSat ?? '—'} · about ACT {diagAct ?? '—'}. Continue to tutoring.
                </p>
                <Button className="w-full" onClick={() => setPhase('tutor')}>
                  Continue
                </Button>
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
      {selected && <Check className="absolute right-3 top-3 h-5 w-5" />}
      {children}
    </button>
  )
}
