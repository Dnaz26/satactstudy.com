'use client'

import * as React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuestionTimer } from '@/components/ui/question-timer'
import { AiTutorPanel } from '@/components/ui/ai-tutor-panel'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { cn, formatTime } from '@/lib/utils'
import { MISTAKE_TAGS } from '@/lib/constants'
import {
  ChevronRight,
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle,
  SkipForward,
} from 'lucide-react'

interface Question {
  id: string
  question_text: string
  choices: Array<{ key: string; text: string }>
  correct_answer: string
  difficulty: 'easy' | 'medium' | 'hard'
  topic_id: string | null
  topic_name: string | null
}

interface Explanation {
  why: string
  steps: string[]
  answer: string
  common_trap: string
}

function SessionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const testType = searchParams.get('testType') ?? 'SAT'
  const topicId = searchParams.get('topicId') ?? ''
  const difficulty = searchParams.get('difficulty') ?? 'mixed'
  const count = Number(searchParams.get('count') ?? 10)
  const isTimed = searchParams.get('timed') === '1'

  const [questions, setQuestions] = React.useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)
  const [explanation, setExplanation] = React.useState<Explanation | null>(null)
  const [loadingExplanation, setLoadingExplanation] = React.useState(false)
  const [mistakeTag, setMistakeTag] = React.useState<string>('')
  const [aiPanelOpen, setAiPanelOpen] = React.useState(false)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [elapsed, setElapsed] = React.useState(0)
  const [timerRunning, setTimerRunning] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [results, setResults] = React.useState<Array<{ questionId: string; isCorrect: boolean; timeSeconds: number }>>([])

  React.useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    try {
      const params = new URLSearchParams({
        testType,
        topicId,
        difficulty,
        count: String(count),
      })
      const res = await fetch(`/api/practice/questions?${params.toString()}`)
      const data = await res.json() as { questions?: Question[]; sessionId?: string; error?: string }

      if (!res.ok || data.error) {
        setError(data.error ?? 'Failed to load questions')
        setLoading(false)
        return
      }

      setQuestions(data.questions ?? [])
      setSessionId(data.sessionId ?? null)
      setTimerRunning(true)
      setLoading(false)
    } catch (err) {
      setError('Failed to load questions. Please try again.')
      setLoading(false)
    }
  }

  const currentQ = questions[currentIndex]
  const isLast = currentIndex === questions.length - 1

  async function handleSubmit() {
    if (!selected || !currentQ) return
    setTimerRunning(false)
    setSubmitted(true)
    const isCorrect = selected === currentQ.correct_answer

    setResults((prev) => [
      ...prev,
      { questionId: currentQ.id, isCorrect, timeSeconds: elapsed },
    ])

    setLoadingExplanation(true)
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQ.id,
          questionText: currentQ.question_text,
          correctAnswer: currentQ.correct_answer,
          topicName: currentQ.topic_name ?? 'General',
        }),
      })
      const data = await res.json() as { explanation?: Explanation }
      if (data.explanation) setExplanation(data.explanation)
    } catch {
      // non-critical
    } finally {
      setLoadingExplanation(false)
    }

    await fetch('/api/practice/attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: currentQ.id,
        topicId: currentQ.topic_id,
        sessionId,
        selectedAnswer: selected,
        isCorrect,
        timeSeconds: elapsed,
        difficulty: currentQ.difficulty,
        mistakeTag: mistakeTag || undefined,
      }),
    })
  }

  async function handleNext() {
    if (isLast) {
      const correctCount = results.filter((r) => r.isCorrect).length + (selected === currentQ?.correct_answer ? 1 : 0)
      router.push(`/practice/results?correct=${correctCount}&total=${questions.length}&sessionId=${sessionId ?? ''}`)
      return
    }
    setCurrentIndex(currentIndex + 1)
    setSelected(null)
    setSubmitted(false)
    setExplanation(null)
    setMistakeTag('')
    setElapsed(0)
    setTimerRunning(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading questions..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-12 h-12 text-bad mx-auto mb-4" />
        <h2 className="text-xl font-bold text-paper mb-2">Oops!</h2>
        <p className="text-fog mb-6">{error}</p>
        <Button onClick={() => router.push('/practice')}>Back to Practice</Button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-paper mb-2">No questions found</h2>
        <p className="text-fog mb-6">Try adjusting your filters or selecting a different topic.</p>
        <Button onClick={() => router.push('/practice')}>Back to Practice</Button>
      </div>
    )
  }

  const choices = currentQ.choices ?? []

  return (
    <div className={cn('max-w-3xl mx-auto space-y-6', aiPanelOpen && 'pr-84')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-fog">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <Badge variant={
            currentQ.difficulty === 'hard' ? 'danger' :
            currentQ.difficulty === 'medium' ? 'warning' : 'success'
          } className="capitalize">
            {currentQ.difficulty}
          </Badge>
          <Badge variant="secondary">{currentQ.topic_name}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <QuestionTimer
            mode="countup"
            running={timerRunning}
            onTick={setElapsed}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
          >
            <Bot className="w-4 h-4 mr-1" />
            Nova
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-transparent neu p-6">
        <p className="mb-6 whitespace-pre-wrap text-base leading-relaxed text-paper">{currentQ.question_text}</p>

        <div className="space-y-2.5">
          {choices.map(({ key: letter, text }) => {
            const isSelected = selected === letter
            const isCorrectChoice = submitted && letter === currentQ.correct_answer
            const isWrong = submitted && isSelected && !isCorrectChoice

            return (
              <button
                key={letter}
                onClick={() => !submitted && setSelected(letter)}
                disabled={submitted}
                className={cn(
                  'w-full flex items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-all',
                  !submitted && !isSelected && 'neu-sm',
                  !submitted && isSelected && 'neu-raised text-white',
                  submitted && isCorrectChoice && 'neu-sm text-ok',
                  submitted && isWrong && 'neu-sm text-bad',
                  submitted && !isCorrectChoice && !isWrong && 'neu-inset opacity-50',
                )}
              >
                <span className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold',
                  isCorrectChoice ? 'neu-sm text-ok' :
                  isWrong ? 'neu-sm text-bad' :
                  isSelected ? 'neu-raised text-white' :
                  'text-fog'
                )}>
                  {letter}
                </span>
                <span className={cn(
                  'flex-1 text-paper',
                  isWrong && 'text-bad',
                  isCorrectChoice && 'text-ok',
                )}>
                  {text}
                </span>
                {submitted && isCorrectChoice && <CheckCircle className="w-4 h-4 text-ok flex-shrink-0 mt-0.5" />}
                {submitted && isWrong && <XCircle className="w-4 h-4 text-bad flex-shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>

        {!submitted && (
          <Button
            className="w-full mt-5"
            onClick={handleSubmit}
            disabled={!selected}
          >
            Submit Answer
          </Button>
        )}
      </div>

      {submitted && (
        <div className="rounded-2xl border border-transparent neu p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            {selected === currentQ.correct_answer ? (
              <CheckCircle className="w-5 h-5 text-ok" />
            ) : (
              <XCircle className="w-5 h-5 text-bad" />
            )}
            <h3 className="font-semibold text-paper">
              {selected === currentQ.correct_answer ? 'Correct!' : `Incorrect — Answer: ${currentQ.correct_answer}`}
            </h3>
            <span className="text-xs text-fog ml-auto">{formatTime(elapsed)}</span>
          </div>

          {loadingExplanation && (
            <div className="flex items-center gap-2 text-sm text-fog">
              <LoadingSpinner size="sm" />
              Getting AI explanation...
            </div>
          )}

          {explanation && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl neu-inset border border-transparent">
                <p className="text-xs font-semibold text-signal mb-1">WHY</p>
                <p className="text-sm text-paper">{explanation.why}</p>
              </div>
              {explanation.steps.map((step, i) => (
                <div key={i} className="p-3 rounded-xl neu-inset border border-transparent">
                  <p className="text-xs font-semibold text-violet-400 mb-1">STEP {i + 1}</p>
                  <p className="text-sm text-paper">{step}</p>
                </div>
              ))}
              {explanation.common_trap && (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs font-semibold text-yellow-400 mb-1">⚠ COMMON TRAP</p>
                  <p className="text-sm text-paper">{explanation.common_trap}</p>
                </div>
              )}
            </div>
          )}

          {selected !== currentQ.correct_answer && (
            <div>
              <label className="text-xs text-fog block mb-2">Tag this mistake (optional)</label>
              <div className="flex flex-wrap gap-2">
                {MISTAKE_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => setMistakeTag(mistakeTag === tag.id ? '' : tag.id)}
                    className={cn(
                      'px-3 py-1.5 border text-xs transition-all',
                      mistakeTag === tag.id
                        ? 'border-warn/50 bg-warn/20 text-warn'
                        : 'border-line text-fog hover:border-line-hot'
                    )}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.push('/practice')} className="flex-1">
              <SkipForward className="w-4 h-4 mr-1" />
              End Session
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {isLast ? 'See Results' : 'Next Question'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <AiTutorPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        context={{
          questionText: currentQ.question_text,
          topicName: currentQ.topic_name ?? 'General',
        }}
      />
    </div>
  )
}

export default function PracticeSessionPage() {
  return (
    <React.Suspense fallback={<div className="flex items-center justify-center p-16 text-fog">Loading session…</div>}>
      <SessionContent />
    </React.Suspense>
  )
}
