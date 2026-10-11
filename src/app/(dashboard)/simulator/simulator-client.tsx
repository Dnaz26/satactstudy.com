'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Lightbulb, Loader2 } from 'lucide-react'
import { QuestionTimer } from '@/components/ui/question-timer'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { PracticeTools } from '@/components/practice/practice-tools'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { MathDiagram } from '@/components/practice/math-diagram'
import { cn } from '@/lib/utils'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { isStudentProduced } from '@/lib/questions/render'
import type { TutorTrigger } from '@/lib/tutor/types'
import type { BookletQuestion } from '@/components/practice/test-booklet'
import { displayedChoiceLabel, officialChoiceLabel, type ExamFocus } from '@/lib/schema'
import { PreviewSignup } from '@/components/preview-signup'

function rapidFireSeconds(question: BookletQuestion): number {
  const section = (question.section_name ?? '').toLowerCase()
  if (section.includes('math')) return 25
  if (question.passage_content?.trim()) return 60
  return 45
}

function answersMatch(selected: string, correct: string): boolean {
  const a = selected.trim().toLowerCase()
  const b = correct.trim().toLowerCase()
  if (a === b) return true
  const na = Number(a.replace(/,/g, ''))
  const nb = Number(b.replace(/,/g, ''))
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb
}

function SimulatorInner({ examFocus, initialQuestions = [] }: { examFocus: ExamFocus; initialQuestions?: BookletQuestion[] }) {
  const [testType, setTestType] = React.useState<'SAT' | 'ACT' | null>(examFocus === 'both' ? null : examFocus)
  const router = useRouter()
  const desmos = useDesmos()
  const [queue, setQueue] = React.useState<BookletQuestion[]>([])
  const [current, setCurrent] = React.useState<BookletQuestion | null>(null)
  const [choice, setChoice] = React.useState('')
  const [mark, setMark] = React.useState<{ correct: boolean } | null>(null)
  const [loading, setLoading] = React.useState(examFocus !== 'both' && initialQuestions.length === 0)
  const [error, setError] = React.useState('')
  const [tick, setTick] = React.useState(0)
  const [aiOpen, setAiOpen] = React.useState(false)
  const [pending, setPending] = React.useState<{ trigger: TutorTrigger; prompt: string } | null>(null)
  const [round, setRound] = React.useState(1)
  const [hits, setHits] = React.useState(0)
  const [streak, setStreak] = React.useState(0)
  const [refillError, setRefillError] = React.useState('')
  const [previewSignup, setPreviewSignup] = React.useState(false)
  const [held, setHeld] = React.useState(false)
  const [railInput, setRailInput] = React.useState('')
  const [railMessages, setRailMessages] = React.useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [boardSteps, setBoardSteps] = React.useState<Array<{ mark: string; title: string; expression: string; focus: string; note: string }>>([])
  const [boardAnswer, setBoardAnswer] = React.useState('')
  const [boardShown, setBoardShown] = React.useState(0)
  const [boardBusy, setBoardBusy] = React.useState(false)
  const sampleOnly = initialQuestions.length > 0
  const started = React.useRef(0)
  const advanceTimer = React.useRef<number | null>(null)

  const fill = React.useCallback(async () => {
    if (!testType) return []
    const res = await fetch(`/api/practice/questions?count=12&difficulty=mixed&mode=rapid&testType=${testType}`)
    const data = await res.json() as { questions?: BookletQuestion[]; error?: string; paywall?: boolean }
    if (data.paywall) {
      setError('Unlock to keep going.')
      return []
    }
    if (!res.ok || data.error) {
      setError(data.error ?? 'Could not load questions')
      return []
    }
    const items = data.questions ?? []
    if (!items.length) {
      setError('No questions available right now.')
      return []
    }
    setError('')
    return items
  }, [testType])

  const loadInitial = React.useCallback(async (cancelledRef: { cancelled: boolean }) => {
    setLoading(true)
    setError('')
    const items = await fill()
    if (cancelledRef.cancelled) return
    setQueue(items.slice(1))
    setCurrent(items[0] ?? null)
    setLoading(false)
    started.current = Date.now()
  }, [fill])

  React.useEffect(() => {
    setHeld(false)
    setBoardSteps([])
    setBoardAnswer('')
    setBoardShown(0)
    setRailMessages([])
  }, [current?.id])

  React.useEffect(() => {
    if (!held || boardBusy || boardShown >= boardSteps.length) return
    const timer = window.setTimeout(() => setBoardShown((count) => count + 1), 900)
    return () => window.clearTimeout(timer)
  }, [held, boardBusy, boardShown, boardSteps.length])

  React.useEffect(() => {
    if (!held || boardBusy || boardSteps.length === 0 || boardShown < boardSteps.length) return
    const timer = window.setTimeout(() => setHeld(false), 1400)
    return () => window.clearTimeout(timer)
  }, [held, boardBusy, boardShown, boardSteps.length])

  React.useEffect(() => {
    const state = { cancelled: false }
    if (initialQuestions.length) {
      setQueue(initialQuestions.slice(1))
      setCurrent(initialQuestions[0] ?? null)
      setLoading(false)
      started.current = Date.now()
      return () => { if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current) }
    }
    // Async fetch completion initializes the first externally loaded question.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!testType) return () => { if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current) }
    void loadInitial(state)
    return () => {
      state.cancelled = true
      if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current)
    }
  }, [loadInitial, initialQuestions, testType])

  async function nextQuestion() {
    if (advanceTimer.current != null) {
      window.clearTimeout(advanceTimer.current)
      advanceTimer.current = null
    }
    if (queue.length > 0) {
      setChoice('')
      setMark(null)
      setRefillError('')
      setTick((n) => n + 1)
      started.current = Date.now()
      setRound((n) => n + 1)
      setCurrent(queue[0])
      setQueue((prev) => prev.slice(1))
      if (queue.length < 3 && !sampleOnly) {
        const extra = await fill()
        if (extra.length) setQueue((prev) => [...prev, ...extra])
      }
      return
    }
    if (sampleOnly) {
      setPreviewSignup(true)
      return
    }
    // Queue exhausted: refill before advancing so the screen never goes blank.
    const extra = await fill()
    if (!extra.length) {
      setRefillError('Out of questions for now — retry to keep the round going.')
      return
    }
    setChoice('')
    setMark(null)
    setRefillError('')
    setTick((n) => n + 1)
    started.current = Date.now()
    setRound((n) => n + 1)
    setCurrent(extra[0] ?? null)
    setQueue(extra.slice(1))
  }

  function scheduleNext() {
    if (advanceTimer.current != null) window.clearTimeout(advanceTimer.current)
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      void nextQuestion()
    }, 450)
  }

  function submit(auto = false, pickedOverride?: string) {
    if (!current || mark) return
    const picked = pickedOverride ?? choice
    if (!picked && !auto) return
    if (pickedOverride) setChoice(pickedOverride)
    const correct = picked ? answersMatch(picked, current.correct_answer) : false
    setMark({ correct })
    if (correct) {
      setHits((n) => n + 1)
      setStreak((n) => n + 1)
    } else {
      setStreak(0)
    }
    const timeSeconds = Math.max(1, Math.round((Date.now() - started.current) / 1000))
    if (!initialQuestions.length) void fetch('/api/practice/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: current.id,
        topicId: current.topic_id,
        selectedAnswer: picked || '—',
        timeSeconds,
        difficulty: current.difficulty,
        tutorUsed: aiOpen,
        hintUsed: false,
        desmosUsed: desmos.open,
      }),
    }).catch(() => undefined)
    if (correct) scheduleNext()
  }

  function openMistakeChat() {
    if (!current || !mark || mark.correct || typeof window === 'undefined') return
    window.sessionStorage.setItem('prep:last-rapid-fire-mistake', JSON.stringify({
      questionId: current.id,
      questionText: promptText,
      passageContent: current.passage_content ?? null,
      topicId: current.topic_id,
      topicName: current.topic_name,
      sectionName: current.section_name,
      selectedAnswer: choice || 'No answer selected',
      correctAnswer: current.correct_answer,
      choices: current.choices,
      officialExplanation: current.official_explanation ?? current.ai_explanation ?? null,
    }))
    router.push('/chat?from=rapid-fire')
  }

  async function askTutor(prompt: string, reveal: boolean, display?: string) {
    if (!current) return
    setRailMessages((previous) => [...previous, { role: 'user', content: display ?? prompt }])
    try {
      const response = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: false,
          trigger: reveal ? 'wrong_answer' : 'hint',
          messages: [{ role: 'user', content: prompt }],
          context: {
            questionId: current.id,
            questionText: current.question_text,
            topicName: current.topic_name ?? 'General',
            sectionName: current.section_name ?? undefined,
            selectedAnswer: choice || undefined,
            correctAnswer: reveal ? current.correct_answer : undefined,
            choices: current.choices,
            submitted: reveal,
            desmosAvailable: true,
            openChat: true,
          },
        }),
      })
      const data = await response.json() as { message?: string; error?: string }
      setRailMessages((previous) => [...previous, { role: 'assistant', content: data.message ?? data.error ?? 'I could not answer that.' }])
    } catch {
      setRailMessages((previous) => [...previous, { role: 'assistant', content: 'I could not answer that.' }])
    }
  }

  async function seeCorrectAnswer() {
    if (!current || boardBusy) return
    setHeld(true)
    setBoardBusy(true)
    setBoardSteps([])
    setBoardAnswer('')
    setBoardShown(0)
    try {
      const response = await fetch('/api/ai/work-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: current.question_text,
          passage: current.passage_content ?? undefined,
          choices: current.choices,
          selectedAnswer: choice || undefined,
          correctAnswer: current.correct_answer,
          explanation: current.official_explanation ?? current.ai_explanation ?? undefined,
          section: current.section_name ?? undefined,
        }),
      })
      const data = await response.json() as { steps?: Array<{ mark?: string; title?: string; expression?: string; focus?: string; note?: string }>; answer?: string; error?: string }
      const steps = (data.steps ?? []).map((step) => ({
        mark: step.mark ?? 'underline',
        title: step.title ?? 'Step',
        expression: step.expression ?? '',
        focus: step.focus ?? '',
        note: step.note ?? '',
      }))
      setBoardAnswer(data.answer ?? '')
      if (!steps.length) {
        setRailMessages((previous) => [...previous, { role: 'assistant', content: data.error ?? 'The breakdown is not available for this question.' }])
        setHeld(false)
        return
      }
      setBoardSteps(steps)
    } catch {
      setRailMessages((previous) => [...previous, { role: 'assistant', content: 'The breakdown is not available for this question.' }])
      setHeld(false)
    } finally {
      setBoardBusy(false)
    }
  }

  function timeOutAndAdvance() {
    if (!current || mark) return
    setStreak(0)
    const timeSeconds = Math.max(1, Math.round((Date.now() - started.current) / 1000))
    void fetch('/api/practice/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: current.id,
        topicId: current.topic_id,
        selectedAnswer: '—',
        timeSeconds,
        difficulty: current.difficulty,
        tutorUsed: aiOpen,
        hintUsed: false,
        desmosUsed: desmos.open,
      }),
    }).catch(() => undefined)
    void nextQuestion()
  }

  React.useEffect(() => {
    desmos.setOpen(true)
  }, [desmos.setOpen])

  React.useEffect(() => {
    if (!desmos.open) return
    const id = window.requestAnimationFrame(() => desmos.resize())
    return () => window.cancelAnimationFrame(id)
  }, [desmos.open, desmos.resize])

  if (!testType) {
    return (
      <div className="mx-auto grid w-full max-w-lg gap-3 py-4">
        <p className="text-sm font-bold text-[#777]">Choose the exam these questions should match.</p>
        {(['SAT', 'ACT'] as const).map((exam) => (
          <button
            key={exam}
            type="button"
            onClick={() => {
              setLoading(true)
              setTestType(exam)
            }}
            className="rounded-2xl border-2 border-[#e5e5e5] bg-white px-4 py-4 text-left shadow-[0_4px_0_#e5e5e5] transition active:translate-y-1 active:shadow-none"
          >
            <span className="block font-display text-2xl text-[#3c3c3c]">{exam}</span>
            <span className="mt-1 block text-sm font-bold text-[#777]">{exam === 'SAT' ? 'Digital SAT choices' : 'ACT booklet choices'}</span>
          </button>
        ))}
      </div>
    )
  }

  if (previewSignup) return <PreviewSignup />

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    )
  }

  if (error || !current) {
    return (
      <div className="mx-auto flex min-h-[400px] w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
        <p className="text-sm text-fog">{error || 'No questions available.'}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              const state = { cancelled: false }
              void loadInitial(state)
            }}
            className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-white"
          >
            Retry
          </button>
          <Link
            href="/practice"
            className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-paper"
          >
            Topic practice
          </Link>
        </div>
      </div>
    )
  }

  const spr = isStudentProduced(current.question_type, current.choices)
  const choices = current.choices ?? []
  const promptText = cleanQuestionText(current.question_text)
  const timeLimit = rapidFireSeconds(current)

  return (
    <div className={cn('-mx-5 flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden', testType === 'ACT' ? 'bg-[#fff6ea]' : 'bg-[#f4f7fb]')}>
      <div className={cn('shrink-0 space-y-3 border-b px-5 pb-4 pt-2', testType === 'ACT' ? 'border-[#f0d7b0] bg-[#fffaf3]' : 'border-[#d7d7d7] bg-white')}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#777]">{testType} style · hardest bank</p>
            {examFocus === 'both' && (
              <button type="button" onClick={() => { setTestType(null); setCurrent(null); setQueue([]); setLoading(false) }} className="mt-1 text-xs font-bold text-[#1cb0f6]">Switch exam</button>
            )}
            <p className="mt-1 text-sm font-extrabold text-[#3c3c3c]">
              Q{round} · {hits} correct{streak > 1 ? ` · ${streak} streak` : ''} · {timeLimit}s for this question
            </p>
          </div>
          <QuestionTimer
            key={tick}
            mode="countdown"
            initialSeconds={timeLimit}
            running={!mark && !held}
            onTimeUp={timeOutAndAdvance}
          />
        </div>
        <PracticeTools
          chatOpen={aiOpen}
          calculatorOpen={desmos.open}
          onChat={() => setAiOpen(true)}
          onCalculator={() => desmos.setOpen(!desmos.open)}
          calculator={testType === 'SAT'}
          onHint={() => {
            void askTutor('Give one hint that points at the method. Do not state the answer or the correct choice.', false, 'Hint')
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-4">
          <div className="mx-auto min-h-full w-full max-w-6xl overflow-hidden rounded-[0.35rem] border border-[#d7d7d7] bg-white shadow-sm">
            {refillError ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-signal/30 bg-[rgba(255,92,57,0.08)] px-4 py-3">
                <p className="text-sm text-paper">{refillError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setRefillError('')
                    void nextQuestion()
                  }}
                  className="rounded-full bg-signal px-4 py-1.5 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            ) : null}
            <div className="grid min-h-[calc(100svh-13rem)] lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.95fr)]">
              <section className="border-b border-[#d7d7d7] p-6 lg:border-b-0 lg:border-r">
                <div className="mx-auto max-w-2xl">
                  {current.passage_content ? (
                    <>
                      {current.passage_title && <p className="mb-4 text-center text-sm font-bold text-[#4b4b4b]">{current.passage_title}</p>}
                      <QuestionPrompt text={current.passage_content} className="text-[15px] font-semibold leading-7 text-[#1f2937]" />
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777]">Question reference</p>
                      <QuestionPrompt text={promptText} className="mt-4 text-[15px] font-semibold leading-7 text-[#1f2937]" />
                      <MathDiagram text={promptText} imageUrl={current.image_url} />
                    </>
                  )}
                </div>
              </section>

              <section className="bg-[#fbfbfb] p-5">
                <div className="mb-5 flex items-center justify-between border-b border-[#d7d7d7] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center bg-black font-mono text-sm font-bold text-white">{round}</span>
                    <span className="text-xs font-semibold text-[#4b4b4b]">{timeLimit}-second challenge</span>
                  </div>
                  <p className={cn(
                    'text-xs font-extrabold',
                    mark == null && 'text-[#777]',
                    mark?.correct && 'text-[#46a302]',
                    mark && !mark.correct && 'text-[#ff4b4b]',
                  )}>
                    {mark == null
                      ? 'Commit before time runs out'
                      : mark.correct
                        ? streak > 1 ? `Correct · ${streak} streak` : 'Correct'
                        : `Answer ${officialChoiceLabel(displayedChoiceLabel(current.choices, current.correct_answer), testType, round)}`}
                  </p>
                </div>

                {current.passage_content && (
                  <>
                    <QuestionPrompt text={promptText} className="mb-5 text-[15px] font-semibold leading-6 text-[#1f2937]" />
                    <MathDiagram text={promptText} imageUrl={current.image_url} />
                  </>
                )}

                {mark && !mark.correct ? (
                  <div className="mb-4 rounded-2xl border-2 border-[#ffb3b3] bg-[#fff0f0] p-3">
                    <p className="text-sm font-extrabold text-[#3c3c3c]">You missed this one. Want the AI to break down exactly where it went wrong?</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={openMistakeChat}
                        className="rounded-full bg-[#ff4b4b] px-4 py-2 text-sm font-black text-white shadow-[0_4px_0_#d73737]"
                      >
                        See Mistakes
                      </button>
                      <button
                        type="button"
                        onClick={() => void nextQuestion()}
                        className="rounded-full border-2 border-[#e5e5e5] bg-white px-4 py-2 text-sm font-black text-[#3c3c3c] shadow-[0_4px_0_#e5e5e5]"
                      >
                        Next question
                      </button>
                    </div>
                  </div>
                ) : null}

                {spr ? (
                  <div className="space-y-4">
                    <input
                      value={choice}
                      onChange={(event) => setChoice(event.target.value)}
                      disabled={Boolean(mark)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && choice && !mark) submit(false)
                      }}
                      placeholder="Enter your answer"
                      className="h-12 w-full rounded-md border border-[#9ca3af] bg-white px-4 text-base font-semibold text-[#111827] outline-none focus:border-black"
                    />
                    {!mark && (
                      <button
                        type="button"
                        onClick={() => submit(false)}
                        className="w-full rounded-md bg-black py-3 text-sm font-bold text-white disabled:opacity-40"
                        disabled={!choice}
                      >
                        Lock in
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {choices.map((item) => {
                      const selected = choice === item.key
                      const right = Boolean(mark) && item.key === current.correct_answer
                      const wrong = Boolean(mark) && selected && item.key !== current.correct_answer
                      return (
                        <button
                          key={item.key}
                          type="button"
                          disabled={Boolean(mark)}
                          onClick={() => submit(false, item.key)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-md border bg-white p-3 text-left text-sm font-semibold text-[#1f2937] transition',
                            selected && !mark && 'border-black ring-2 ring-black/10',
                            right && 'border-[#58cc02] bg-[#edffe6]',
                            wrong && 'border-[#ff4b4b] bg-[#fff0f0]',
                            !selected && !right && !wrong && 'border-[#b8bec8] hover:border-[#111827]',
                          )}
                        >
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center border text-xs font-bold',
                            testType === 'ACT' ? 'rounded-sm' : 'rounded-full',
                            selected || right ? 'border-black bg-black text-white' : wrong ? 'border-[#ff4b4b] text-[#ff4b4b]' : 'border-[#8c96a3] text-[#4b5563]',
                          )}>
                            {officialChoiceLabel(item.label ?? item.key, testType, round)}
                          </span>
                          <QuestionPrompt text={item.text} className="mb-0 flex-1 text-sm leading-5" />
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        <aside className="flex max-h-[46vh] min-h-0 w-full shrink-0 flex-col overflow-y-auto border-t border-[#e5e5e5] bg-[#fbfbfb] lg:max-h-none lg:w-[min(380px,36vw)] lg:border-l lg:border-t-0">
          <div className="space-y-3 p-3">
            <section className="rounded-2xl border border-[#e6eef6] bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1cb0f6]">Chat</p>
                <button type="button" onClick={() => void askTutor('Give one hint that points at the method. Do not state the answer or the correct choice.', false, 'Hint')} className="flex items-center gap-1 rounded-full bg-[#fff4e5] px-2 py-1 text-[11px] font-extrabold text-[#a15c00]">
                  <Lightbulb className="h-3.5 w-3.5" /> Hint
                </button>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto">
                {railMessages.length === 0 ? <p className="text-xs font-semibold text-[#8aa0b5]">Ask for a hint, or open the breakdown.</p> : railMessages.map((message, index) => (
                  <p key={`${message.role}-${index}`} className={message.role === 'user' ? 'rounded-xl bg-[#e8f6ff] px-2 py-1.5 text-xs font-semibold text-[#0d6f9b]' : 'rounded-xl bg-[#f7f7f7] px-2 py-1.5 text-xs font-semibold text-[#243044]'}>{message.content}</p>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={railInput} onChange={(event) => setRailInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && railInput.trim()) { const text = railInput.trim(); setRailInput(''); void askTutor(text, false) } }} placeholder="Ask about this question" className="min-w-0 flex-1 rounded-xl border border-[#e5e5e5] px-2 py-1.5 text-xs font-bold outline-none" />
              </div>
              <button type="button" onClick={() => void seeCorrectAnswer()} className="mt-2 w-full rounded-xl bg-[#1cb0f6] px-3 py-2 text-xs font-extrabold text-white">See correct answer</button>
            </section>
            <section className="h-64 overflow-hidden rounded-2xl border border-[#e6eef6] bg-white">
              <DesmosPanel embedded />
            </section>
            <section className="rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 shadow-[0_6px_0_#e5e5e5]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1cb0f6]">Live work board</p>
              <p className="font-display text-xl text-[#3c3c3c]">Breakdown</p>
              {boardBusy ? <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#777]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working through the steps…</p> : null}
              {held && !boardBusy ? <p className="mt-1 text-[11px] font-bold text-[#1cb0f6]">Timer paused until the steps finish.</p> : null}
              <div className="mt-3 space-y-3">
                {boardSteps.slice(0, boardShown).map((step, index) => {
                  const marked = step.focus && step.expression.toLowerCase().includes(step.focus.toLowerCase())
                  const at = marked ? step.expression.toLowerCase().indexOf(step.focus.toLowerCase()) : -1
                  const before = at >= 0 ? step.expression.slice(0, at) : step.expression
                  const middle = at >= 0 ? step.expression.slice(at, at + step.focus.length) : ''
                  const after = at >= 0 ? step.expression.slice(at + step.focus.length) : ''
                  const markClass = step.mark === 'highlight'
                    ? 'rounded-md bg-[#fff067] px-1'
                    : step.mark === 'circle'
                      ? 'inline-block rounded-full border-4 border-[#ff4b4b] px-2 py-0.5'
                      : step.mark === 'underline'
                        ? 'underline decoration-[#1cb0f6] decoration-4 underline-offset-4'
                        : ''
                  return (
                    <div key={`${step.title}-${index}`} className="rounded-2xl border-2 border-[#d9d9d9] bg-[#fafafa] p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#777] text-xs font-black text-white">{index + 1}</span>
                        <p className="text-sm font-black text-[#555]">{step.title}</p>
                      </div>
                      <div className="grid items-center gap-2">
                        <div className="rounded-xl bg-white p-3 font-mono text-base font-black leading-7 text-[#222]">
                          {before}{middle ? <span className={markClass}>{middle}</span> : null}{after}
                        </div>
                        <div className="text-2xl font-black text-[#ff7676]" aria-hidden="true">→</div>
                        <div className="rounded-2xl border-2 border-[#9edcff] bg-[#eef9ff] px-3 py-2 text-sm font-bold leading-5 text-[#126c9b]">{step.note}</div>
                      </div>
                    </div>
                  )
                })}
                {boardAnswer && boardShown >= boardSteps.length && boardSteps.length > 0 ? (
                  <div className="rounded-2xl border-2 border-[#58cc02] bg-[#edffe6] p-4 text-center shadow-[0_4px_0_#46a302]">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#3f9400]">Final answer</p>
                    <p className="mt-1 font-display text-3xl text-[#2f7600]">{boardAnswer}</p>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </aside>
      </div>

      <AiTutorPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        pendingTrigger={pending}
        context={{
          questionId: current.id,
          questionText: promptText,
          topicId: current.topic_id,
          topicName: current.topic_name ?? 'General',
          sectionName: current.section_name ?? undefined,
          selectedAnswer: choice || undefined,
          correctAnswer: mark ? current.correct_answer : undefined,
          choices: current.choices,
          submitted: Boolean(mark),
          isCorrect: mark?.correct,
          desmosAvailable: true,
        }}
      />
    </div>
  )
}

export function SimulatorClient({ testType, examFocus, initialQuestions = [] }: { testType?: 'SAT' | 'ACT'; examFocus?: ExamFocus; initialQuestions?: BookletQuestion[] }) {
  return (
    <DesmosProvider enabled>
      <SimulatorInner examFocus={examFocus ?? testType ?? 'both'} initialQuestions={initialQuestions} />
    </DesmosProvider>
  )
}
