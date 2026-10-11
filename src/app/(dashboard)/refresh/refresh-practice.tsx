'use client'
import * as React from 'react'
import Link from 'next/link'
import type { BookletMark, BookletQuestion } from '@/components/practice/test-booklet'
import { ReviewCoach } from '@/components/refresh/review-coach'
import { refreshBucket } from '@/lib/study/refresh'
import type { StudyLevel } from '@/lib/study/levels'
import { cn } from '@/lib/utils'
import { ArrowLeft, CheckCircle2, Circle, Flame, RotateCcw, Sparkles, Trophy } from 'lucide-react'

const ROUND_SIZE = 30

type BankQuestion = {
  id: string
  question_text: string
  choices: Array<{ key: string; text: string }>
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic_id: string | null
  topic_name: string | null
  section_name: string | null
  test_type: string | null
  question_type: string | null
  passage_title: string | null
  passage_content: string | null
  image_url: string | null
  official_explanation: string | null
}

function progressKey(level: StudyLevel): string {
  return `refresh-rounds:${level.track}:${level.index}`
}

function loadProgress(level: StudyLevel): { completed: number[]; rounds: Record<string, string[]> } {
  try {
    const raw = localStorage.getItem(progressKey(level))
    if (!raw) return { completed: [], rounds: {} }
    const data = JSON.parse(raw) as { completed?: number[]; rounds?: Record<string, string[]> }
    return { completed: Array.isArray(data.completed) ? data.completed : [], rounds: data.rounds ?? {} }
  } catch {
    return { completed: [], rounds: {} }
  }
}

function saveProgress(level: StudyLevel, completed: number[], rounds: Record<string, string[]>) {
  try {
    localStorage.setItem(progressKey(level), JSON.stringify({ completed, rounds }))
  } catch {
    // Private mode — progress just won't persist.
  }
}

function toBooklet(q: BankQuestion, level: StudyLevel, index: number): BookletQuestion {
  return {
    id: q.id || `refresh-${level.track}-${level.index}-${index}`,
    question_text: q.question_text,
    choices: q.choices,
    correct_answer: q.correct_answer,
    difficulty: q.difficulty ?? 'medium',
    topic_id: q.topic_id,
    topic_name: q.topic_name ?? level.title,
    section_name: q.section_name ?? level.category,
    test_type: q.test_type ?? (level.sat ? 'SAT' : 'ACT'),
    question_type: q.question_type,
    passage_title: q.passage_title,
    passage_content: q.passage_content,
    image_url: q.image_url,
    official_explanation: q.official_explanation,
  }
}

export function RefreshPractice({level}:{level:StudyLevel}) {
  const [marks,setMarks] = React.useState<Record<string,BookletMark>>({})
  const [questions,setQuestions] = React.useState<BookletQuestion[]>([])
  const [loading,setLoading] = React.useState(true)
  const [loadError,setLoadError] = React.useState('')
  const [completed,setCompleted] = React.useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    return loadProgress(level).completed
  })
  const [storedRounds,setStoredRounds] = React.useState<Record<string, string[]>>(() => {
    if (typeof window === 'undefined') return {}
    return loadProgress(level).rounds
  })
  const [round,setRound] = React.useState<number>(() => {
    if (typeof window === 'undefined') return 1
    const done = loadProgress(level).completed
    return done.length ? Math.max(...done) + 1 : 1
  })
  const [advanced,setAdvanced] = React.useState(false)

  const loadRound = React.useCallback(async (roundNo: number, knownRounds: Record<string, string[]>) => {
    setLoading(true)
    setLoadError('')
    setMarks({})
    setAdvanced(false)
    try {
      const storedIds = knownRounds[String(roundNo)]
      let list: BankQuestion[]
      if (storedIds?.length) {
        const res = await fetch('/api/refresh/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track: level.track, level: level.index, round: roundNo, roundIds: storedIds }),
        })
        const data = await res.json() as { questions?: BankQuestion[]; error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? 'Could not load round')
        list = data.questions ?? []
      } else {
        const excludeIds = Object.entries(knownRounds)
          .filter(([key]) => Number(key) < roundNo)
          .flatMap(([, ids]) => ids)
        const res = await fetch('/api/refresh/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track: level.track, level: level.index, count: ROUND_SIZE, round: roundNo, excludeIds }),
        })
        const data = await res.json() as { questions?: BankQuestion[]; error?: string }
        if (!res.ok || data.error) throw new Error(data.error ?? 'Could not load round')
        list = data.questions ?? []
      }
      if (!list.length) {
        setQuestions([])
        setLoadError('No challenge questions are ready for this topic yet. Open tutoring while the bank is expanded.')
      } else {
        setQuestions(list.map((q, index) => toBooklet(q, level, index)))
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load round')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }, [level])

  // Load whenever the round changes.
  React.useEffect(() => {
    void loadRound(round, storedRounds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  const scored=questions.filter(question=>marks[question.id]).length
  const correct=questions.filter(question=>marks[question.id]?.correct).length
  const finished = questions.length > 0 && scored >= questions.length
  const builtRounds = Math.max(round, ...Object.keys(storedRounds).map(Number), 1)

  React.useEffect(() => {
    if (!finished || advanced || !questions.length) return
    setAdvanced(true)
    const rounds = { ...storedRounds, [String(round)]: questions.map((q) => q.id) }
    setStoredRounds(rounds)
    setCompleted((prev) => {
      if (prev.includes(round)) return prev
      const next = [...prev, round].sort((a, b) => a - b)
      saveProgress(level, next, rounds)
      return next
    })
  }, [finished, advanced, questions, round, storedRounds, level])

  return <div className="mx-auto w-full max-w-6xl space-y-6 pb-16 pt-4">
    <Link href="/refresh" className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-extrabold text-[#777] shadow-[0_3px_0_#e5e5e5]">
      <ArrowLeft className="h-4 w-4" /> All topics
    </Link>
    <header className="overflow-hidden rounded-[2rem] bg-[#111827] p-6 text-white shadow-[0_10px_0_#05070c]">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-white/75">
            <Sparkles className="h-4 w-4" /> Refresh · {refreshBucket(level)} · Round {round}
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-tight">{level.title}</h1>
          <p className="mt-2 text-sm font-bold text-white/70">
            {loading ? `Building Round ${round}…` : 'Write the steps on the lines. The AI does them on the question.'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="font-display text-3xl">{correct}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">correct</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="font-display text-3xl">{scored}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">checked</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <p className="font-display text-3xl">{questions.length || ROUND_SIZE}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/55">questions</p>
          </div>
        </div>
      </div>
    </header>

    <div className="rounded-[1.75rem] border-4 border-[#e5e5e5] bg-white p-4 shadow-[0_7px_0_#e5e5e5]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-2xl text-[#3c3c3c]">Rounds</p>
        <p className="inline-flex items-center gap-2 rounded-full bg-[#fff2df] px-3 py-1 text-xs font-extrabold text-[#c27000]">
          <Flame className="h-4 w-4" /> New round = new hard questions
        </p>
      </div>
    <div className="flex flex-wrap items-center gap-2" aria-label="Rounds">
      {Array.from({ length: Math.max(builtRounds, round) }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setRound(n)}
          aria-current={n === round ? 'page' : undefined}
          className={cn(
            'flex h-11 min-w-11 items-center justify-center rounded-2xl px-3 font-mono text-xs font-bold transition active:translate-y-0.5',
            n === round
              ? 'bg-[#1cb0f6] text-white shadow-[0_4px_0_#1899d6]'
              : completed.includes(n)
                ? 'border-2 border-[#58cc02] bg-[#edffe6] text-[#46a302] shadow-[0_4px_0_#c8efb8]'
                : 'border-2 border-[#e5e5e5] bg-white text-[#777] shadow-[0_4px_0_#e5e5e5] hover:text-[#3c3c3c]',
          )}
        >
          {completed.includes(n) ? <span className="inline-flex items-center gap-1">R{n}<CheckCircle2 className="h-4 w-4" /></span> : `R${n}`}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setRound(Math.max(builtRounds, round) + 1)}
        className="flex h-11 items-center rounded-2xl border-2 border-dashed border-[#d7d7d7] px-3 font-mono text-xs font-bold text-[#777] hover:text-[#3c3c3c]"
      >
        + New round
      </button>
    </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border-4 border-[#e5e5e5] bg-white p-4 shadow-[0_6px_0_#e5e5e5]">
      <p role="status" className={finished?'inline-flex items-center gap-2 text-sm font-extrabold text-[#46a302]':'inline-flex items-center gap-2 text-sm font-extrabold text-[#777]'}>
        {finished ? <Trophy className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
        {finished ? `Round ${round} complete · ${correct}/${scored} correct` : scored?`${correct}/${scored} checked`:'Write a plan, then let the AI follow it'}
      </p>
    </div>

    {finished && (
      <div className="rounded-[2rem] border-4 border-[#58cc02] bg-[#edffe6] p-5 text-center shadow-[0_8px_0_#c8efb8]">
        <p className="font-display text-3xl text-[#3c3c3c]">Round {round} done — {correct}/{scored}</p>
        <p className="mt-1 text-sm font-bold text-[#777]">Round {round + 1} continues this topic with up to 30 more questions.</p>
        <button
          type="button"
          onClick={() => setRound(round + 1)}
          className="mt-3 rounded-2xl bg-[#58cc02] px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_4px_0_#46a302] active:translate-y-1 active:shadow-none"
        >
          Start Round {round + 1} →
        </button>
      </div>
    )}

    {loading ? <div className="rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-6 shadow-[0_8px_0_#e5e5e5]" role="status">
      <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[#777]"><RotateCcw className="h-4 w-4 animate-spin" /> Building Round {round}: pulling the hardest aligned questions…</p>
    </div> : loadError ? <div className="rounded-2xl border border-line bg-white p-6">
      <p className="text-sm text-fog">{loadError}</p>
      <button type="button" onClick={() => void loadRound(round, storedRounds)} className="mt-3 text-sm font-semibold text-signal">Retry</button>
    </div> : questions.length ? (
      <ReviewCoach
        questions={questions}
        onGraded={(id, correct) => {
          setMarks((previous) => ({ ...previous, [id]: { correct, why: '' } }))
        }}
      />
    ) : <p className="text-sm text-fog">This topic’s question set is being prepared. You can review the lesson below.</p>}
    <details className="rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-5 shadow-[0_8px_0_#e5e5e5]">
      <summary className="cursor-pointer font-display text-2xl text-[#3c3c3c]">Review this topic</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm font-bold text-[#3c3c3c]">{level.teach.map((text,index)=><li key={index}>{text}</li>)}</ul>
      <Link href={`/study/${level.track}/${level.index}`} className="mt-4 inline-block rounded-2xl bg-[#1cb0f6] px-4 py-2 text-sm font-extrabold text-white shadow-[0_4px_0_#1899d6]">Open in tutoring →</Link>
    </details>
  </div>
}
