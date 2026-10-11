'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QuestionTimer } from '@/components/ui/question-timer'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { parseCalculatorConfig } from '@/lib/desmos/actions'
import { cn } from '@/lib/utils'
import { answersMatch } from '@/lib/practice/answers'
import { useItemEvents } from '@/lib/practice/use-item-events'
import type { TutorTrigger } from '@/lib/tutor/types'
import { displayedChoiceLabel, officialChoiceLabel } from '@/lib/schema'
import { isStudentProduced } from '@/lib/questions/render'
import { AlertCircle, Bookmark, Calculator, Highlighter, StickyNote, Strikethrough, Underline } from 'lucide-react'
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
import { QuestionPrompt } from './question-prompt'
import { MathDiagram } from './math-diagram'

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
  return `The correct answer is ${displayedChoiceLabel(question.choices, question.correct_answer)}.`
}

function sectionFromQuestions(questions: BookletQuestion[], fallback: string): string {
  const names = [...new Set(questions.map((q) => q.section_name).filter(Boolean))] as string[]
  if (names.length === 1) return names[0]
  if (names.length > 1) return 'Mixed'
  return fallback || 'Practice'
}

function DigitalSatQuestion({
  question,
  number,
  answer,
  sectionExpired,
  onAnswer,
  onTextAnswer,
  onBack,
  onNext,
  canBack,
  canNext,
  reviewed = false,
  onReview,
  compact = false,
  calculator = null,
}: {
  question: BookletQuestion
  number: number
  answer: string
  sectionExpired: boolean
  onAnswer: (value: string) => void
  onTextAnswer: (value: string) => void
  onBack: () => void
  onNext: () => void
  canBack: boolean
  canNext: boolean
  reviewed?: boolean
  onReview?: () => void
  compact?: boolean
  calculator?: React.ReactNode
}) {
  const spr = isStudentProduced(question.question_type, question.choices)
  const hasPassage = Boolean(question.passage_content?.trim())
  const choices = question.choices ?? []
  const [struck, setStruck] = React.useState<Set<string>>(new Set())
  function toggleStruck(choiceKey: string) {
    const id = `${question.id}:${choiceKey}`
    setStruck((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className={cn('overflow-hidden rounded-[0.35rem] border border-[#d7d7d7] bg-[#f8f8f8] shadow-sm', compact ? 'min-h-0' : 'min-h-[calc(100vh-10rem)]')}>
      <div className={cn('grid', calculator ? 'lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)_minmax(340px,0.86fr)]' : 'lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]', compact ? 'min-h-0' : 'min-h-[calc(100vh-10rem)]')}>
        <section className="border-b border-[#d7d7d7] bg-white p-6 lg:border-b-0 lg:border-r">
          <div className="mx-auto max-w-2xl">
            {hasPassage ? (
              <>
                {question.passage_title && <p className="mb-4 text-center text-sm font-bold text-[#4b4b4b]">{question.passage_title}</p>}
                <QuestionPrompt text={question.passage_content ?? ''} className="text-[15px] font-semibold leading-7 text-[#1f2937]" />
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777]">Question reference</p>
                <QuestionPrompt text={question.question_text} className="text-[15px] font-semibold leading-7 text-[#1f2937]" />
                <MathDiagram text={question.question_text} imageUrl={question.image_url} />
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#fbfbfb] p-5">
          <div className="mb-5 flex items-center justify-between border-b border-[#d7d7d7] pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center bg-black font-mono text-sm font-bold text-white">{number}</span>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#4b4b4b]">
                <input type="checkbox" className="h-3.5 w-3.5 accent-black" checked={reviewed} onChange={() => onReview?.()} />
                {reviewed ? 'Come back' : 'Mark for Review'}
              </label>
            </div>
          </div>

          {hasPassage && <QuestionPrompt text={question.question_text} className="mb-5 text-[15px] font-semibold leading-6 text-[#1f2937]" />}
          {hasPassage && <MathDiagram text={question.question_text} imageUrl={question.image_url} />}

          {spr ? (
            <div className="space-y-4">
              <input
                value={answer}
                onChange={(event) => onTextAnswer(event.target.value)}
                disabled={sectionExpired}
                inputMode="decimal"
                placeholder="Enter your answer"
                className="h-12 w-full rounded-md border border-[#9ca3af] bg-white px-4 text-base font-semibold text-[#111827] outline-none focus:border-black"
              />
              <div className="flex justify-between gap-2">
                <Button variant="secondary" onClick={onBack} disabled={!canBack}>Back</Button>
                <Button onClick={onNext} disabled={!canNext || !answer.trim()}>Next</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {choices.map(({ key, text, label: displayLabel }) => {
                const label = officialChoiceLabel(displayLabel ?? key, question.test_type ?? 'SAT', number)
                const selected = answer === key
                const blurred = struck.has(`${question.id}:${key}`)
                return (
                  <div key={key} className="flex items-start gap-2">
                    <button
                      type="button"
                      disabled={sectionExpired}
                      onClick={() => onAnswer(key)}
                      className={cn(
                        'flex min-w-0 flex-1 items-start gap-3 rounded-md border bg-white p-3 text-left text-sm font-semibold text-[#1f2937] transition',
                        selected ? 'border-black ring-2 ring-black/10' : 'border-[#b8bec8] hover:border-[#111827]',
                        blurred && 'blur-[2px] opacity-40 saturate-50',
                      )}
                    >
                      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold', selected ? 'border-black bg-black text-white' : 'border-[#8c96a3] text-[#4b5563]')}>
                        {label}
                      </span>
                      <span className="leading-5">{text}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={blurred ? 'Restore choice' : 'Cross out choice'}
                      aria-pressed={blurred}
                      onClick={() => toggleStruck(key)}
                      className={cn('mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d7d7d7] bg-white text-[#4b4b4b]', blurred && 'bg-[#111827] text-white')}
                    >
                      <Strikethrough className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
              <div className="flex justify-between gap-2 pt-2">
                <Button variant="secondary" onClick={onBack} disabled={!canBack}>Back</Button>
                {answer.trim() && canNext ? <Button variant="secondary" onClick={onNext}>Next</Button> : <span />}
              </div>
            </div>
          )}
        </section>
        {calculator ? (
          <section className="min-h-[420px] border-t border-[#d7d7d7] bg-white lg:border-l lg:border-t-0">
            {calculator}
          </section>
        ) : null}
      </div>
    </div>
  )
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
  const [tutorUsed, setTutorUsed] = React.useState<Record<string, boolean>>({})
  const [desmosUsed, setDesmosUsed] = React.useState<Record<string, boolean>>({})
  const [clockStart, setClockStart] = React.useState(0)
  const [sheetTestType, setSheetTestType] = React.useState(testType)
  const [moduleIndex, setModuleIndex] = React.useState(0)
  const [sectionExpired, setSectionExpired] = React.useState(false)
  const [markup, setMarkup] = React.useState<'highlight' | 'underline' | null>(null)
  const [notepadOpen, setNotepadOpen] = React.useState(false)
  const [examCalculatorOpen, setExamCalculatorOpen] = React.useState(false)
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [reviewIds, setReviewIds] = React.useState<Set<string>>(new Set())
  const [activeScreen, setActiveScreen] = React.useState<'test' | 'desmos'>('test')
  const [examTitle, setExamTitle] = React.useState('')
  const [examMeta, setExamMeta] = React.useState<{ readingIds: string[]; englishIds: string[]; mathIds: string[]; scienceIds?: string[]; formatVersion?: number; mathPath?: string | null; rwPath?: string | null } | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [breakUntil, setBreakUntil] = React.useState<string | null>(null)
  const [breakRemaining, setBreakRemaining] = React.useState(0)
  const breakDeadline = React.useRef(0)
  const digitalSat = examMode && examMeta?.formatVersion === 2
  const lockedExam = examMode
  const startedAt = React.useRef<Record<string, number>>({})
  const finished = React.useRef(false)
  React.useEffect(() => {
    if (!examMode || loading || !questions.length) return
    const warnOnExit = (event: BeforeUnloadEvent) => {
      if (finished.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const holdExam = () => {
      if (finished.current) return
      window.history.pushState({ examLock: true }, '', window.location.href)
    }
    const keepScreen = () => {
      if (finished.current || document.fullscreenElement) return
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
    }
    window.history.pushState({ examLock: true }, '', window.location.href)
    window.addEventListener('beforeunload', warnOnExit)
    window.addEventListener('popstate', holdExam)
    document.addEventListener('fullscreenchange', keepScreen)
    window.addEventListener('pointerdown', keepScreen)
    return () => {
      window.removeEventListener('beforeunload', warnOnExit)
      window.removeEventListener('popstate', holdExam)
      document.removeEventListener('fullscreenchange', keepScreen)
      window.removeEventListener('pointerdown', keepScreen)
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined)
    }
  }, [examMode, loading, questions.length])
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
  const itemEvents=useItemEvents(sessionId,focusedId,digitalSat && timerRunning && !sectionExpired && !breakUntil)

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
    if (screen === 'desmos' && digitalSat && currentModule?.sectionHint !== 'Math') return
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
            exam?: { id: string; title: string; testType?: string; readingIds: string[]; englishIds: string[]; mathIds: string[]; scienceIds?: string[]; formatVersion?: number; mathPath?: string | null; rwPath?: string | null }
            sessionId?: string | null
            questions?: BookletQuestion[]
            progress?: {
              answers: Record<string, string>
              marks: Record<string, BookletMark>
              focusedId: string | null
              moduleIndex: number
              moduleSecondsLeft: number | null
              breakUntil?: string | null
              serverNow?: string
              elapsed: number
              usage?: { tutorUsed?: Record<string, boolean>; desmosUsed?: Record<string, boolean> }
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
            scienceIds: data.exam?.scienceIds ?? [],
            formatVersion: data.exam?.formatVersion,
            mathPath: data.exam?.mathPath,
          }
          const built = buildExamModules(loaded, meta)
          if (meta.formatVersion === 2 && (built.length !== 4 || built.map((module) => module.questionIds.length).join(',') !== '27,27,22,22')) {
            setError('This SAT form needs 4 modules: two Reading and Writing, then two Math.')
            setLoading(false)
            return
          }
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
          setSheetTestType(data.exam?.formatVersion === 2 ? 'SAT' : data.exam?.testType ?? 'ACT')
          setAnswers(progress?.answers ?? {})
          setMarks(progress?.marks ?? {})
          setHintUsed(progress?.hintUsed ?? {})
          setTutorUsed(progress?.usage?.tutorUsed ?? {})
          setDesmosUsed(progress?.usage?.desmosUsed ?? {})
          setElapsed(progress?.elapsed ?? 0)
          setModuleIndex(restoredIndex)
          setModuleSecondsLeft(
            typeof progress?.moduleSecondsLeft === 'number'
              ? progress.moduleSecondsLeft
              : firstModule?.seconds ?? 0,
          )
          setSectionExpired(progress?.moduleSecondsLeft === 0)
          setFocusedId(firstId)
          if (firstId) startedAt.current[firstId] = Date.now()
          const remaining=progress?.breakUntil?Math.max(0,(Date.parse(progress.breakUntil)-Date.parse(progress.serverNow??new Date().toISOString()))/1000):0
          breakDeadline.current=performance.now()+remaining*1000
          setBreakRemaining(Math.ceil(remaining))
          setBreakUntil(progress?.breakUntil ?? null)
          setTimerRunning(!progress?.breakUntil)
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

  const savePayloadRef = React.useRef<Record<string, unknown>>({})
  React.useEffect(() => {
    savePayloadRef.current = { examId, answers, marks, focusedId, moduleIndex, moduleSecondsLeft, elapsed, hintUsed, usage: { tutorUsed, desmosUsed }, sessionId }
  }, [examId, answers, marks, focusedId, moduleIndex, moduleSecondsLeft, elapsed, hintUsed, tutorUsed, desmosUsed, sessionId])

  React.useEffect(() => {
    if (!examMode || !examId || loading || questions.length === 0) return
    let saving = false
    const save = async () => {
      if (saving || finished.current) return
      saving = true
      try {
        const res = await fetch('/api/practice/exams/progress', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayloadRef.current), keepalive: true,
        })
        if (res.ok) setSaveError(prev => prev.startsWith('Progress could not save') ? '' : prev)
        if (!res.ok && res.status !== 409) setSaveError('Progress could not save. Keep this page open and try again.')
      } catch {
        setSaveError('Progress could not save. Keep this page open and try again.')
      } finally { saving = false }
    }
    const interval = window.setInterval(() => void save(), 1500)
    const onHide = () => void save()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onHide)
    }
  }, [examMode, examId, loading, questions.length])

  React.useEffect(() => {
    if (loading || finished.current || questions.length === 0) return
    if (examMode && examId) return
    writePracticeSnapshot(snapshotFromState())
  }, [
    questions,
    answers,
    marks,
    focusedId,
    sessionId,
    hintUsed,
    tutorUsed,
    desmosUsed,
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
    if (!breakUntil || !examId) return
    let mounted=true,checking=false
    const tick=async()=>{
      const left=Math.max(0,Math.ceil((breakDeadline.current-performance.now())/1000))
      setBreakRemaining(left)
      if(left>0||checking)return
      checking=true
      try{
        // Confirm release with server time. Local clock changes cannot release Math.
        const response=await fetch('/api/practice/exams',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({examId}),signal:AbortSignal.timeout(5000)})
        if(!response.ok)throw Error('Break confirmation unavailable')
        const data=await response.json()
        if(!mounted)return
        const until=data.progress?.breakUntil
        const remaining=until?Math.max(0,Date.parse(until)-Date.parse(data.progress.serverNow)):0
        if(remaining>0){breakDeadline.current=performance.now()+remaining;setBreakRemaining(Math.ceil(remaining/1000))}
        else{setBreakUntil(null);setTimerRunning(true)}
      }catch{if(mounted){breakDeadline.current=performance.now()+5000;setSaveError('Checking break completion. Reconnecting to your saved exam.')}}
      finally{checking=false}
    }
    void tick()
    const id=window.setInterval(()=>{void tick()},1000)
    return ()=>{mounted=false;window.clearInterval(id)}
  }, [breakUntil,examId])

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

    if (digitalSat) return
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
    if (digitalSat) return
    const pending = moduleQuestions.filter((q) => answers[q.id] && !marks[q.id])
    for (const question of pending) {
      await checkQuestion(question.id, false)
    }
  }

  async function advanceModule() {
    if (!fullTest || !modules.length || isLastModule) return
    const nextIndex = moduleIndex + 1
    let next = modules[nextIndex]
    if (!next || submitting) return
    if (digitalSat) {
      setSubmitting(true)
      setSaveError('')
      try {
        await itemEvents.close()
        const res = await fetch('/api/practice/exams/module', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId, fromModule: moduleIndex, answers }) })
        const data = await res.json() as {
          error?: string
          questions?: BookletQuestion[]
          questionIds?: string[]
          readingIds?: string[]
          englishIds?: string[]
          mathIds?: string[]
          mathPath?: string | null
          rwPath?: string | null
          breakUntil?: string | null
          serverNow?: string
        }
        if (!res.ok) throw new Error(data.error ?? 'Could not submit module')
        const byId = new Map(questions.map((question) => [question.id, question]))
        for (const question of data.questions ?? []) byId.set(question.id, question)
        const order = data.questionIds ?? questions.map((question) => question.id)
        const updated = order.map((id) => byId.get(id)).filter((question): question is BookletQuestion => Boolean(question))
        if (updated.length !== 98) throw new Error('The next module did not load. Reload to resume.')
        const meta = {
          ...examMeta!,
          readingIds: data.readingIds ?? examMeta!.readingIds,
          englishIds: data.englishIds ?? examMeta!.englishIds,
          mathIds: data.mathIds ?? examMeta!.mathIds,
          mathPath: data.mathPath ?? examMeta!.mathPath,
          rwPath: data.rwPath ?? examMeta!.rwPath,
        }
        setQuestions(updated)
        setExamMeta(meta)
        next = buildExamModules(updated, meta)[nextIndex]
        const remaining = data.breakUntil ? Math.max(0, Date.parse(data.breakUntil) - Date.parse(data.serverNow ?? new Date().toISOString())) : 0
        breakDeadline.current=performance.now()+remaining
        setBreakRemaining(Math.ceil(remaining/1000))
        setBreakUntil(data.breakUntil ?? null)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not submit module')
        setSubmitting(false)
        return
      }
      setSubmitting(false)
    }
    setModuleIndex(nextIndex)
    setModuleSecondsLeft(next.seconds)
    setSectionExpired(false)
    setTimerRunning(!(digitalSat && nextIndex === 2))
    const nextFocus = next.questionIds[0] ?? null
    setFocusedId(nextFocus)
    if (nextFocus) startedAt.current[nextFocus] = Date.now()
    goToScreen('test')
  }

  async function finish() {
    if (submitting || (digitalSat && !isLastModule)) return
    if (digitalSat) {
      setSubmitting(true)
      setSaveError('')
      try {
        await itemEvents.close()
        const res = await fetch('/api/practice/exams/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ examId, answers, timeSpentSeconds: elapsed, sessionId, usage: { hintUsed, tutorUsed, desmosUsed } }) })
        const score = await res.json()
        if (!res.ok) throw new Error(score.error ?? 'Could not save score')
        finished.current = true
        clearPracticeSnapshot(topicId)
        if (taskId) void fetch('/api/schedule/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }) })
        router.push(`/practice/results?correct=${score.correctCount}&total=${score.total}&math=${score.mathCorrect ?? ''}&rw=${score.rwCorrect ?? ''}&path=${score.mathPath ?? ''}&m1=${score.mathModule1Correct ?? ''}&m2=${score.mathModule2Correct ?? ''}&sessionId=${sessionId ?? ''}`)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save score')
        setSubmitting(false)
      }
      return
    }
    if (examMode && examId) {
      setSubmitting(true)
      setSaveError('')
      try {
        const res = await fetch('/api/practice/exams/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId,
            answers,
            timeSpentSeconds: elapsed,
            sessionId,
          }),
        })
        const score = await res.json() as {
          error?: string
          correctCount?: number
          total?: number
          englishCorrect?: number
          mathCorrect?: number
          readingCorrect?: number
          scienceCorrect?: number
        }
        if (!res.ok) throw new Error(score.error ?? 'Could not save score')
        finished.current = true
        clearPracticeSnapshot(topicId)
        const sectionParams = new URLSearchParams({
          eng: String(score.englishCorrect ?? ''),
          math: String(score.mathCorrect ?? ''),
          read: String(score.readingCorrect ?? ''),
          sci: String(score.scienceCorrect ?? ''),
        }).toString()
        router.push(`/practice/results?correct=${score.correctCount ?? 0}&total=${score.total ?? questions.length}&sessionId=${sessionId ?? ''}${digitalSat ? '' : `&${sectionParams}`}`)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Could not save score')
        setSubmitting(false)
      }
      return
    }

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
    if (fromOnboarding) {
      void fetch('/api/onboarding/diagnostic-done', { method: 'POST' }).catch(() => undefined)
      router.push('/onboarding?phase=tutor')
      return
    }
    router.push(`/practice/results?correct=${correctCount}&total=${questions.length}&sessionId=${sessionId ?? ''}`)
  }

  function askTutor(trigger: TutorTrigger, prompt: string) {
    if (digitalSat) return
    if (focused) setTutorUsed(prev => ({ ...prev, [focused.id]: true }))
    if (trigger === 'hint' && focused) setHintUsed((prev) => ({ ...prev, [focused.id]: true }))
    setAiPanelOpen(true)
    setPendingTrigger({ trigger, prompt })
  }

  React.useEffect(() => {
    if (examCalculatorOpen && !desmos.open) setExamCalculatorOpen(false)
  }, [examCalculatorOpen, desmos.open])

  function onCalculatorToggle() {
    if (focused) setDesmosUsed(prev => ({ ...prev, [focused.id]: true }))
    if (fullTest) {
      setExamCalculatorOpen((open) => {
        const next = !open
        desmos.setOpen(next)
        if (next) window.setTimeout(() => desmos.resize(), 160)
        return next
      })
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

  const advanceModuleRef = React.useRef(advanceModule)
  const finishRef = React.useRef(finish)
  advanceModuleRef.current = advanceModule
  finishRef.current = finish
  const moduleGate = React.useRef(false)
  React.useEffect(() => {
    if (!sectionExpired) moduleGate.current = false
  }, [sectionExpired])
  React.useEffect(() => {
    if (!fullTest || !sectionExpired || loading) return
    if (moduleGate.current) return
    moduleGate.current = true
    if (isLastModule) void finishRef.current()
    else void advanceModuleRef.current()
  }, [fullTest, sectionExpired, isLastModule, loading])

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

  if (digitalSat && breakUntil) {
    return <div className="mx-auto max-w-xl space-y-5 py-12 text-center">
      <h1 className="text-2xl font-bold text-paper">Scheduled SAT break</h1>
      <p className="text-fog">Reading &amp; Writing is complete. Math begins after this 10-minute break.</p>
      <p className="font-mono text-4xl text-paper" role="timer" aria-label="Break time remaining">{Math.floor(breakRemaining/60)}:{String(breakRemaining%60).padStart(2,'0')}</p>
      <p className="text-sm text-fog">Your answers are saved. You can reload this page to resume the break.</p>
    </div>
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
  const satNumberOffset = digitalSat ? ([0, 27, 54, 76][moduleIndex] ?? 0) : 0
  const focusedIndexInModule = focused ? moduleQuestions.findIndex((q) => q.id === focused.id) : -1
  const focusedNumber = focused
    ? focusedIndexInModule + 1 + satNumberOffset
    : 1
  const timeLimit = timed && !fullTest ? Math.max(60, questions.length * Math.max(30, pace)) : 0
  const sectionLabel = currentModule?.label
    ?? sectionFromQuestions(moduleQuestions, sectionName)

  function moveDigitalSat(delta: number) {
    if (!focused || focusedIndexInModule < 0) return
    const next = moduleQuestions[focusedIndexInModule + delta]
    if (!next) return
    setFocusedId(next.id)
    if (!startedAt.current[next.id]) startedAt.current[next.id] = Date.now()
    if (activeScreen !== 'test') goToScreen('test')
  }

  function answerDigitalSat(id: string, value: string) {
    if (sectionExpired) return
    itemEvents.answer(id, value, answers[id])
    setAnswers((prev) => ({ ...prev, [id]: value }))
    setFocusedId(id)
    const index = moduleQuestions.findIndex((question) => question.id === id)
    const next = moduleQuestions[index + 1]
    if (next) {
      window.setTimeout(() => {
        setFocusedId(next.id)
        if (!startedAt.current[next.id]) startedAt.current[next.id] = Date.now()
      }, 180)
    }
  }

  function onQuestionMouseUp() {
    if (!markup) {
      highlight.onMouseUp()
      return
    }
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const node = markup === 'highlight' ? document.createElement('mark') : document.createElement('span')
    node.className = markup === 'highlight' ? 'rounded-sm bg-[#fff3a0] px-0.5' : 'underline decoration-2 decoration-[#1cb0f6]'
    try {
      range.surroundContents(node)
    } catch {
      const contents = range.extractContents()
      node.appendChild(contents)
      range.insertNode(node)
    }
    selection.removeAllRanges()
  }

  const bookletBlock = (
    <div className="relative min-w-0">
      <TestBooklet
        testType={sheetTestType}
        sectionLabel={sectionLabel}
        questions={moduleQuestions}
        answers={answers}
        marks={lockedExam ? {} : marks}
        allowCheck={!lockedExam}
        numberOffset={satNumberOffset}
        focusedId={focusedId}
        reviewIds={reviewIds}
        onFocus={focusQuestion}
        onAnswer={(id, value) => {
          if (marks[id] || sectionExpired) return
          itemEvents.answer(id,value,answers[id])
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
      marks={lockedExam ? {} : marks}
      numberOffset={satNumberOffset}
      focusedId={focusedId}
      onJump={focusQuestion}
    />
  )

  const digitalSatBlock = focused ? (
    <div
      ref={bookletRef}
      onMouseUp={onQuestionMouseUp}
      className="relative"
    >
      <DigitalSatQuestion
        question={focused}
        number={focusedNumber}
        answer={answers[focused.id] ?? ''}
        sectionExpired={sectionExpired}
        onAnswer={(value) => answerDigitalSat(focused.id, value)}
        onTextAnswer={(value) => {
          if (sectionExpired) return
          itemEvents.answer(focused.id, value, answers[focused.id])
          setAnswers((prev) => ({ ...prev, [focused.id]: value }))
        }}
        onBack={() => moveDigitalSat(-1)}
        onNext={() => moveDigitalSat(1)}
        canBack={focusedIndexInModule > 0}
        canNext={focusedIndexInModule >= 0 && focusedIndexInModule < moduleQuestions.length - 1}
        calculator={examCalculatorOpen ? <div className="h-full min-h-[420px]"><DesmosPanel embedded /></div> : null}
        reviewed={reviewIds.has(focused.id)}
        onReview={() => setReviewIds((previous) => {
          const next = new Set(previous)
          if (next.has(focused.id)) next.delete(focused.id)
          else next.add(focused.id)
          return next
        })}
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
  ) : null

  return (
    <div className={cn(
      'mx-auto w-full space-y-3',
      fullTest ? 'pb-20' : 'pb-8',
      fullTest ? 'max-w-none' : desmos.open ? 'max-w-7xl' : 'max-w-6xl',
      aiPanelOpen && 'pr-4 md:pr-84',
    )}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <p className="font-display text-xl text-[#3c3c3c]">Test {sheetTestType === 'ACT' ? 'ACT' : 'SAT'}</p>
        <p className="text-center font-display text-xl text-[#3c3c3c]">
          {Math.max(1, focusedIndexInModule + 1)} / {moduleQuestions.length}
        </p>
        <div className="flex justify-end">
          {fullTest && currentModule ? (
            <QuestionTimer
              key={`module-timer-${currentModule.id}-${moduleIndex}`}
              mode="countdown"
              initialSeconds={sectionExpired ? 0 : moduleSecondsLeft > 0 ? moduleSecondsLeft : currentModule.seconds}
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
      {saveError && <p role="alert" className="text-sm text-bad">{saveError}</p>}

      {fullTest ? (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 border-t border-[#e5e5e5] bg-white px-3 py-2">
          {[
            { id: 'calculator', label: 'Calculator', icon: Calculator, on: examCalculatorOpen, press: onCalculatorToggle },
            { id: 'notepad', label: 'Notepad', icon: StickyNote, on: notepadOpen, press: () => setNotepadOpen((open) => !open) },
            { id: 'highlighter', label: 'Highlighter', icon: Highlighter, on: markup === 'highlight', press: () => setMarkup((current) => current === 'highlight' ? null : 'highlight') },
            { id: 'underline', label: 'Underline', icon: Underline, on: markup === 'underline', press: () => setMarkup((current) => current === 'underline' ? null : 'underline') },
            { id: 'review', label: 'Review', icon: Bookmark, on: Boolean(focused && reviewIds.has(focused.id)), press: () => {
              if (!focused) return
              setReviewIds((previous) => {
                const next = new Set(previous)
                if (next.has(focused.id)) next.delete(focused.id)
                else next.add(focused.id)
                return next
              })
            } },
          ].map((tool) => {
            const Icon = tool.icon
            return (
              <button
                key={tool.id}
                type="button"
                aria-pressed={tool.on}
                onClick={tool.press}
                className={cn('flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-extrabold', tool.on ? 'bg-[#1cb0f6] text-white' : 'bg-[#f7f7f7] text-[#3c3c3c]')}
              >
                <Icon className="h-4 w-4" />
                {tool.label}
              </button>
            )
          })}
        </div>
      ) : (
        <PracticeTools
          assistance={!digitalSat}
          calculator={!digitalSat || currentModule?.sectionHint === 'Math'}
          chatOpen={aiPanelOpen}
          calculatorOpen={desmos.open}
          onChat={() => setAiPanelOpen(true)}
          onCalculator={onCalculatorToggle}
          onHint={() => askTutor('hint', 'Give me a small hint only. Do not give the answer. If this is math, say what to type in Desmos.')}
        />
      )}

      {fullTest && digitalSat ? (
        <div className="px-0.5">
          {digitalSatBlock}
        </div>
      ) : fullTest ? (
        <div
          ref={bookletRef}
          onMouseUp={onQuestionMouseUp}
          className={cn('relative grid gap-3 px-0.5', examCalculatorOpen ? 'grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)_min(180px,22vw)]' : 'grid-cols-[minmax(0,1fr)_min(220px,34vw)]')}
        >
          {bookletBlock}
          {examCalculatorOpen ? (
            <div className="sticky top-2 h-[min(70vh,640px)] self-start overflow-hidden rounded-2xl border border-[#d7d7d7] bg-white">
              <DesmosPanel embedded />
            </div>
          ) : null}
          <div className="sticky top-2 max-h-[calc(100vh-7rem)] self-start overflow-y-auto">
            {answerSheet}
          </div>
        </div>
      ) : (
        <div
          ref={bookletRef}
          onMouseUp={onQuestionMouseUp}
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

      {fullTest && notepadOpen && focused ? (
        <label className="block rounded-2xl border border-[#e5e5e5] bg-[#fffdf8] p-3">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#777]">Notes for question {Math.max(1, focusedIndexInModule + 1)}</span>
          <textarea
            value={notes[focused.id] ?? ''}
            onChange={(event) => setNotes((previous) => ({ ...previous, [focused.id]: event.target.value }))}
            rows={3}
            placeholder="Write notes for this question"
            className="mt-2 w-full resize-none rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm font-semibold text-[#3c3c3c] outline-none focus:border-[#1cb0f6]"
          />
        </label>
      ) : null}

      {!fullTest && desmos.open && answerSheet}
      {!fullTest && !desmos.open && <DesmosPanel embedded={false} />}

      {!fullTest && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void scoreAll()} disabled={filledModule === 0 || scoredModule === filledModule}>
            Score filled answers
          </Button>
          <Button onClick={() => void finish()} disabled={submitting || (!allScored && scored === 0)}>
            {submitting ? 'Saving…' : allScored ? 'See results' : `End with ${scored || 0} scored`}
          </Button>
        </div>
      )}
      {fullTest && isLastModule && sectionExpired && (
        <div className="flex justify-end">
          <Button onClick={() => void finish()} disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit exam'}
          </Button>
        </div>
      )}

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
