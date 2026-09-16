'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  CATEGORY_LABEL,
  GAME_MODES,
  RESPAWN_CORRECT_NEEDED,
  type GameCategory,
  type GameId,
  type GameMode,
} from '@/lib/game/modes'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { officialChoiceLabel } from '@/lib/schema'
import { cn } from '@/lib/utils'
import type { BookletQuestion } from '@/components/practice/test-booklet'

const CATEGORIES: GameCategory[] = ['arcade', 'action']

export function GameClient({ testType }: { testType: 'SAT' | 'ACT' }) {
  const [modeId, setModeId] = React.useState<GameId | null>(null)
  const [iframeKey, setIframeKey] = React.useState(0)
  const [locked, setLocked] = React.useState(false)
  const [quiz, setQuiz] = React.useState<BookletQuestion[]>([])
  const [quizIndex, setQuizIndex] = React.useState(0)
  const [correctNeeded, setCorrectNeeded] = React.useState(RESPAWN_CORRECT_NEEDED)
  const [choice, setChoice] = React.useState('')
  const [quizMark, setQuizMark] = React.useState<'ok' | 'bad' | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const mode = modeId ? GAME_MODES.find((g) => g.id === modeId) ?? null : null
  const cleared = RESPAWN_CORRECT_NEEDED - correctNeeded
  const progress = cleared / RESPAWN_CORRECT_NEEDED

  const openLockQuiz = React.useCallback(async () => {
    setLocked(true)
    setCorrectNeeded(RESPAWN_CORRECT_NEEDED)
    setQuizIndex(0)
    setChoice('')
    setQuizMark(null)
    setQuizLoading(true)
    try {
      const res = await fetch(
        `/api/practice/questions?testType=${testType}&count=${Math.max(12, RESPAWN_CORRECT_NEEDED * 3)}&difficulty=mixed`,
      )
      const data = (await res.json()) as { questions?: BookletQuestion[] }
      setQuiz(data.questions ?? [])
    } catch {
      setQuiz([])
    } finally {
      setQuizLoading(false)
    }
  }, [testType])

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string } | null
      if (!data || typeof data !== 'object') return
      if (data.type === 'shrimpy-lose') void openLockQuiz()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [openLockQuiz])

  function unlockAndResume() {
    setLocked(false)
    setQuiz([])
    setChoice('')
    setQuizMark(null)
    setQuizIndex(0)
    setCorrectNeeded(RESPAWN_CORRECT_NEEDED)
    setIframeKey((k) => k + 1)
    iframeRef.current?.contentWindow?.postMessage({ type: 'shrimpy-unlock' }, '*')
  }

  function submitQuiz() {
    const q = quiz[quizIndex]
    if (!q || !choice || quizMark || !locked) return
    const ok = choice.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()
    setQuizMark(ok ? 'ok' : 'bad')
    window.setTimeout(() => {
      if (ok) {
        const left = correctNeeded - 1
        if (left <= 0) {
          unlockAndResume()
          return
        }
        setCorrectNeeded(left)
      }
      setChoice('')
      setQuizMark(null)
      setQuizIndex((i) => (i + 1 >= quiz.length ? 0 : i + 1))
    }, 520)
  }

  function leaveGame() {
    if (locked) return
    setModeId(null)
    setLocked(false)
    setQuiz([])
    setChoice('')
    setQuizMark(null)
    setIframeKey(0)
  }

  if (mode) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-[#fffaf7]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(900px 520px at 50% -8%, #ffffff 0%, transparent 58%), radial-gradient(720px 420px at 8% 40%, rgba(255, 92, 57, 0.10), transparent 55%), radial-gradient(640px 380px at 92% 30%, rgba(255, 212, 200, 0.45), transparent 50%)',
          }}
        />

        <div className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[rgba(201,68,36,0.12)] bg-white/75 px-5 backdrop-blur-md">
          <button
            type="button"
            onClick={leaveGame}
            disabled={locked}
            className="text-sm text-fog transition hover:text-paper disabled:opacity-40"
          >
            ← Games
          </button>
          <h2 className="font-display text-lg text-paper">{mode.title}</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
            {CATEGORY_LABEL[mode.category]}
          </span>
        </div>

        <div className="relative z-10 min-h-0 flex-1">
          {!locked && (
            <iframe
              key={`${mode.id}-${iframeKey}`}
              ref={iframeRef}
              title={mode.title}
              src={mode.src}
              className="h-full w-full border-0 bg-transparent"
              allow="fullscreen"
              onLoad={() => {
                try {
                  iframeRef.current?.contentWindow?.focus()
                } catch {
                  /* cross-origin safe */
                }
              }}
            />
          )}

          {locked && (
            <div className="absolute inset-0 flex items-stretch justify-center overflow-y-auto bg-[#fffaf7] p-4 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(900px 520px at 50% -8%, #ffffff 0%, transparent 58%), radial-gradient(720px 420px at 8% 40%, rgba(255, 92, 57, 0.10), transparent 55%), radial-gradient(640px 380px at 92% 30%, rgba(255, 212, 200, 0.45), transparent 50%)',
                }}
              />
              <div className="relative z-10 my-auto w-full max-w-2xl">
                <div className="overflow-hidden rounded-[1.75rem] border border-[rgba(201,68,36,0.12)] bg-white shadow-[0_30px_80px_rgba(40,24,12,0.1)]">
                  <div className="border-b border-[rgba(201,68,36,0.1)] bg-gradient-to-r from-[#fff5f0] to-white px-6 py-5 sm:px-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
                          Continue locked
                        </p>
                        <h3 className="mt-1 font-display text-3xl text-paper">Answer to keep playing</h3>
                        <p className="mt-1 text-sm text-fog">
                          Get {RESPAWN_CORRECT_NEEDED} correct. {correctNeeded} remaining.
                        </p>
                      </div>
                      <div className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center sm:mx-0">
                        <svg viewBox="0 0 96 96" className="absolute inset-0 h-full w-full -rotate-90">
                          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(201,68,36,0.12)" strokeWidth="8" />
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            fill="none"
                            stroke="#ff5c39"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress)}`}
                          />
                        </svg>
                        <div className="text-center">
                          <p className="font-display text-xl text-paper">{cleared}</p>
                          <p className="font-mono text-[9px] uppercase tracking-wider text-fog">
                            / {RESPAWN_CORRECT_NEEDED}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-1.5">
                      {Array.from({ length: RESPAWN_CORRECT_NEEDED }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 flex-1 rounded-full',
                            i < cleared ? 'bg-signal' : 'bg-[rgba(201,68,36,0.12)]',
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
                    {quizLoading && (
                      <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" text="Loading questions…" />
                      </div>
                    )}

                    {!quizLoading && quiz[quizIndex] && (
                      <>
                        <div className="rounded-2xl bg-[#fffaf7] px-5 py-5 sm:px-6 sm:py-6">
                          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
                            {testType} · Question {quizIndex + 1}
                          </p>
                          <QuestionPrompt
                            text={cleanQuestionText(quiz[quizIndex].question_text)}
                            className="mb-0 text-lg leading-relaxed text-paper sm:text-xl"
                          />
                        </div>

                        <div className="grid gap-2.5">
                          {(quiz[quizIndex].choices ?? []).map((item) => {
                            const selected = choice === item.key
                            const showOk = quizMark === 'ok' && selected
                            const showBad = quizMark === 'bad' && selected
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => !quizMark && setChoice(item.key)}
                                className={cn(
                                  'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition',
                                  showOk && 'border-emerald-400 bg-emerald-50 text-paper',
                                  showBad && 'border-signal/50 bg-[rgba(255,92,57,0.08)] text-paper',
                                  !quizMark && selected
                                    && 'border-signal bg-signal text-white shadow-[0_12px_28px_rgba(255,92,57,0.28)]',
                                  !quizMark && !selected
                                    && 'border-[rgba(201,68,36,0.12)] bg-white text-paper hover:border-signal/40 hover:bg-[#fff5f0]',
                                )}
                              >
                                <span
                                  className={cn(
                                    'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-semibold',
                                    selected && !quizMark ? 'bg-white/20 text-white' : 'bg-[#fff5f0] text-signal',
                                    showOk && 'bg-emerald-100 text-emerald-700',
                                    showBad && 'bg-[#ffe8e0] text-signal',
                                  )}
                                >
                                  {item.key}
                                </span>
                                <QuestionPrompt
                                  as="span"
                                  text={cleanQuestionText(item.text)}
                                  className={cn(
                                    'mb-0 pt-1 text-sm leading-relaxed sm:text-base',
                                    selected && !quizMark ? 'text-white' : 'text-inherit',
                                  )}
                                />
                              </button>
                            )
                          })}
                        </div>

                        {quizMark && (
                          <p
                            className={cn(
                              'rounded-xl px-4 py-3 text-sm',
                              quizMark === 'ok'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-[#fff5f0] text-[#c94424]',
                            )}
                          >
                            {quizMark === 'ok'
                              ? 'Correct — keep going.'
                              : `Incorrect · ${officialChoiceLabel(quiz[quizIndex].correct_answer, testType, quizIndex + 1)}`}
                          </p>
                        )}

                        <Button
                          className="h-12 w-full text-base"
                          onClick={submitQuiz}
                          disabled={!choice || Boolean(quizMark)}
                        >
                          {quizMark ? 'Next…' : 'Check answer'}
                        </Button>
                      </>
                    )}

                    {!quizLoading && !quiz[quizIndex] && (
                      <Button className="h-12 w-full" onClick={() => void openLockQuiz()}>
                        Load questions
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-12 pt-2">
      <div>
        <h1 className="font-display text-4xl text-paper sm:text-5xl">Games</h1>
        <p className="mt-2 max-w-2xl text-fog">
          Four neon arenas. Lose a run, clear five {testType} questions, then jump back in.
        </p>
      </div>

      {CATEGORIES.map((category) => {
        const games = GAME_MODES.filter((g) => g.category === category)
        if (!games.length) return null
        return (
          <section key={category} className="space-y-3">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-fog">
              {CATEGORY_LABEL[category]}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={() => {
                    setModeId(game.id)
                    setIframeKey((k) => k + 1)
                    setLocked(false)
                  }}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function GameCard({ game, onPlay }: { game: GameMode; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group overflow-hidden rounded-[1.5rem] border border-[rgba(201,68,36,0.12)] bg-white text-left shadow-[0_16px_40px_rgba(40,24,12,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(40,24,12,0.1)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#0b1220]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={game.cover}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070b16]/50 to-transparent" />
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-xl text-paper">{game.title}</h3>
          <span className="rounded-full bg-[#fff5f0] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            Play
          </span>
        </div>
        <p className="text-sm leading-relaxed text-fog">{game.blurb}</p>
      </div>
    </button>
  )
}
