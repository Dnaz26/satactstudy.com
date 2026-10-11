'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QuestionPrompt } from '@/components/practice/question-prompt'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import {
  GAME_MODES,
  RESPAWN_CORRECT_NEEDED,
  type GameMode,
} from '@/lib/game/modes'
import { LANGUAGE_KEY, t, isUiLanguage } from '@/lib/i18n'
import { cleanQuestionText } from '@/lib/questions/clean-text'
import { displayedChoiceLabel, officialChoiceLabel, type ExamFocus } from '@/lib/schema'
import { cn } from '@/lib/utils'
import type { BookletQuestion } from '@/components/practice/test-booklet'

export function GameClient({ testType, examFocus }: { testType?: 'SAT' | 'ACT'; examFocus?: ExamFocus; premium?: boolean }) {
  const focus: ExamFocus = examFocus ?? testType ?? 'both'
  const [style, setStyle] = React.useState<'SAT' | 'ACT'>(focus === 'ACT' ? 'ACT' : 'SAT')
  const router = useRouter()
  const searchParams = useSearchParams()
  const playId = searchParams.get('play')
  const mode = GAME_MODES.find((game) => game.id === playId) ?? null
  const [language, setLanguage] = React.useState('en')
  const [iframeKey, setIframeKey] = React.useState(0)
  const [locked, setLocked] = React.useState(false)
  const [quiz, setQuiz] = React.useState<BookletQuestion[]>([])
  const [quizIndex, setQuizIndex] = React.useState(0)
  const [correctNeeded, setCorrectNeeded] = React.useState(RESPAWN_CORRECT_NEEDED)
  const [requiredTotal, setRequiredTotal] = React.useState(RESPAWN_CORRECT_NEEDED)
  const [choice, setChoice] = React.useState('')
  const [quizMark, setQuizMark] = React.useState<'ok' | 'bad' | null>(null)
  const [quizLoading, setQuizLoading] = React.useState(false)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const modeIdRef = React.useRef(mode?.id ?? null)
  modeIdRef.current = mode?.id ?? null
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      if (isUiLanguage(saved)) setLanguage(saved)
    } catch { /* ignore */ }
  }, [])
  const cleared = requiredTotal - correctNeeded
  const progress = cleared / requiredTotal

  const openLockQuiz = React.useCallback(async (needed = RESPAWN_CORRECT_NEEDED) => {
    setLocked(true)
    setRequiredTotal(needed)
    setCorrectNeeded(needed)
    setQuizIndex(0)
    setChoice('')
    setQuizMark(null)
    setQuizLoading(true)
    try {
      const res = await fetch(
        `/api/practice/questions?testType=${style}&count=${Math.max(12, needed * 3)}&difficulty=mixed`,
      )
      const data = (await res.json()) as { questions?: BookletQuestion[] }
      setQuiz(data.questions ?? [])
    } catch {
      setQuiz([])
    } finally {
      setQuizLoading(false)
    }
  }, [style])

  const seenStyle = React.useRef(style)
  React.useEffect(() => {
    if (seenStyle.current === style) return
    seenStyle.current = style
    if (!locked) return
    void openLockQuiz(requiredTotal)
  }, [style, locked, openLockQuiz, requiredTotal])

  const openedAt = React.useRef(0)
  React.useEffect(() => { openedAt.current = Date.now() }, [playId])

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string } | null
      if (!data || typeof data !== 'object') return
      const frame = iframeRef.current?.contentWindow
      if (frame && event.source !== frame) return
      if (data.type === 'shrimpy-level' && modeIdRef.current === 'typing-rush') void openLockQuiz(3)
      else if (data.type === 'shrimpy-lose' && Date.now() - openedAt.current > 800) void openLockQuiz()
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
    setRequiredTotal(RESPAWN_CORRECT_NEEDED)
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
    setLocked(false)
    setQuiz([])
    setChoice('')
    setQuizMark(null)
    setIframeKey(0)
    router.push('/game')
  }

  function openGame(id: string) {
    setIframeKey((k) => k + 1)
    setLocked(false)
    router.push(`/game?play=${id}`)
  }

  if (mode) {
    const screen = (
      <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col bg-black">
        <button
          type="button"
          onClick={leaveGame}
          disabled={locked}
          className="absolute right-4 top-4 z-20 rounded-full bg-black/70 px-4 py-2 text-sm font-black text-white disabled:opacity-40"
        >
          ← Games
        </button>
        <div className="min-h-0 flex-1">
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
                          Get {requiredTotal} correct. {correctNeeded} remaining.
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
                            / {requiredTotal}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-1.5">
                      {Array.from({ length: requiredTotal }).map((_, i) => (
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
                        {focus === 'both' && (
                          <div className="mb-3 flex gap-2">
                            {(['SAT', 'ACT'] as const).map((exam) => (
                              <button
                                key={exam}
                                type="button"
                                onClick={() => {
                                  if (exam === style) return
                                  setStyle(exam)
                                  setQuiz([])
                                  setQuizIndex(0)
                                  setChoice('')
                                  setQuizMark(null)
                                }}
                                className={cn('rounded-full px-3 py-1 text-xs font-extrabold', style === exam ? 'bg-[#1cb0f6] text-white' : 'bg-[#f3f3f3] text-[#555]')}
                              >
                                {exam}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className={cn('rounded-2xl px-5 py-5 sm:px-6 sm:py-6', style === 'ACT' ? 'border border-[#f0d7b0] bg-[#fff8ee]' : 'border border-[#d5deea] bg-white')}>
                          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-fog">
                            {style} style · Question {quizIndex + 1}
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
                                  {officialChoiceLabel(item.label ?? item.key, style, quizIndex + 1)}
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
                              : `Incorrect · ${officialChoiceLabel(displayedChoiceLabel(quiz[quizIndex].choices, quiz[quizIndex].correct_answer), style, quizIndex + 1)}`}
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
    return typeof document === 'undefined' ? screen : createPortal(screen, document.body)
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12 pt-2">
      <div>
        <p className="max-w-2xl text-base font-bold text-[#777]">{t(language, 'gamesBody')}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MODES.map((game) => (
          <GameCard key={game.id} game={game} playLabel={t(language, 'play')} onPlay={() => openGame(game.id)} />
        ))}
      </div>
    </div>
  )
}

function GameCard({ game, playLabel, onPlay }: { game: GameMode; playLabel: string; onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative overflow-hidden rounded-[1.75rem] text-left shadow-[0_14px_0_#111827] transition hover:-translate-y-1"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#070b16]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={game.cover} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-16">
          <h3 className="font-display text-3xl text-white">{game.title}</h3>
          <p className="mt-1 text-sm font-semibold text-white/80">{game.blurb}</p>
          <span className="mt-3 inline-flex rounded-full bg-white px-4 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-black">{playLabel}</span>
        </div>
      </div>
    </button>
  )
}
