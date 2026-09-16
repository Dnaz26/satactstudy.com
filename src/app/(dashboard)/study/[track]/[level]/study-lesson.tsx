'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { TutorRichText } from '@/components/practice/question-prompt'
import { cn } from '@/lib/utils'
import {
  buildGuidedLesson,
  CREATE_PASS_SCORE,
  CREATE_SAVE_SCORE,
  EXPLAIN_PASS_SCORE,
  LESSON_STEPS,
  PRACTICE_DIFFICULTY_LADDER,
  type GuidedLesson,
  type LessonStepId,
} from '@/lib/study/lesson-flow'
import { buildTeachBeats, isNearDuplicate, type TeachMood } from '@/lib/study/teach-beats'
import { pickPracticeQuestion } from '@/lib/study/copilot'
import { type StudyLevel, type StudyProblem, type StudyRank, type StudyTrack } from '@/lib/study/levels'
import { StudyTimer } from '@/components/ui/study-timer'
import { NovaCharacter } from '@/components/study/nova-character'
import { TeachingBoard } from '@/components/study/equation-board'
import { NOVA_NAME } from '@/lib/constants'

function useTypewriter(text: string, speed = 36) {
  const [displayed, setDisplayed] = React.useState('')
  const [done, setDone] = React.useState(false)

  React.useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) {
      setDone(true)
      return
    }
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        window.clearInterval(id)
        setDone(true)
      }
    }, speed)
    return () => window.clearInterval(id)
  }, [text, speed])

  return { displayed, done }
}

const AGENT_STEPS: LessonStepId[] = ['what', 'yesExamples', 'noExamples']

export function StudyLesson({ track, level }: { track: StudyTrack; level: StudyLevel }) {
  const router = useRouter()
  const [lesson, setLesson] = React.useState<GuidedLesson>(() => buildGuidedLesson(level))
  const [stepId, setStepId] = React.useState<LessonStepId>('what')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [, setStudiedSeconds] = React.useState(0)

  const [beatIndex, setBeatIndex] = React.useState(0)
  const [teaching, setTeaching] = React.useState(true)
  const saidHistory = React.useRef<string[]>([])
  const advanceTimer = React.useRef<number | null>(null)

  // Explain-back
  const [explainText, setExplainText] = React.useState('')
  const [explainBusy, setExplainBusy] = React.useState(false)
  const [explainResult, setExplainResult] = React.useState<{
    score: number
    passed: boolean
    feedback: string
    missed: string[]
    liveExample: string
  } | null>(null)

  // Practice
  const [practicePool, setPracticePool] = React.useState<StudyProblem[]>([])
  const [ladderIndex, setLadderIndex] = React.useState(0)
  const [correctStreak, setCorrectStreak] = React.useState(0)
  const [currentQ, setCurrentQ] = React.useState<StudyProblem | null>(null)
  const [choice, setChoice] = React.useState('')
  const [checked, setChecked] = React.useState(false)
  const usedPrompts = React.useRef<Set<string>>(new Set())

  // Create
  const [createPrompt, setCreatePrompt] = React.useState('')
  const [createChoices, setCreateChoices] = React.useState([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' },
  ])
  const [createAnswer, setCreateAnswer] = React.useState('A')
  const [createExplain, setCreateExplain] = React.useState('')
  const [createBusy, setCreateBusy] = React.useState(false)
  const [createResult, setCreateResult] = React.useState<{
    score: number
    passed: boolean
    saveWorthy: boolean
    saved: boolean
    feedback: string
  } | null>(null)

  const beats = React.useMemo(() => {
    return buildTeachBeats(lesson, stepId).filter(
      (beat) => !saidHistory.current.some((prev) => isNearDuplicate(prev, beat.say)),
    )
  }, [lesson, stepId])
  const beat = beats[Math.min(beatIndex, Math.max(0, beats.length - 1))]
  const isAgentStep = AGENT_STEPS.includes(stepId)
  const mood: TeachMood = teaching
    ? (beat?.mood ?? 'talk')
    : explainResult && !explainResult.passed
      ? 'think'
      : checked && currentQ && choice !== currentQ.answer
        ? 'think'
        : createResult?.passed
          ? 'cheer'
          : stepId === 'explainBack' || stepId === 'practice' || stepId === 'create'
            ? 'point'
            : 'idle'
  const line = beat?.say ?? `Let's learn ${lesson.title} together.`
  const { displayed, done: typed } = useTypewriter(line, teaching && isAgentStep ? 34 : 22)

  const stepMeta = LESSON_STEPS.find((s) => s.id === stepId) ?? LESSON_STEPS[0]
  const stepNumber = LESSON_STEPS.findIndex((s) => s.id === stepId) + 1
  const showExampleBoard = stepId === 'yesExamples' || stepId === 'noExamples'
  const ladderDifficulty: StudyRank = PRACTICE_DIFFICULTY_LADDER[Math.min(ladderIndex, PRACTICE_DIFFICULTY_LADDER.length - 1)] ?? 'easy'

  React.useEffect(() => {
    let cancelled = false
    void fetch('/api/study/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, level: level.index }),
    })
      .then((res) => res.json() as Promise<Partial<GuidedLesson> & { problems?: StudyProblem[] }>)
      .then((data) => {
        if (cancelled) return
        setLesson(buildGuidedLesson(level, {
          whatItIs: data.whatItIs,
          breakdown: data.breakdown,
          translateExample: data.translateExample,
          examples: data.examples,
          problems: data.problems,
        }))
        setStepId('what')
        setBeatIndex(0)
        setTeaching(true)
        saidHistory.current = []
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [track, level])

  React.useEffect(() => {
    setBeatIndex(0)
    setTeaching(true)
    setExplainResult(null)
    setChoice('')
    setChecked(false)
  }, [stepId])

  React.useEffect(() => {
    if (!typed || !line.trim()) return
    if (!saidHistory.current.some((prev) => isNearDuplicate(prev, line))) {
      saidHistory.current.push(line)
    }
  }, [typed, line])

  React.useEffect(() => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    if (!isAgentStep || !teaching || !typed) return
    const hold = Math.max(2600, Math.min(5000, line.length * 38))
    advanceTimer.current = window.setTimeout(() => {
      setBeatIndex((i) => {
        let next = i + 1
        while (next < beats.length && saidHistory.current.some((prev) => isNearDuplicate(prev, beats[next]!.say))) {
          next += 1
        }
        if (next < beats.length) return next
        setTeaching(false)
        return i
      })
    }, hold)
    return () => {
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current)
    }
  }, [teaching, typed, beatIndex, beats, line, isAgentStep])

  function loadNextPracticeQuestion(pool: StudyProblem[], difficulty: StudyRank) {
    const next = pickPracticeQuestion(pool, difficulty, usedPrompts.current)
    if (next) {
      usedPrompts.current.add(next.prompt)
      setCurrentQ(next)
      setChoice('')
      setChecked(false)
    }
  }

  async function ensurePracticePack() {
    if (practicePool.length >= 5 && currentQ) return
    const res = await fetch('/api/study/practice-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, level: level.index }),
    })
    const data = await res.json() as { problems?: StudyProblem[] }
    const pool = (data.problems?.length ? data.problems : lesson.problems)
    setPracticePool(pool)
    usedPrompts.current = new Set()
    setLadderIndex(0)
    setCorrectStreak(0)
    loadNextPracticeQuestion(pool, PRACTICE_DIFFICULTY_LADDER[0] ?? 'easy')
  }

  async function finish() {
    if (saving) return
    setSaving(true)
    setSaveError('')
    const payload = { track, level: level.index, status: 'completed' as const }
    let saved = false
    let lastError = ''
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      try {
        const res = await fetch('/api/study/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(payload),
        })
        const data = await res.json() as { success?: boolean; row?: { status?: string }; error?: string }
        saved = Boolean(res.ok && data.success && data.row?.status === 'completed')
        if (!saved) lastError = data.error ?? `Save failed (${res.status})`
      } catch {
        lastError = 'Network error while saving progress'
      }
    }
    if (!saved) {
      setSaving(false)
      setSaveError(lastError || 'Could not save this level. Try again.')
      return
    }
    router.push('/study')
    router.refresh()
  }

  function goNextStep() {
    if (isAgentStep && teaching) return
    const at = LESSON_STEPS.findIndex((s) => s.id === stepId)
    const next = LESSON_STEPS[at + 1]
    if (!next) {
      void finish()
      return
    }
    setStepId(next.id)
    if (next.id === 'practice') {
      void ensurePracticePack()
    }
  }

  async function submitExplain() {
    if (explainBusy || explainText.trim().length < 8) return
    setExplainBusy(true)
    setExplainResult(null)
    try {
      const res = await fetch('/api/study/score-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, level: level.index, answer: explainText.trim() }),
      })
      const data = await res.json() as {
        score: number
        passed: boolean
        feedback: string
        missed?: string[]
        liveExample?: string
      }
      setExplainResult({
        score: data.score,
        passed: data.passed,
        feedback: data.feedback,
        missed: data.missed ?? [],
        liveExample: data.liveExample ?? lesson.translateExample,
      })
      if (data.passed) {
        window.setTimeout(() => goNextStep(), 900)
      } else {
        setExplainText('')
      }
    } catch {
      setExplainResult({
        score: 0,
        passed: false,
        feedback: 'Could not score that. Try one more sentence.',
        missed: [],
        liveExample: lesson.translateExample,
      })
    } finally {
      setExplainBusy(false)
    }
  }

  function onCheckPractice() {
    if (!currentQ || !choice || checked) return
    setChecked(true)
    const ok = choice === currentQ.answer
    window.setTimeout(() => {
      if (ok) {
        const nextStreak = correctStreak + 1
        setCorrectStreak(nextStreak)
        if (nextStreak >= PRACTICE_DIFFICULTY_LADDER.length) {
          setStepId('create')
          return
        }
        const nextLadder = ladderIndex + 1
        setLadderIndex(nextLadder)
        loadNextPracticeQuestion(
          practicePool.length ? practicePool : lesson.problems,
          PRACTICE_DIFFICULTY_LADDER[nextLadder] ?? 'hard',
        )
        return
      }
      // Same difficulty, new question
      loadNextPracticeQuestion(
        practicePool.length ? practicePool : lesson.problems,
        ladderDifficulty,
      )
    }, 900)
  }

  async function submitCreatedQuestion() {
    if (createBusy) return
    setCreateBusy(true)
    setCreateResult(null)
    try {
      const res = await fetch('/api/study/grade-created-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track,
          level: level.index,
          prompt: createPrompt,
          choices: createChoices,
          answer: createAnswer,
          explanation: createExplain,
        }),
      })
      const data = await res.json() as {
        score?: number
        passed?: boolean
        saveWorthy?: boolean
        saved?: boolean
        feedback?: string
        error?: string
      }
      if (!res.ok) {
        setCreateResult({
          score: 0,
          passed: false,
          saveWorthy: false,
          saved: false,
          feedback: data.error ?? 'Could not grade that question.',
        })
        return
      }
      setCreateResult({
        score: data.score ?? 0,
        passed: Boolean(data.passed),
        saveWorthy: Boolean(data.saveWorthy),
        saved: Boolean(data.saved),
        feedback: data.feedback ?? '',
      })
      if (data.passed) {
        window.setTimeout(() => void finish(), 1100)
      }
    } catch {
      setCreateResult({
        score: 0,
        passed: false,
        saveWorthy: false,
        saved: false,
        feedback: 'Connection issue. Try submitting again.',
      })
    } finally {
      setCreateBusy(false)
    }
  }

  function replayTeach() {
    setBeatIndex(0)
    setTeaching(true)
  }

  const canContinueAgent = isAgentStep && !teaching && !loading

  return (
    <div className="relative mx-auto w-full max-w-3xl space-y-5 pb-14 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-fog">
            Copilot · {track} · Level {level.index} · Step {stepNumber} of {LESSON_STEPS.length}
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">{lesson.title}</h1>
        </div>
        <StudyTimer running={!teaching || !isAgentStep} label="Studied" onSeconds={setStudiedSeconds} />
      </div>

      <div className="flex gap-1.5">
        {LESSON_STEPS.map((step) => {
          const active = step.id === stepId
          const done = LESSON_STEPS.findIndex((s) => s.id === step.id) < LESSON_STEPS.findIndex((s) => s.id === stepId)
          return (
            <div
              key={step.id}
              className={cn(
                'h-1.5 flex-1 rounded-full transition',
                active ? 'bg-signal' : done ? 'bg-signal/40' : 'bg-black/10',
              )}
              title={step.label}
            />
          )
        })}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(160deg,#fff_0%,#fff5f0_55%,#ffe8df_100%)] px-4 pb-5 pt-6 shadow-[0_22px_0_rgba(0,0,0,0.05)] sm:px-6">
        <div className="relative flex items-end gap-2 sm:gap-4">
          <div className="relative z-10 -mb-1 shrink-0">
            <NovaCharacter mood={mood} size="md" className="sm:hidden" />
            <NovaCharacter mood={mood} size="lg" className="hidden sm:block" />
          </div>
          <div className="relative z-10 mb-10 min-w-0 flex-1">
            <div className="absolute -left-1 top-8 h-5 w-5 rotate-45 bg-white shadow-[-1px_1px_0_rgba(0,0,0,0.05)]" />
            <div className="relative rounded-[1.6rem] border border-black/8 bg-white px-5 py-4 shadow-[0_16px_0_rgba(0,0,0,0.04)]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-display text-lg text-paper">{NOVA_NAME}</p>
                <span className="rounded-full bg-signal/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
                  {teaching && isAgentStep ? 'Teaching' : stepMeta.role === 'student' ? 'Your turn' : stepMeta.label}
                </span>
                {isAgentStep && (
                  <button
                    type="button"
                    onClick={() => (teaching ? setTeaching(false) : replayTeach())}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-fog hover:bg-panel-2"
                  >
                    {teaching ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {teaching ? 'Skip talk' : 'Replay'}
                  </button>
                )}
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${stepId}-${beatIndex}-${line.slice(0, 24)}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="min-h-[4.5rem] text-lg leading-relaxed text-paper sm:text-xl"
                >
                  {isAgentStep ? displayed : line}
                  {isAgentStep && !typed && (
                    <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-signal align-middle" />
                  )}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {showExampleBoard && (
        <TeachingBoard
          examples={lesson.examples}
          focusLabel={beat?.focusLabel}
          focusSide={beat?.focusSide}
          stepId={stepId}
        />
      )}

      <div className="space-y-5 border-y border-line py-6">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-fog">{stepMeta.label}</p>

        {isAgentStep && (
          <Button className="h-14 w-full text-base" onClick={goNextStep} disabled={!canContinueAgent}>
            {teaching ? 'Nova is explaining…' : 'Continue · your turn next'}
          </Button>
        )}

        {stepId === 'explainBack' && (
          <div className="space-y-4">
            <p className="text-lg text-paper">
              Explain <span className="font-semibold text-signal">{lesson.title}</span> in your own words.
              Need <span className="font-semibold">{EXPLAIN_PASS_SCORE}+</span> / 100 to move on.
            </p>
            <textarea
              value={explainText}
              onChange={(e) => setExplainText(e.target.value)}
              rows={4}
              disabled={explainBusy || Boolean(explainResult?.passed)}
              placeholder="Type what this idea means, like you are teaching a friend…"
              className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-4 text-lg leading-relaxed text-paper outline-none focus:border-signal"
            />
            {explainResult && (
              <div className={cn(
                'rounded-2xl border px-4 py-4',
                explainResult.passed ? 'border-emerald-300 bg-emerald-50' : 'border-signal/30 bg-[rgba(255,92,57,0.08)]',
              )}>
                <p className="font-display text-2xl text-paper">{explainResult.score} / 100</p>
                <p className="mt-2 text-base text-paper">{explainResult.feedback}</p>
                {!explainResult.passed && (
                  <>
                    {explainResult.missed[0] && (
                      <p className="mt-2 text-sm text-fog">Missing: {explainResult.missed[0]}</p>
                    )}
                    <p className="mt-2 text-sm text-paper">
                      Live example: <TutorRichText text={explainResult.liveExample} className="text-inherit" />
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-signal">Try again with that piece included.</p>
                  </>
                )}
              </div>
            )}
            {!explainResult?.passed && (
              <Button
                className="h-14 w-full text-base"
                onClick={() => void submitExplain()}
                loading={explainBusy}
                disabled={explainText.trim().length < 8}
              >
                Score my explanation
              </Button>
            )}
          </div>
        )}

        {stepId === 'practice' && (
          <div className="space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-fog">
              Correct {correctStreak} / {PRACTICE_DIFFICULTY_LADDER.length} · {ladderDifficulty}
            </p>
            {currentQ ? (
              <>
                <p className="text-2xl leading-snug text-paper sm:text-3xl">
                  <TutorRichText text={currentQ.prompt} className="text-inherit" />
                </p>
                <div className="grid gap-3">
                  {currentQ.choices.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => !checked && setChoice(item.key)}
                      className={cn(
                        'rounded-2xl border px-5 py-4 text-left text-lg transition',
                        choice === item.key ? 'border-signal bg-signal text-white' : 'border-line bg-white',
                        checked && item.key === currentQ.answer && 'border-signal bg-[rgba(255,92,57,0.12)] text-paper',
                        checked && choice === item.key && item.key !== currentQ.answer && 'opacity-60',
                      )}
                    >
                      <span className="mr-3 font-mono text-xs">{item.key}</span>
                      {item.text}
                    </button>
                  ))}
                </div>
                {checked && (
                  <p className="text-lg text-fog">
                    {choice === currentQ.answer ? 'Yes. ' : 'Not that one — same difficulty, new question. '}
                    <TutorRichText text={currentQ.explain} />
                  </p>
                )}
                {!checked && (
                  <Button className="h-14 w-full text-base" onClick={onCheckPractice} disabled={!choice}>
                    Lock in
                  </Button>
                )}
              </>
            ) : (
              <Button className="h-14 w-full text-base" onClick={() => void ensurePracticePack()}>
                Load practice questions
              </Button>
            )}
          </div>
        )}

        {stepId === 'create' && (
          <div className="space-y-4">
            <p className="text-lg text-paper">
              Build one SAT/ACT-style question for <span className="font-semibold text-signal">{lesson.title}</span>.
              Need {CREATE_PASS_SCORE}+ to finish. {CREATE_SAVE_SCORE}+ saves it to the topic bank.
            </p>
            <label className="block space-y-2">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-fog">Question</span>
              <textarea
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-base text-paper outline-none focus:border-signal"
                placeholder="Write the stem like a real test question…"
              />
            </label>
            <div className="grid gap-2">
              {createChoices.map((item, index) => (
                <div key={item.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateAnswer(item.key)}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold',
                      createAnswer === item.key ? 'bg-signal text-white' : 'bg-panel-2 text-fog',
                    )}
                  >
                    {item.key}
                  </button>
                  <input
                    value={item.text}
                    onChange={(e) => {
                      const value = e.target.value
                      setCreateChoices((prev) => prev.map((row, i) => (i === index ? { ...row, text: value } : row)))
                    }}
                    className="h-11 flex-1 rounded-xl border border-line bg-white px-3 text-sm text-paper outline-none focus:border-signal"
                    placeholder={`Choice ${item.key}`}
                  />
                </div>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-fog">Why is the answer right?</span>
              <textarea
                value={createExplain}
                onChange={(e) => setCreateExplain(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm text-paper outline-none focus:border-signal"
              />
            </label>
            {createResult && (
              <div className={cn(
                'rounded-2xl border px-4 py-4',
                createResult.passed ? 'border-emerald-300 bg-emerald-50' : 'border-signal/30 bg-[rgba(255,92,57,0.08)]',
              )}>
                <p className="font-display text-2xl text-paper">{createResult.score} / 100</p>
                <p className="mt-2 text-base text-paper">{createResult.feedback}</p>
                {createResult.saved && (
                  <p className="mt-2 text-sm font-semibold text-emerald-700">Saved to the topic question bank.</p>
                )}
                {createResult.saveWorthy && !createResult.saved && createResult.passed && (
                  <p className="mt-2 text-sm text-fog">Bank-ready score — save may still be processing.</p>
                )}
              </div>
            )}
            {!createResult?.passed && (
              <Button
                className="h-14 w-full text-base"
                onClick={() => void submitCreatedQuestion()}
                loading={createBusy}
                disabled={createPrompt.trim().length < 12 || createChoices.some((c) => !c.text.trim())}
              >
                Grade my question
              </Button>
            )}
            {saveError && <p className="text-sm text-bad">{saveError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
