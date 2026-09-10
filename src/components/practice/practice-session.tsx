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
import { AlertCircle, ChevronRight } from 'lucide-react'
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
import { HighlightNoteChrome, useHighlightNotes } from '@/components/practice/highlight-notes'
import {
  buildExamModules,
  buildPracticeModules,
  questionsForModule,
  type PracticeModule,
} from '@/lib/practice/modules'

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
  const modeParam = searchParams.get('mode')
  const examId = searchParams.get('examId') ?? ''
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const examMode = Boolean(examId) || modeParam === 'exam'
  const fullTest =
    examMode || modeParam === 'full' || (!topicId && count >= 20 && !fromOnboarding)

  const [questions, setQuestions] = React.useState<BookletQuestion[]>([])
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [marks, setMarks] = React.useState<Record<string, BookletMark>>({})
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [elapsed, setElapsed] = React.useState(0)
  const [moduleSecondsLeft, setModuleSecondsLeft] = React.useState(0)
  const [timerRunning, setTimerRunning] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false)
  const [pendingTrigger, setPendingTrigger] = React.useState<{ trigger: TutorTrigger; prompt: string } | null>(null)
  const [hintUsed, setHintUsed] = React.useState<Record<string, boolean>>({})
  const [clockStart, setClockStart] = React.useState(0)
  const [sheetTestType, setSheetTestType] = React.useState(testType)
  const [moduleIndex, setModuleIndex] = React.useState(0)
  const [sectionExpired, setSectionExpired] = React.useState(false)
  const [activeScreen, setActiveScreen] = React.useState<'test' | 'desmos'>('test')
  const [examTitle, setExamTitle] = React.useState('')
  const [examMeta, setExamMeta] = React.useState<{ readingIds: string[]; englishIds: string[]; mathIds: string[] } | null>(null)
  const startedAt = React.useRef<Record<string, number>>({})
  const finished = React.useRef(false)
  const bookletRef = React.useRef<HTMLDivElement>(null)
  const screenTrackRef = React.useRef<HTMLDivElement>(null)
  const highlight = useHighlightNotes(bookletRef)

  const modules = React.useMemo(
    () => {
      if (!fullTest) return []
      if (examMode) return buildExamModules(questions, examMeta ?? undefined)
      return buildPracticeModules(sheetTestType || testType, questions)
    },
    [fullTest, examMode, questions, examMeta, sheetTestType, testType],
  )
  const currentModule: PracticeModule | null = fullTest ? modules[moduleIndex] ?? null : null
  const moduleQuestions = React.useMemo(
    () => (fullTest ? questionsForModule(questions, currentModule) : questions),
    [fullTest, questions, currentModule],
  )
  const isLastModule = fullTest && modules.length > 0 && moduleIndex >= modules.length - 1

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
      moduleIndex,
      moduleSecondsLeft: fullTest ? moduleSecondsLeft : undefined,
      updatedAt: Date.now(),
      ...overrides,
    }
  }

  function goToScreen(screen: 'test' | 'desmos') {
    setActiveScreen(screen)
    const track = screenTrackRef.current
    if (!track) return
    const width = track.clientWidth
    track.scrollTo({ left: screen === 'desmos' ? width : 0, behavior: 'smooth' })
    if (screen === 'desmos') {
      desmos.setOpen(true)
      window.setTimeout(() => desmos.resize(), 320)
    }
  }

  React.useEffect(() => {
    // Old /practice?mode=full links must never open the daily-limit session path.
    if (!examId && !topicId && (modeParam === 'full' || (!fromOnboarding && count >= 20))) {
      router.replace('/practice')
    }
  }, [examId, topicId, modeParam, fromOnboarding, count, router])

  React.useEffect(() => {
    let cancelled = false
    async function loadQuestions() {
      if (!examId && !topicId && (modeParam === 'full' || (!fromOnboarding && count >= 20))) {
        return
      }

      if (examMode && examId) {
        try {
          const res = await fetch('/api/practice/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ examId }),
          })
          const data = await res.json() as {
            exam?: { id: string; title: string; readingIds: string[]; englishIds: string[]; mathIds: string[] }
            sessionId?: string | null
            questions?: BookletQuestion[]
            progress?: {
              answers: Record<string, string>
              marks: Record<string, BookletMark>
              focusedId: string | null
              moduleIndex: number
              moduleSecondsLeft: number | null
              elapsed: number
              hintUsed: Record<string, boolean>
            } | null
            error?: string
            paywall?: boolean
            completed?: boolean
          }
          if (cancelled) return
          if (data.paywall) {
            router.replace('/pricing')
            return
          }
          if (data.completed) {
            setError('This exam is already completed. Only the score is kept.')
            setLoading(false)
            return
          }
          if (!res.ok || data.error) {
            setError(data.error ?? 'Failed to load exam')
            setLoading(false)
            return
          }

          const loaded = data.questions ?? []
          const meta = {
            readingIds: data.exam?.readingIds ?? [],
            englishIds: data.exam?.englishIds ?? [],
            mathIds: data.exam?.mathIds ?? [],
          }
          const built = buildExamModules(loaded, meta)
          const progress = data.progress
          const restoredIndex = Math.min(
            Math.max(0, progress?.moduleIndex ?? 0),
            Math.max(0, built.length - 1),
          )
          const firstModule = built[restoredIndex] ?? built[0] ?? null
          const firstId = progress?.focusedId ?? firstModule?.questionIds[0] ?? loaded[0]?.id ?? null

          setExamTitle(data.exam?.title ?? 'Practice Exam')
          setExamMeta(meta)
          setQuestions(loaded)
          setSessionId(data.sessionId ?? null)
          setSheetTestType('Exam')
          setAnswers(progress?.answers ?? {})
          setMarks(progress?.marks ?? {})
          setHintUsed(progress?.hintUsed ?? {})
          setElapsed(progress?.elapsed ?? 0)
          setModuleIndex(restoredIndex)
          setModuleSecondsLeft(
            typeof progress?.moduleSecondsLeft === 'number'
              ? progress.moduleSecondsLeft
              : firstModule?.seconds ?? 0,
          )
          setSectionExpired(false)
          setFocusedId(firstId)
          if (firstId) startedAt.current[firstId] = Date.now()
          setTimerRunning(true)
          setLoading(false)
          return
        } catch {
          if (!cancelled) {
            setError('Failed to load exam. Please try again.')
            setLoading(false)
          }
          return
        }
      }

      const saved = !examMode && topicId ? readPracticeSnapshot(topicId) : null
      // Never restore the old main full-test localStorage sheet (it triggers the daily-limit path).
      if (!topicId) clearPracticeSnapshot('')
      if (saved && !examMode) {
        setQuestions(saved.questions)
        setAnswers(saved.answers)
        setMarks(saved.marks)
        setFocusedId(saved.focusedId ?? saved.questions[0]?.id ?? null)
        setSessionId(saved.sessionId)
        setHintUsed(saved.hintUsed)
        setElapsed(saved.elapsed)
        setClockStart(saved.elapsed)
        setSheetTestType(saved.testType || testType)
        const restoredModules =
          (modeParam === 'full' || (!saved.topicId && saved.count >= 20))
            ? buildPracticeModules(saved.testType || testType, saved.questions)
            : []
        const restoredIndex = Math.min(
          Math.max(0, saved.moduleIndex ?? 0),
          Math.max(0, restoredModules.length - 1),
        )
        setModuleIndex(restoredIndex)
        const restoredModule = restoredModules[restoredIndex]
        setModuleSecondsLeft(
          typeof saved.moduleSecondsLeft === 'number'
            ? saved.moduleSecondsLeft
            : restoredModule?.seconds ?? 0,
        )
        setSectionExpired(false)
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
        const data = await res.json() as {
          questions?: BookletQuestion[]
          sessionId?: string
          error?: string
          paywall?: boolean
        }
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
        const firstId = loaded[0]?.id ?? null
        setQuestions(loaded)
        setSessionId(data.sessionId ?? null)
        setSheetTestType(testType)
        setModuleIndex(0)
        setSectionExpired(false)
        setFocusedId(firstId)
        if (firstId) startedAt.current[firstId] = Date.now()
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
          focusedId: firstId,
          elapsed: 0,
          hintUsed: {},
          moduleIndex: 0,
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
  }, [testType, topicId, difficulty, count, categoryName, sectionName, timed, pace, taskId, router, fullTest, modeParam, examMode, examId])

  React.useEffect(() => {
    if (loading || finished.current || questions.length === 0) return
    if (examMode && examId) {
      const handle = window.setTimeout(() => {
        void fetch('/api/practice/exams/progress', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            answers,
            marks,
            focusedId,
            moduleIndex,
            moduleSecondsLeft,
            elapsed,
            hintUsed,
            sessionId,
          }),
        }).catch(() => undefined)
      }, 700)
      return () => window.clearTimeout(handle)
    }
    writePracticeSnapshot(snapshotFromState())
  }, [
    questions,
    answers,
    marks,
    focusedId,
    sessionId,
    hintUsed,
    loading,
    topicId,
    taskId,
    testType,
    difficulty,
    count,
    categoryName,
    sectionName,
    timed,
    pace,
    moduleIndex,
    moduleSecondsLeft,
    elapsed,
    examMode,
    examId,
  ])

  React.useEffect(() => {
    if (!fullTest || !timerRunning || sectionExpired) return
    const id = window.setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [fullTest, timerRunning, sectionExpired])

  React.useEffect(() => {
    if (!fullTest) return
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === '2') {
        event.preventDefault()
        goToScreen('desmos')
      }
      if (event.key === '1') {
        event.preventDefault()
        goToScreen('test')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullTest, desmos])

  const focused = moduleQuestions.find((q) => q.id === focusedId) ?? moduleQuestions[0] ?? questions[0]
  const calculatorConfig = parseCalculatorConfig(focused?.calculator_config)

  React.useEffect(() => {
    if (!focused) return
    desmos.applyQuestion(focused.id, calculatorConfig)
  }, [focused?.id])

  function focusQuestion(id: string) {
    setFocusedId(id)
    if (!startedAt.current[id]) startedAt.current[id] = Date.now()
    if (activeScreen !== 'test') goToScreen('test')
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
        desmosUsed: desmos.open || activeScreen === 'desmos',
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
    const pending = moduleQuestions.filter((q) => answers[q.id] && !marks[q.id])
    for (const question of pending) {
      await checkQuestion(question.id, false)
    }
  }

  function advanceModule() {
    if (!fullTest || !modules.length || isLastModule) return
    const nextIndex = moduleIndex + 1
    const next = modules[nextIndex]
    if (!next) return
    setModuleIndex(nextIndex)
    setModuleSecondsLeft(next.seconds)
    setSectionExpired(false)
    setTimerRunning(true)
    const nextFocus = next.questionIds[0] ?? null
    setFocusedId(nextFocus)
    if (nextFocus) startedAt.current[nextFocus] = Date.now()
    goToScreen('test')
  }

  function finish() {
    const correctCount = questions.filter((q) => marks[q.id]?.correct).length
    finished.current = true
    clearPracticeSnapshot(topicId)

    if (examMode && examId) {
      void fetch('/api/practice/exams/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          correctCount,
          completedQuestions: Object.keys(marks).length,
          timeSpentSeconds: elapsed,
          sessionId,
        }),
      }).catch(() => undefined)
    } else if (sessionId) {
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
    if (fromOnboarding) {
      void fetch('/api/onboarding/diagnostic-done', { method: 'POST' }).catch(() => undefined)
      router.push('/onboarding?phase=tutor')
      return
    }
    router.push(`/practice/results?correct=${correctCount}&total=${questions.length}&sessionId=${sessionId ?? ''}`)
  }

  function askTutor(trigger: TutorTrigger, prompt: string) {
    if (trigger === 'hint' && focused) setHintUsed((prev) => ({ ...prev, [focused.id]: true }))
    setAiPanelOpen(true)
    setPendingTrigger({ trigger, prompt })
  }

  function onCalculatorToggle() {
    if (fullTest) {
      if (activeScreen === 'desmos') goToScreen('test')
      else goToScreen('desmos')
      return
    }
    desmos.setOpen(!desmos.open)
  }

  function onScreenScroll() {
    const track = screenTrackRef.current
    if (!track) return
    const next = track.scrollLeft > track.clientWidth * 0.45 ? 'desmos' : 'test'
    setActiveScreen(next)
    if (next === 'desmos') {
      desmos.setOpen(true)
      desmos.resize()
    }
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
        <Button onClick={() => router.push(fromOnboarding ? '/onboarding?phase=practice' : '/practice')}>
          {fromOnboarding ? 'Back to setup' : 'Back to Practice'}
        </Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-warn" />
        <h2 className="mb-2 text-xl font-bold text-paper">No questions found</h2>
        <p className="mb-6 text-fog">Try a different topic or section.</p>
        <Button onClick={() => router.push(fromOnboarding ? '/onboarding?phase=practice' : '/practice')}>
          {fromOnboarding ? 'Back to setup' : 'Back to Practice'}
        </Button>
      </div>
    )
  }

  const scored = Object.keys(marks).length
  const filledModule = moduleQuestions.filter((q) => answers[q.id]).length
  const scoredModule = moduleQuestions.filter((q) => marks[q.id]).length
  const allScored = scored === questions.length
  const answerValue = focused ? answers[focused.id] ?? '' : ''
  const focusedNumber = focused
    ? moduleQuestions.findIndex((q) => q.id === focused.id) + 1
    : 1
  const timeLimit = timed && !fullTest ? Math.max(60, questions.length * Math.max(30, pace)) : 0
  const sectionLabel = currentModule?.label
    ?? sectionFromQuestions(moduleQuestions, sectionName)

  const bookletBlock = (
    <div className="relative min-w-0">
      <TestBooklet
        testType={sheetTestType}
        sectionLabel={sectionLabel}
        questions={moduleQuestions}
        answers={answers}
        marks={marks}
        focusedId={focusedId}
        onFocus={focusQuestion}
        onAnswer={(id, value) => {
          if (marks[id] || sectionExpired) return
          setAnswers((prev) => ({ ...prev, [id]: value }))
          setFocusedId(id)
        }}
        onCheck={(id) => void checkQuestion(id)}
      />
      <HighlightNoteChrome
        pending={highlight.pending}
        draft={highlight.draft}
        setDraft={highlight.setDraft}
        onHighlight={highlight.highlightOnly}
        onSave={highlight.saveNote}
        onClose={highlight.clearPending}
        notes={highlight.notes}
      />
    </div>
  )

  const answerSheet = (
    <AnswerSheet
      questions={moduleQuestions}
      answers={answers}
      marks={marks}
      focusedId={focusedId}
      onJump={focusQuestion}
    />
  )

  return (
    <div className={cn(
      'mx-auto w-full space-y-3 pb-8',
      fullTest ? 'max-w-none' : desmos.open ? 'max-w-7xl' : 'max-w-6xl',
      aiPanelOpen && 'pr-4 md:pr-84',
    )}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-fog">
            {examMode ? (examTitle || 'Practice exam') : `${sheetTestType} ${fullTest ? 'practice test' : 'sheet'}`}
            {fullTest && currentModule ? ` · ${currentModule.label}` : ''}
            {' · '}
            {filledModule}/{moduleQuestions.length} filled · {scoredModule} scored
            {focused ? ` · Q${focusedNumber}` : ''}
          </p>
          {fullTest && modules.length > 1 && (
            <p className="mt-0.5 text-xs text-fog">
              Module {moduleIndex + 1} of {modules.length}
              {' · '}
              Scroll right or ⌘/Ctrl+2 for Desmos · ⌘/Ctrl+1 returns
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StudyTimer running={timerRunning && !sectionExpired} label="Studied" />
          {fullTest && currentModule ? (
            <QuestionTimer
              key={`module-timer-${currentModule.id}-${moduleIndex}`}
              mode="countdown"
              initialSeconds={moduleSecondsLeft > 0 ? moduleSecondsLeft : currentModule.seconds}
              running={timerRunning && !sectionExpired}
              onTick={setModuleSecondsLeft}
              onTimeUp={() => {
                setSectionExpired(true)
                setTimerRunning(false)
                setModuleSecondsLeft(0)
              }}
            />
          ) : (
            <QuestionTimer
              mode={timed ? 'countdown' : 'countup'}
              initialSeconds={timed ? timeLimit : clockStart}
              running={timerRunning}
              onTick={setElapsed}
              onTimeUp={() => setTimerRunning(false)}
            />
          )}
        </div>
      </div>

      {fullTest && sectionExpired && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[#fff4ef] px-4 py-3">
          <p className="text-sm text-paper">
            Time is up for {currentModule?.label ?? 'this section'}.
            {isLastModule ? ' Score what you can, then end the test.' : ' Continue to the next module when ready.'}
          </p>
          {!isLastModule && (
            <Button onClick={advanceModule}>
              Next module
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <PracticeTools
        chatOpen={aiPanelOpen}
        calculatorOpen={fullTest ? activeScreen === 'desmos' : desmos.open}
        onChat={() => setAiPanelOpen(true)}
        onCalculator={onCalculatorToggle}
        onHint={() => askTutor('hint', 'Give me a small hint only. Do not give the answer. If this is math, say what to type in Desmos.')}
      />

      {fullTest ? (
        <div
          ref={screenTrackRef}
          onScroll={onScreenScroll}
          className="flex w-full snap-x snap-mandatory gap-0 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <section className="w-full min-w-full shrink-0 snap-start snap-always px-0.5">
            <div
              ref={bookletRef}
              onMouseUp={highlight.onMouseUp}
              className="relative grid grid-cols-[minmax(0,1fr)_min(220px,34vw)] gap-3"
            >
              {bookletBlock}
              <div className="sticky top-2 max-h-[calc(100vh-7rem)] self-start overflow-y-auto">
                {answerSheet}
              </div>
            </div>
          </section>
          <section className="w-full min-w-full shrink-0 snap-start snap-always px-0.5">
            <DesmosPanel screen onBack={() => goToScreen('test')} />
          </section>
        </div>
      ) : (
        <div
          ref={bookletRef}
          onMouseUp={highlight.onMouseUp}
          className={cn(
            'relative grid gap-3',
            desmos.open
              ? 'grid-cols-1 lg:grid-cols-[minmax(0,0.7fr)_minmax(620px,1.3fr)]'
              : 'grid-cols-[minmax(0,1fr)_min(220px,34vw)]',
          )}
        >
          {bookletBlock}
          {desmos.open ? (
            <div className="sticky top-2 self-start">
              <DesmosPanel embedded />
            </div>
          ) : (
            <div className="sticky top-2 max-h-[calc(100vh-7rem)] self-start overflow-y-auto">
              {answerSheet}
            </div>
          )}
        </div>
      )}

      {!fullTest && desmos.open && answerSheet}
      {!fullTest && !desmos.open && <DesmosPanel embedded={false} />}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void scoreAll()} disabled={filledModule === 0 || scoredModule === filledModule}>
          Score filled answers
        </Button>
        {fullTest && !isLastModule && (
          <Button variant="secondary" onClick={advanceModule}>
            Next module
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
        <Button onClick={finish} disabled={!allScored && scored === 0 && !sectionExpired}>
          {allScored || (fullTest && isLastModule) ? 'See results' : `End with ${scored || 0} scored`}
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

export function PracticeSessionPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[400px] items-center justify-center"><LoadingSpinner size="lg" text="Printing your test sheet..." /></div>}>
      <DesmosProvider enabled>
        <SessionContent />
      </DesmosProvider>
    </React.Suspense>
  )
}

export default PracticeSessionPage
