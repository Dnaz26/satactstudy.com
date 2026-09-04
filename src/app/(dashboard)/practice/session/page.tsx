'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QuestionTimer } from '@/components/ui/question-timer'
import { StudyTimer } from '@/components/ui/study-timer'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { parseCalculatorConfig } from '@/lib/desmos/actions'
import { cn } from '@/lib/utils'
import type { TutorTrigger } from '@/lib/tutor/types'
import { AlertCircle } from 'lucide-react'
import {
  AnswerSheet,
  TestBooklet,
  type BookletMark,
  type BookletQuestion,
} from '@/components/practice/test-booklet'
import { PracticeTools } from '@/components/practice/practice-tools'
import {
  clearPracticeSnapshot,
  readPracticeSnapshot,
  writePracticeSnapshot,
  type PracticeSnapshot,
} from '@/lib/practice/persist'

function answersMatch(selected: string, correct: string): boolean {
  const a = selected.trim().toLowerCase()
  const b = correct.trim().toLowerCase()
  if (a === b) return true
  const na = Number(a.replace(/,/g, ''))
  const nb = Number(b.replace(/,/g, ''))
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb
}

function instantWhy(question: BookletQuestion): string {
  if (question.ai_explanation) {
    try {
      const parsed = JSON.parse(question.ai_explanation) as { why?: string; steps?: string[] }
      const steps = (parsed.steps ?? []).map((step) => step.trim()).filter(Boolean).slice(0, 4)
      if (steps.length) {
        const intro = parsed.why?.trim()
        return [intro, ...steps.map((step, index) => `${index + 1}. ${step}`)].filter(Boolean).join('\n')
      }
      if (parsed.why) return parsed.why
    } catch {
      return question.ai_explanation.slice(0, 420)
    }
  }
  if (question.official_explanation) return question.official_explanation.slice(0, 220)
  return `The correct answer is ${question.correct_answer}.`
}

function sectionFromQuestions(questions: BookletQuestion[], fallback: string): string {
  const names = [...new Set(questions.map((q) => q.section_name).filter(Boolean))] as string[]
  if (names.length === 1) return names[0]
  if (names.length > 1) return 'Mixed'
  return fallback || 'Practice'
}

function SessionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const desmos = useDesmos()

  const testType = searchParams.get('testType') ?? 'SAT'
  const topicId = searchParams.get('topicId') ?? ''
  const difficulty = searchParams.get('difficulty') ?? 'mixed'
  const count = Number(searchParams.get('count') ?? MIN_TOPIC_QUESTIONS)
  const categoryName = searchParams.get('categoryName') ?? ''
  const sectionName = searchParams.get('sectionName') ?? ''
  const timed = searchParams.get('timed') === '1'
  const pace = Number(searchParams.get('pace') ?? 90)
  const taskId = searchParams.get('taskId') ?? ''
  const fullTest = !topicId && count >= 20

  const [questions, setQuestions] = React.useState<BookletQuestion[]>([])
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [marks, setMarks] = React.useState<Record<string, BookletMark>>({})
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [elapsed, setElapsed] = React.useState(0)
  const [timerRunning, setTimerRunning] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false)
  const [pendingTrigger, setPendingTrigger] = React.useState<{ trigger: TutorTrigger; prompt: string } | null>(null)
  const [hintUsed, setHintUsed] = React.useState<Record<string, boolean>>({})
  const [clockStart, setClockStart] = React.useState(0)
  const [sheetTestType, setSheetTestType] = React.useState(testType)
  const startedAt = React.useRef<Record<string, number>>({})
  const finished = React.useRef(false)

  function snapshotFromState(overrides?: Partial<PracticeSnapshot>): PracticeSnapshot {
    return {
      version: 1,
      kind: topicId ? 'topic' : 'main',
      topicId,
      taskId,
      testType,
      difficulty,
      count,
      categoryName,
      sectionName,
      timed,
      pace,
      sessionId,
      questions,
      answers,
      marks,
      focusedId,
      elapsed,
      hintUsed,
      updatedAt: Date.now(),
      ...overrides,
    }
  }

  React.useEffect(() => {
    let cancelled = false
    async function loadQuestions() {
      const saved = readPracticeSnapshot(topicId)
      if (saved) {
        setQuestions(saved.questions)
        setAnswers(saved.answers)
        setMarks(saved.marks)
        setFocusedId(saved.focusedId ?? saved.questions[0]?.id ?? null)
        setSessionId(saved.sessionId)
        setHintUsed(saved.hintUsed)
        setElapsed(saved.elapsed)
        setClockStart(saved.elapsed)
        setSheetTestType(saved.testType || testType)
        if (saved.questions[0]) startedAt.current[saved.questions[0].id] = Date.now()
        setTimerRunning(true)
        setLoading(false)
        return
      }

      try {
        const params = new URLSearchParams({
          testType,
          topicId,
          difficulty,
          count: String(count),
        })
        if (categoryName) params.set('categoryName', categoryName)
        if (sectionName) params.set('sectionName', sectionName)
        const res = await fetch(`/api/practice/questions?${params.toString()}`)
        const data = await res.json() as { questions?: BookletQuestion[]; sessionId?: string; error?: string; paywall?: boolean }
        if (cancelled) return

        if (data.paywall) {
          router.replace('/pricing')
          return
        }

        if (!res.ok || data.error) {
          setError(data.error ?? 'Failed to load questions')
          setLoading(false)
          return
        }

        const loaded = data.questions ?? []
        setQuestions(loaded)
        setSessionId(data.sessionId ?? null)
        setSheetTestType(testType)
        setFocusedId(loaded[0]?.id ?? null)
        if (loaded[0]) startedAt.current[loaded[0].id] = Date.now()
        setTimerRunning(true)
        setLoading(false)
        writePracticeSnapshot({
          version: 1,
          kind: topicId ? 'topic' : 'main',
          topicId,
          taskId,
          testType,
          difficulty,
          count,
          categoryName,
          sectionName,
          timed,
          pace,
          sessionId: data.sessionId ?? null,
          questions: loaded,
          answers: {},
          marks: {},
          focusedId: loaded[0]?.id ?? null,
          elapsed: 0,
          hintUsed: {},
          updatedAt: Date.now(),
        })
      } catch {
        if (!cancelled) {
          setError('Failed to load questions. Please try again.')
          setLoading(false)
        }
      }
    }
    void loadQuestions()
    return () => {
      cancelled = true
    }
  }, [testType, topicId, difficulty, count, categoryName, sectionName, timed, pace, taskId, router])

  React.useEffect(() => {
    if (loading || finished.current || questions.length === 0) return
    writePracticeSnapshot(snapshotFromState())
  }, [questions, answers, marks, focusedId, sessionId, hintUsed, loading, topicId, taskId, testType, difficulty, count, categoryName, sectionName, timed, pace])

  const focused = questions.find((q) => q.id === focusedId) ?? questions[0]
  const calculatorConfig = parseCalculatorConfig(focused?.calculator_config)

  React.useEffect(() => {
    if (!focused) return
    desmos.applyQuestion(focused.id, calculatorConfig)
  }, [focused?.id])

  function focusQuestion(id: string) {
    setFocusedId(id)
    if (!startedAt.current[id]) startedAt.current[id] = Date.now()
    document.getElementById(`q-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function timeFor(id: string): number {
    const start = startedAt.current[id]
    if (!start) return Math.max(1, elapsed)
    return Math.max(1, Math.round((Date.now() - start) / 1000))
  }

  async function checkQuestion(id: string, openTutor = true) {
    const question = questions.find((item) => item.id === id)
    const value = answers[id]?.trim()
    if (!question || !value || marks[id]) return

    const localCorrect = answersMatch(value, question.correct_answer)
    const why = localCorrect ? undefined : instantWhy(question)
    setMarks((prev) => ({ ...prev, [id]: { correct: localCorrect, why } }))

    if (!localCorrect && openTutor && !fullTest) {
      setAiPanelOpen(true)
      setPendingTrigger({
        trigger: 'wrong_answer',
        prompt: `I chose ${value}. That was wrong. Explain in 4 easy short steps why, then how to get the right answer.`,
      })
    }

    void fetch('/api/practice/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: question.id,
        topicId: question.topic_id,
        sessionId,
        selectedAnswer: value,
        timeSeconds: timeFor(id),
        difficulty: question.difficulty,
        tutorUsed: aiPanelOpen || !localCorrect,
        hintUsed: Boolean(hintUsed[id]),
        desmosUsed: desmos.open,
      }),
    }).then(async (res) => {
      const data = await res.json() as { isCorrect?: boolean; correctAnswer?: string }
      if (typeof data.isCorrect === 'boolean' && data.isCorrect !== localCorrect) {
        setMarks((prev) => ({
          ...prev,
          [id]: { correct: data.isCorrect as boolean, why: data.isCorrect ? undefined : why },
        }))
      }
    }).catch(() => undefined)
  }

  async function scoreAll() {
    const pending = questions.filter((q) => answers[q.id] && !marks[q.id])
    for (const question of pending) {
      await checkQuestion(question.id, false)
    }
  }

  function finish() {
    const correctCount = questions.filter((q) => marks[q.id]?.correct).length
    finished.current = true
    clearPracticeSnapshot(topicId)
    if (sessionId) {
      void fetch('/api/practice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          correctCount,
          completedQuestions: Object.keys(marks).length,
          timeSpentSeconds: elapsed,
        }),
      }).catch(() => undefined)
    }
    if (taskId) {
      void fetch('/api/schedule/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      }).catch(() => undefined)
    }
    router.push(`/practice/results?correct=${correctCount}&total=${questions.length}&sessionId=${sessionId ?? ''}`)
  }

  function askTutor(trigger: TutorTrigger, prompt: string) {
    if (trigger === 'hint' && focused) setHintUsed((prev) => ({ ...prev, [focused.id]: true }))
    setAiPanelOpen(true)
    setPendingTrigger({ trigger, prompt })
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" text="Printing your test sheet..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-bad" />
        <h2 className="mb-2 text-xl font-bold text-paper">Could not load the test</h2>
        <p className="mb-6 text-fog">{error}</p>
        <Button onClick={() => router.push('/practice')}>Back to Practice</Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-warn" />
        <h2 className="mb-2 text-xl font-bold text-paper">No questions found</h2>
        <p className="mb-6 text-fog">Try a different topic or section.</p>
        <Button onClick={() => router.push('/practice')}>Back to Practice</Button>
      </div>
    )
  }

  const scored = Object.keys(marks).length
  const filled = Object.values(answers).filter(Boolean).length
  const allScored = scored === questions.length
  const answerValue = focused ? answers[focused.id] ?? '' : ''
  const focusedNumber = focused ? questions.findIndex((q) => q.id === focused.id) + 1 : 1
  const timeLimit = timed ? Math.max(60, questions.length * Math.max(30, pace)) : 0

  return (
    <div className={cn('mx-auto w-full space-y-3 pb-8', desmos.open ? 'max-w-7xl' : 'max-w-6xl', aiPanelOpen && 'pr-4 md:pr-84')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fog">
          {sheetTestType} sheet · {filled}/{questions.length} filled · {scored} scored
          {focused ? ` · Q${focusedNumber}` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StudyTimer running={timerRunning} label="Studied" />
          <QuestionTimer
            mode={timed ? 'countdown' : 'countup'}
            initialSeconds={timed ? timeLimit : clockStart}
            running={timerRunning}
            onTick={setElapsed}
            onTimeUp={() => setTimerRunning(false)}
          />
        </div>
      </div>

      <PracticeTools
        chatOpen={aiPanelOpen}
        calculatorOpen={desmos.open}
        onChat={() => setAiPanelOpen(true)}
        onCalculator={() => desmos.setOpen(!desmos.open)}
        onHint={() => askTutor('hint', 'Give me a small hint only. Do not give the answer. If this is math, say what to type in Desmos.')}
      />

      <div className={cn(
        'grid gap-3',
        desmos.open
          ? 'grid-cols-1 lg:grid-cols-[minmax(0,0.7fr)_minmax(620px,1.3fr)]'
          : 'grid-cols-[minmax(0,1fr)_min(220px,34vw)]'
      )}>
        <TestBooklet
          testType={sheetTestType}
          sectionLabel={sectionFromQuestions(questions, sectionName)}
          questions={questions}
          answers={answers}
          marks={marks}
          focusedId={focusedId}
          onFocus={focusQuestion}
          onAnswer={(id, value) => {
            if (marks[id]) return
            setAnswers((prev) => ({ ...prev, [id]: value }))
            setFocusedId(id)
          }}
          onCheck={(id) => void checkQuestion(id)}
        />
        {desmos.open ? (
          <div className="sticky top-2 self-start">
            <DesmosPanel embedded />
          </div>
        ) : (
          <div className="sticky top-2 max-h-[calc(100vh-7rem)] self-start overflow-y-auto">
            <AnswerSheet
              questions={questions}
              answers={answers}
              marks={marks}
              focusedId={focusedId}
              onJump={focusQuestion}
            />
          </div>
        )}
      </div>

      {desmos.open && (
        <AnswerSheet
          questions={questions}
          answers={answers}
          marks={marks}
          focusedId={focusedId}
          onJump={focusQuestion}
        />
      )}

      {!desmos.open && <DesmosPanel embedded={false} />}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void scoreAll()} disabled={filled === 0 || scored === filled}>
          Score filled answers
        </Button>
        <Button onClick={finish} disabled={!allScored && scored === 0}>
          {allScored ? 'See results' : `End with ${scored || 0} scored`}
        </Button>
      </div>

      {focused && (
        <AiTutorPanel
          open={aiPanelOpen}
          onClose={() => setAiPanelOpen(false)}
          pendingTrigger={pendingTrigger}
          context={{
            questionId: focused.id,
            questionText: focused.question_text,
            topicId: focused.topic_id,
            topicName: focused.topic_name ?? 'General',
            sectionName: focused.section_name ?? undefined,
            selectedAnswer: answerValue || undefined,
            correctAnswer: marks[focused.id] ? focused.correct_answer : undefined,
            choices: focused.choices,
            officialExplanation: marks[focused.id] ? focused.official_explanation ?? undefined : undefined,
            questionType: focused.section_name ?? focused.topic_name ?? undefined,
            submitted: Boolean(marks[focused.id]),
            isCorrect: marks[focused.id]?.correct,
            desmosAvailable: true,
          }}
        />
      )}
    </div>
  )
}

export default function PracticeSessionPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><LoadingSpinner size="lg" text="Printing your test sheet..." /></div>}>
      <DesmosProvider enabled>
        <SessionContent />
      </DesmosProvider>
    </React.Suspense>
  )
}
