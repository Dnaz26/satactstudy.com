'use client'

import * as React from 'react'
import { QuestionTimer } from '@/components/ui/question-timer'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { PracticeTools } from '@/components/practice/practice-tools'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { MathDiagram } from '@/components/practice/math-diagram'
import { PassagePanel } from '@/components/practice/passage-panel'
import { cn } from '@/lib/utils'
import { isStudentProduced } from '@/lib/questions/render'
import type { TutorTrigger } from '@/lib/tutor/types'
import type { BookletQuestion } from '@/components/practice/test-booklet'
import { officialChoiceLabel } from '@/lib/schema'

function answersMatch(selected: string, correct: string): boolean {
  const a = selected.trim().toLowerCase()
  const b = correct.trim().toLowerCase()
  if (a === b) return true
  const na = Number(a.replace(/,/g, ''))
  const nb = Number(b.replace(/,/g, ''))
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb
}

function SimulatorInner({ testType }: { testType: 'SAT' | 'ACT' }) {
  const desmos = useDesmos()
  const [queue, setQueue] = React.useState<BookletQuestion[]>([])
  const [current, setCurrent] = React.useState<BookletQuestion | null>(null)
  const [choice, setChoice] = React.useState('')
  const [mark, setMark] = React.useState<{ correct: boolean } | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [tick, setTick] = React.useState(0)
  const [aiOpen, setAiOpen] = React.useState(false)
  const [pending, setPending] = React.useState<{ trigger: TutorTrigger; prompt: string } | null>(null)
  const [round, setRound] = React.useState(1)
  const [hits, setHits] = React.useState(0)
  const [streak, setStreak] = React.useState(0)
  const started = React.useRef(Date.now())

  const fill = React.useCallback(async () => {
    const res = await fetch(`/api/practice/questions?testType=${testType}&count=8&difficulty=mixed`)
    const data = await res.json() as { questions?: BookletQuestion[]; error?: string; paywall?: boolean }
    if (data.paywall) {
      setError('Unlock to keep going.')
      return []
    }
    if (!res.ok || data.error) {
      setError(data.error ?? 'Could not load questions')
      return []
    }
    return data.questions ?? []
  }, [testType])

  React.useEffect(() => {
    let cancelled = false
    void fill().then((items) => {
      if (cancelled) return
      setQueue(items.slice(1))
      setCurrent(items[0] ?? null)
      setLoading(false)
      started.current = Date.now()
    })
    return () => {
      cancelled = true
    }
  }, [fill])

  async function nextQuestion() {
    setChoice('')
    setMark(null)
    setTick((n) => n + 1)
    started.current = Date.now()
    setRound((n) => n + 1)
    if (queue.length > 0) {
      setCurrent(queue[0])
      setQueue((prev) => prev.slice(1))
      if (queue.length < 3) {
        const extra = await fill()
        setQueue((prev) => [...prev, ...extra])
      }
      return
    }
    const extra = await fill()
    setCurrent(extra[0] ?? null)
    setQueue(extra.slice(1))
  }

  function submit(auto = false) {
    if (!current || mark) {
      if (auto && current && mark) void nextQuestion()
      return
    }
    const picked = choice || (auto ? '' : '')
    if (!picked && !auto) return
    const correct = picked ? answersMatch(picked, current.correct_answer) : false
    setMark({ correct })
    if (correct) {
      setHits((n) => n + 1)
      setStreak((n) => n + 1)
    } else {
      setStreak(0)
    }
    const timeSeconds = Math.max(1, Math.round((Date.now() - started.current) / 1000))
    void fetch('/api/practice/attempt', {
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
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading…" />
      </div>
    )
  }

  if (error || !current) {
    return <p className="pt-8 text-sm text-fog">{error || 'No questions available.'}</p>
  }

  const spr = isStudentProduced(current.question_type, current.choices)
  const choices = current.choices ?? []

  return (
    <div className="-mx-5 flex h-[calc(100svh-3.5rem)] min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-3 border-b border-line px-5 pb-4 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-fog">Rapid fire · {testType}</p>
            <p className="mt-1 text-sm text-paper">
              Q{round} · {hits} correct{streak > 1 ? ` · ${streak} streak` : ''}
            </p>
          </div>
          <QuestionTimer
            key={tick}
            mode="countdown"
            initialSeconds={60}
            running={!mark}
            onTimeUp={() => {
              submit(true)
              window.setTimeout(() => void nextQuestion(), 900)
            }}
          />
        </div>
        <PracticeTools
          chatOpen={aiOpen}
          calculatorOpen={desmos.open}
          onChat={() => setAiOpen(true)}
          onCalculator={() => desmos.setOpen(!desmos.open)}
          onHint={() => {
            setAiOpen(true)
            setPending({ trigger: 'hint', prompt: 'Give a tiny hint. If math, say what to type in Desmos.' })
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10 pt-5">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          <p className={cn(
            'text-sm',
            mark == null && 'text-fog',
            mark?.correct && 'text-ok',
            mark && !mark.correct && 'text-signal',
          )}>
            {mark == null
              ? '60 seconds. Pick an answer.'
              : mark.correct
                ? streak > 1 ? `Correct · ${streak} in a row` : 'Correct'
                : `Incorrect · ${officialChoiceLabel(current.correct_answer, testType, round)}`}
          </p>

          {current.passage_content ? (
            <PassagePanel title={current.passage_title} content={current.passage_content} />
          ) : null}

          <div className="space-y-2 border-y border-line py-5">
            <p className="text-xs uppercase tracking-[0.14em] text-fog">Question {round}</p>
            <QuestionPrompt text={current.question_text} className="mb-0 text-base leading-6" />
            <MathDiagram text={current.question_text} imageUrl={current.image_url} />
          </div>

          {spr ? (
            <label className="block space-y-2">
              <span className="text-xs uppercase tracking-[0.14em] text-fog">Your answer</span>
              <input
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                disabled={Boolean(mark)}
                placeholder="Type the answer"
                className="h-11 w-full border-b border-line bg-transparent px-0 text-sm text-paper outline-none"
              />
            </label>
          ) : (
            <div className="flex flex-col divide-y divide-line border-y border-line">
              {choices.map((item) => {
                const selected = choice === item.key
                const right = Boolean(mark) && item.key === current.correct_answer
                const wrong = Boolean(mark) && selected && item.key !== current.correct_answer
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={Boolean(mark)}
                    onClick={() => setChoice(item.key)}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3 py-3 text-left transition',
                      selected && !mark && 'bg-panel-2',
                      right && 'bg-[rgba(255,212,200,0.4)]',
                      wrong && 'bg-[rgba(255,92,57,0.12)]',
                    )}
                  >
                    <span className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center font-mono text-xs font-semibold',
                      selected || right || wrong ? 'text-signal' : 'text-fog',
                    )}>
                      {officialChoiceLabel(item.key, testType, round)}
                    </span>
                    <QuestionPrompt text={item.text} className="mb-0 flex-1 text-sm leading-5" />
                  </button>
                )
              })}
            </div>
          )}

          {!mark ? (
            <button
              type="button"
              onClick={() => submit(false)}
              className="w-full rounded-full bg-signal py-3 text-sm font-semibold text-white disabled:opacity-40"
              disabled={!choice}
            >
              Lock in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void nextQuestion()}
              className="w-full rounded-full bg-ok py-3 text-sm font-semibold text-white"
            >
              Next question
            </button>
          )}

          {desmos.open ? (
            <div className="min-h-[420px] overflow-hidden border border-line">
              <DesmosPanel embedded />
            </div>
          ) : null}
        </div>
      </div>

      {!desmos.open && <DesmosPanel embedded={false} />}

      <AiTutorPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        pendingTrigger={pending}
        context={{
          questionId: current.id,
          questionText: current.question_text,
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

export function SimulatorClient({ testType }: { testType: 'SAT' | 'ACT' }) {
  return (
    <DesmosProvider enabled>
      <SimulatorInner testType={testType} />
    </DesmosProvider>
  )
}
