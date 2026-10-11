'use client'

import * as React from 'react'
import { answersMatch } from '@/lib/practice/answers'
import type { BookletQuestion } from '@/components/practice/test-booklet'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { cn } from '@/lib/utils'

const STEP_LINES = 8
const STEP_HOLD_MS = 3200

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function startingExpression(question: string): string {
  const valueOf = question.match(/value of\s+(.+?)\s*\?\s*$/i)
  if (valueOf?.[1]) return valueOf[1].trim()
  const directed = question.match(/(?:simplify|solve|evaluate|find)\s+(.+?)\s*\?\s*$/i)
  if (directed?.[1] && /[\d/=+−-]/.test(directed[1])) return directed[1].trim()
  return question.replace(/\s+/g, ' ').trim()
}

function readLines(value: string): string[] {
  const rows = value.split('\n')
  return Array.from({ length: STEP_LINES }, (_, index) => rows[index] ?? '')
}

function writeLine(value: string, index: number, next: string): string {
  const rows = readLines(value)
  rows[index] = next.replace(/\n/g, ' ')
  return rows.join('\n')
}

type Verdict = 'check' | 'x'

type Move = {
  instruction: string
  before: string
  after: string
  work: string
  correct: boolean
}

type FollowResult = {
  expression: string
  moves: Move[]
  followedAnswer: string
}

type Play = { shown: number; phase: 'run' | 'mark' }

function filledSlots(rows: string[]): number[] {
  return rows.flatMap((row, index) => (row.trim() ? [index] : []))
}

function stepState(moveIndex: number, play: Play | undefined, total: number): 'wait' | 'run' | 'done' {
  if (!play) return 'wait'
  if (play.shown >= total) return 'done'
  if (moveIndex < play.shown) return 'done'
  if (moveIndex === play.shown && play.phase === 'mark') return 'done'
  if (moveIndex === play.shown) return 'run'
  return 'wait'
}

function boardExpression(tape: FollowResult, play: Play | undefined): string {
  if (!play || (play.shown === 0 && play.phase === 'run')) return tape.expression || tape.moves[0]?.before || ''
  if (play.phase === 'mark') return tape.moves[play.shown]?.after || tape.expression
  return tape.moves[play.shown - 1]?.after || tape.expression
}

function followedIsCorrect(followed: string, question: BookletQuestion): boolean {
  const raw = followed.trim()
  if (!raw) return false
  if (answersMatch(raw, question.correct_answer)) return true
  const letter = raw.match(/\b([A-J])\b/i)?.[1]?.toUpperCase()
  if (letter && letter === question.correct_answer.trim().toUpperCase()) return true
  const choice = question.choices.find((item) => item.key.toUpperCase() === question.correct_answer.trim().toUpperCase())
  if (!choice) return false
  return raw.toLowerCase() === choice.text.trim().toLowerCase() || answersMatch(raw, choice.text)
}

export function ReviewCoach({
  questions,
  onGraded,
}: {
  questions: BookletQuestion[]
  onGraded: (id: string, correct: boolean) => void
}) {
  const [index, setIndex] = React.useState(0)
  const [drafts, setDrafts] = React.useState<Record<string, string>>({})
  const [work, setWork] = React.useState<Record<string, FollowResult>>({})
  const [submitted, setSubmitted] = React.useState<Record<string, string[]>>({})
  const [cursor, setCursor] = React.useState<Record<string, Play>>({})
  const [repair, setRepair] = React.useState<Record<string, string[]>>({})
  const [verdict, setVerdict] = React.useState<Record<string, Verdict>>({})
  const [stamp, setStamp] = React.useState<'giant' | 'settled'>('settled')
  const [busy, setBusy] = React.useState<'follow' | 'play' | 'repair' | null>(null)
  const stamped = React.useRef<Set<string>>(new Set())
  const runToken = React.useRef(0)
  const activeStepRef = React.useRef<HTMLLIElement | null>(null)
  const [error, setError] = React.useState('')
  const lineRefs = React.useRef<Array<HTMLInputElement | null>>([])
  const question = questions[index]
  const questionId = question?.id ?? ''
  const lines = drafts[questionId] ?? ''
  const result = work[questionId]
  const play = cursor[questionId]
  const plan = submitted[questionId] ?? []
  const fix = repair[questionId]
  const mark = verdict[questionId]

  React.useEffect(() => {
    runToken.current += 1
    setIndex(0)
    setDrafts({})
    setWork({})
    setSubmitted({})
    setCursor({})
    setRepair({})
    setVerdict({})
    setError('')
    setBusy(null)
    stamped.current = new Set()
  }, [questions])

  React.useEffect(() => {
    const tape = work[questionId]
    const state = cursor[questionId]
    const expected = submitted[questionId]?.length ?? 0
    if (!question || !tape || !state || !expected) return
    if (state.phase !== 'run' || state.shown < expected || tape.moves.length < expected) return
    if (verdict[questionId]) {
      setBusy((current) => (current === 'play' ? null : current))
      return
    }
    const correct = followedIsCorrect(tape.followedAnswer, question)
    setVerdict((prev) => ({ ...prev, [question.id]: correct ? 'check' : 'x' }))
    onGraded(question.id, correct)
    setBusy((current) => (current === 'play' ? null : current))
  }, [cursor, work, question, questionId, verdict, onGraded, submitted])

  React.useEffect(() => {
    if (!mark || !questionId || stamped.current.has(questionId)) return
    stamped.current.add(questionId)
    setStamp('giant')
    const timer = window.setTimeout(() => setStamp('settled'), 1500)
    return () => window.clearTimeout(timer)
  }, [mark, questionId])

  React.useEffect(() => {
    activeStepRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [play?.shown, play?.phase, questionId])

  async function run() {
    if (!question || busy) return
    const instructionLines = readLines(lines).map((line) => line.trim()).filter(Boolean)
    if (!instructionLines.length) {
      setError('Write the steps on the lines first.')
      return
    }
    const id = question.id
    setBusy('follow')
    setError('')
    setSubmitted((prev) => ({ ...prev, [id]: instructionLines }))
    setWork((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setCursor((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setRepair((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setVerdict((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    stamped.current.delete(id)
    const token = ++runToken.current
    const start = startingExpression(question.question_text)
    setWork((prev) => ({ ...prev, [id]: { expression: start, moves: [], followedAnswer: '' } }))
    setCursor((prev) => ({ ...prev, [id]: { shown: 0, phase: 'run' } }))
    setBusy('play')
    try {
      let expression = start
      const moves: Move[] = []
      let followedAnswer = ''
      for (let stepIndex = 0; stepIndex < instructionLines.length; stepIndex += 1) {
        if (runToken.current !== token) return
        setCursor((prev) => ({ ...prev, [id]: { shown: stepIndex, phase: 'run' } }))
        const res = await fetch('/api/refresh/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'step',
            question: question.question_text,
            passage: question.passage_content ?? undefined,
            choices: question.choices.map((choice) => ({ key: choice.key, text: choice.text })),
            instruction: instructionLines[stepIndex],
            currentExpression: expression.slice(0, 500),
            isLast: stepIndex === instructionLines.length - 1,
          }),
        })
        const data = await res.json() as { move?: Move; followedAnswer?: string; error?: string }
        if (runToken.current !== token) return
        if (!res.ok || data.error || !data.move?.after) throw new Error(data.error ?? 'Could not follow those steps')
        const move: Move = { ...data.move, instruction: instructionLines[stepIndex] }
        moves.push(move)
        expression = move.after
        followedAnswer = data.followedAnswer || followedAnswer
        setWork((prev) => ({ ...prev, [id]: { expression: start, moves: [...moves], followedAnswer } }))
        setCursor((prev) => ({ ...prev, [id]: { shown: stepIndex, phase: 'mark' } }))
        if (stepIndex < instructionLines.length - 1) await wait(STEP_HOLD_MS)
      }
      if (runToken.current !== token) return
      setCursor((prev) => ({ ...prev, [id]: { shown: instructionLines.length, phase: 'run' } }))
      if (!followedIsCorrect(followedAnswer, question)) {
        void fetch('/api/refresh/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'repair',
            question: question.question_text,
            passage: question.passage_content ?? undefined,
            choices: question.choices.map((choice) => ({ key: choice.key, text: choice.text })),
            officialExplanation: question.official_explanation ?? undefined,
            correctAnswer: question.correct_answer,
          }),
        }).then(async (repairRes) => {
          const repairData = await repairRes.json() as { steps?: string[] }
          if (repairRes.ok && repairData.steps?.length) {
            setRepair((prev) => ({ ...prev, [id]: repairData.steps ?? [] }))
          }
        }).catch(() => undefined)
      }
    } catch (err) {
      if (runToken.current !== token) return
      setError(err instanceof Error ? err.message : 'Could not follow those steps')
      setBusy(null)
    }
  }

  if (!question) return null

  const rows = readLines(lines)
  const lineMove = new Map<number, number>()
  filledSlots(rows).forEach((slot, moveIndex) => lineMove.set(slot, moveIndex))
  const expression = result ? boardExpression(result, play) : ''
  const stepTotal = plan.length
  const runningStep = play && stepTotal > 0 && play.shown < stepTotal ? play.shown + 1 : 0

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <section className="overflow-hidden rounded-[1.75rem] border-4 border-[#e5e5e5] bg-white shadow-[0_8px_0_#e5e5e5]" aria-label="Write the steps">
        <div className="flex items-center justify-between border-b-4 border-[#e5e5e5] px-5 py-3">
          <p className="font-display text-2xl text-[#3c3c3c]">Write the steps</p>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c27000]">The AI does this exactly</p>
        </div>
        <ol className="space-y-5 px-6 py-6">
          {rows.map((row, lineIndex) => {
            const moveIndex = lineMove.get(lineIndex)
            const move = moveIndex === undefined ? undefined : result?.moves[moveIndex]
            const status = moveIndex === undefined || !play || !stepTotal ? 'wait' : stepState(moveIndex, play, stepTotal)
            return (
              <li key={lineIndex}>
                <label className={cn('flex items-baseline gap-3 rounded-xl px-2 py-1', status === 'run' && 'bg-[#e8f7ff]')}>
                  <span className="w-8 shrink-0 text-right text-lg font-extrabold text-[#3c3c3c]">{lineIndex + 1}.</span>
                  <input
                    ref={(node) => { lineRefs.current[lineIndex] = node }}
                    value={row}
                    aria-label={`Step ${lineIndex + 1}`}
                    placeholder="____________________"
                    spellCheck
                    readOnly={busy !== null}
                    onChange={(event) => {
                      setDrafts((prev) => ({ ...prev, [question.id]: writeLine(lines, lineIndex, event.target.value) }))
                      setError('')
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      lineRefs.current[lineIndex + 1]?.focus()
                    }}
                    className="min-w-0 flex-1 border-b-2 border-[#d4d4d4] bg-transparent pb-1 text-base font-semibold text-[#1a1412] outline-none placeholder:font-medium placeholder:tracking-tight placeholder:text-[#d4d4d4] read-only:text-[#3c3c3c]"
                  />
                  {status === 'done' && move ? (
                    <span className={cn('font-display text-3xl leading-none', move.correct ? 'text-[#58cc02]' : 'text-[#ff4b4b]')} aria-label={move.correct ? 'Step correct' : 'Step wrong'}>
                      {move.correct ? '✓' : '✕'}
                    </span>
                  ) : null}
                </label>
              </li>
            )
          })}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-4 border-[#e5e5e5] px-5 py-4">
          {error ? <p className="text-sm font-bold text-[#e11d48]">{error}</p> : <p className="text-sm font-bold text-[#777]">Each line runs on the expression.</p>}
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy !== null}
            className="rounded-2xl bg-[#1cb0f6] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_4px_0_#1899d6] active:translate-y-1 active:shadow-none disabled:opacity-60"
          >
            {busy === 'play' && play?.phase === 'run' ? `Running step ${runningStep}…` : busy === 'play' ? 'Holding this step…' : 'Do what I wrote'}
          </button>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-[1.75rem] border-4 border-[#e5e5e5] bg-white shadow-[0_8px_0_#e5e5e5]" aria-label="Question and AI work">
        <div className="flex items-center justify-between gap-3 border-b-4 border-[#e5e5e5] px-5 py-3">
          <p className="font-display text-2xl text-[#3c3c3c]">Question {index + 1} of {questions.length}</p>
          <div className="flex items-center gap-2">
            {mark && stamp === 'settled' ? (
              <span className={cn('font-display text-5xl leading-none', mark === 'check' ? 'text-[#58cc02]' : 'text-[#ff4b4b]')} aria-label={mark === 'check' ? 'Correct' : 'Not correct'}>
                {mark === 'check' ? '✓' : '✕'}
              </span>
            ) : null}
            <button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} className="rounded-xl border-2 border-[#e5e5e5] px-3 py-1 text-sm font-extrabold text-[#777] disabled:opacity-40">Back</button>
            <button type="button" onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} disabled={index >= questions.length - 1} className="rounded-xl border-2 border-[#e5e5e5] px-3 py-1 text-sm font-extrabold text-[#777] disabled:opacity-40">Next</button>
          </div>
        </div>
        <div className="max-h-[16rem] space-y-4 overflow-y-auto px-5 py-4">
          {question.passage_content ? (
            <div className="rounded-2xl bg-[#f7f7f7] p-4 text-sm font-medium leading-8 text-[#3c3c3c]">
              <QuestionPrompt text={question.passage_content} className="whitespace-pre-wrap text-inherit" />
            </div>
          ) : null}
          {question.image_url ? <img src={question.image_url} alt="Question figure" className="max-h-48 rounded-xl" /> : null}
          <QuestionPrompt text={question.question_text} className="text-base font-bold leading-normal text-[#1a1412]" />
          {question.choices.length ? (
            <ul className="space-y-2">
              {question.choices.map((choice) => (
                <li key={choice.key} className="flex items-center rounded-xl border-2 border-[#e5e5e5] px-3 py-2 text-sm font-bold leading-8 text-[#3c3c3c]">
                  <span className="mr-2 font-mono text-[#1cb0f6]">{choice.key}</span>
                  <QuestionPrompt as="span" text={choice.text} className="text-inherit" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="max-h-[28rem] space-y-4 overflow-y-auto border-t-4 border-[#e5e5e5] px-5 py-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#1cb0f6]">Expression</p>
          <div className="flex min-h-24 items-center justify-center rounded-2xl bg-[#f4faff] px-4 py-4 text-center text-2xl font-bold leading-normal text-[#1a1412]" aria-live="polite">
            {expression ? (
              <QuestionPrompt text={expression} className="text-inherit" />
            ) : (
              <p className="text-sm font-bold text-[#777]">The expression will show here.</p>
            )}
          </div>
          {plan.length || result ? (
            <ol className="space-y-3">
              {plan.map((instruction, moveIndex) => {
                const move = result?.moves[moveIndex]
                const status = stepTotal ? stepState(moveIndex, play, stepTotal) : 'wait'
                const active = status === 'run'
                return (
                  <li
                    key={`${instruction}-${moveIndex}`}
                    ref={active ? activeStepRef : undefined}
                    className={cn('rounded-2xl border-2 px-4 py-3', active ? 'border-[#1cb0f6] bg-[#f4faff]' : 'border-[#e5e5e5]', status === 'wait' && 'opacity-60')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-extrabold text-[#1a1412]">
                        <span className="mr-2 text-[#1cb0f6]">{moveIndex + 1}.</span>
                        {move?.instruction || instruction}
                      </p>
                      {status === 'done' && move ? (
                        <span className={cn('font-display text-4xl leading-none', move.correct ? 'text-[#58cc02]' : 'text-[#ff4b4b]')} aria-label={move.correct ? 'Step correct' : 'Step wrong'}>
                          {move.correct ? '✓' : '✕'}
                        </span>
                      ) : active ? (
                        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#1cb0f6]">Running</span>
                      ) : null}
                    </div>
                    {status === 'done' && move ? (
                      <div className="mt-2 space-y-1 text-sm font-semibold leading-8 text-[#3c3c3c]">
                        {move.work ? <QuestionPrompt as="span" text={move.work} className="block text-inherit" /> : null}
                        <QuestionPrompt as="span" text={move.after} className="block text-lg text-[#1a1412]" />
                      </div>
                    ) : active ? (
                      <p className="mt-2 text-sm font-bold text-[#777]">Doing this to the expression…</p>
                    ) : null}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="text-sm font-bold text-[#777]">Your steps will run here, one at a time.</p>
          )}
          {mark && result?.followedAnswer ? (
            <p className="text-sm font-extrabold leading-8 text-[#3c3c3c]">
              That plan lands on <QuestionPrompt as="span" text={result.followedAnswer} className="text-inherit" />.
            </p>
          ) : null}
          {mark === 'x' && fix?.length ? (
            <div className="rounded-2xl bg-[#fff2df] p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#c27000]">The steps that work</p>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm font-semibold leading-8 text-[#1a1412]">
                {fix.map((step, stepIndex) => (
                  <li key={stepIndex}><QuestionPrompt as="span" text={step} className="text-inherit" /></li>
                ))}
              </ol>
            </div>
          ) : mark === 'x' && !fix?.length ? (
            <p className="text-sm font-bold text-[#777]">Writing the steps that work…</p>
          ) : null}
        </div>

        {mark && stamp === 'giant' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/88" role="status" aria-label={mark === 'check' ? 'Correct' : 'Not correct'}>
            <p
              className={cn('font-display leading-none', mark === 'check' ? 'text-[#58cc02]' : 'text-[#ff4b4b]')}
              style={{ fontSize: '11rem', animation: 'review-stamp 0.45s ease-out' }}
            >
              {mark === 'check' ? '✓' : '✕'}
            </p>
            <style>{'@keyframes review-stamp { 0% { transform: scale(0.15) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.08) rotate(0deg); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }'}</style>
          </div>
        ) : null}
      </section>
    </div>
  )
}
