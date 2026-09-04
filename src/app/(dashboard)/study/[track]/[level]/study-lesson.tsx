'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Companion } from '@/components/ui/companion'
import { HighlightedText, TutorRichText } from '@/components/practice/question-prompt'
import { MathDiagram } from '@/components/practice/math-diagram'
import { cn } from '@/lib/utils'
import { asSteps, pickHighlight, type StudyStep } from '@/lib/study/highlight'
import { tagDifficulties, type StudyLevel, type StudyProblem, type StudyTrack } from '@/lib/study/levels'
import { StudyTimer } from '@/components/ui/study-timer'
import { formatStudyClock } from '@/lib/study/clock'

type LessonPayload = {
  title: string
  example: string
  teach: StudyStep[]
  tricks: StudyStep[]
  problems: StudyProblem[]
}

export function StudyLesson({ track, level }: { track: StudyTrack; level: StudyLevel }) {
  const router = useRouter()
  const [lesson, setLesson] = React.useState<LessonPayload>({
    title: level.title,
    example: level.example,
    teach: asSteps(level.teach, level.teach),
    tricks: asSteps(level.tricks, level.tricks),
    problems: tagDifficulties(level.problems),
  })
  const [phase, setPhase] = React.useState<'teach' | 'practice'>('teach')
  const [stepIndex, setStepIndex] = React.useState(0)
  const [index, setIndex] = React.useState(0)
  const [choice, setChoice] = React.useState('')
  const [checked, setChecked] = React.useState(false)
  const [times, setTimes] = React.useState<number[]>([])
  const started = React.useRef(Date.now())
  const extraOnce = React.useRef(false)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [studiedSeconds, setStudiedSeconds] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    void fetch('/api/study/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ track, level: level.index }),
    })
      .then((res) => res.json() as Promise<{ example?: string; teach?: unknown; tricks?: unknown; problems?: StudyProblem[] }>)
      .then((data) => {
        if (cancelled) return
        setLesson({
          title: level.title,
          example: data.example || level.example,
          teach: asSteps(data.teach, level.teach),
          tricks: asSteps(data.tricks, level.tricks),
          problems: tagDifficulties(data.problems?.length ? data.problems : level.problems),
        })
        setStepIndex(0)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [track, level])

  const steps: StudyStep[] = [...lesson.teach, ...lesson.tricks]
  const step = steps[stepIndex]
  const highlight = step ? (step.highlight?.trim() || pickHighlight(lesson.example, step.text)) : undefined
  const problem = lesson.problems[index]
  const correct = checked && choice === problem?.answer
  const lastTeach = stepIndex >= steps.length - 1

  async function finish(more: boolean) {
    if (more && !extraOnce.current) {
      extraOnce.current = true
      const extra = await fetch('/api/study/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, level: level.index, extra: true }),
      }).then((res) => res.json() as Promise<{ problems?: StudyProblem[] }>).catch(() => null)
      if (extra?.problems?.length) {
        const more = extra.problems
        setLesson((prev) => ({ ...prev, problems: [...prev.problems, ...tagDifficulties(more)] }))
        setIndex((prev) => prev + 1)
        setChoice('')
        setChecked(false)
        started.current = Date.now()
        return
      }
    }
    setSaving(true)
    setSaveError('')
    const payload = { track, level: level.index, status: 'completed' as const }
    let saved = false
    for (let attempt = 0; attempt < 2 && !saved; attempt++) {
      const res = await fetch('/api/study/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null)
      const data = res ? await res.json() as { success?: boolean; row?: { status?: string } } : null
      saved = Boolean(res?.ok && data?.success && data.row?.status === 'completed')
    }
    if (!saved) {
      setSaving(false)
      setSaveError('Could not save this level. Try Finish again.')
      return
    }
    router.push('/study')
    router.refresh()
  }

  function onCheck() {
    if (!choice || checked) return
    const elapsed = Math.max(1, Math.round((Date.now() - started.current) / 1000))
    setTimes((prev) => [...prev, elapsed])
    setChecked(true)
  }

  function onNext() {
    const first = times[0] ?? 1
    const last = times[times.length - 1] ?? first
    const slower = last > first * 1.5
    if (index + 1 < lesson.problems.length) {
      setIndex((prev) => prev + 1)
      setChoice('')
      setChecked(false)
      started.current = Date.now()
      return
    }
    void finish(slower)
  }

  function onTeachNext() {
    if (!lastTeach) {
      setStepIndex((prev) => prev + 1)
      return
    }
    setPhase('practice')
    started.current = Date.now()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pt-2 pb-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
        {track} · Level {level.index}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{lesson.title}</h1>
        <StudyTimer running label="Studied" onSeconds={setStudiedSeconds} />
      </div>
      <Companion
        mode={phase === 'teach' ? 'studying' : correct ? 'success' : checked ? 'warning' : 'studying'}
        message={phase === 'teach'
          ? `${step?.text ?? 'First look, then I break it down.'} Timer: ${formatStudyClock(studiedSeconds)}.`
          : `This one is ${problem?.difficulty ?? 'easy'}. Same idea. You have been on this lesson ${formatStudyClock(studiedSeconds)}.`}
      />

      {phase === 'teach' && step ? (
        <div className="neu space-y-4 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">Example</p>
          <HighlightedText text={lesson.example} highlight={highlight} className="text-lg" />
          <MathDiagram text={lesson.example} focus={highlight} />
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
            {stepIndex < lesson.teach.length ? 'What it means' : 'Hack'} · {stepIndex + 1} of {steps.length}
          </p>
          <div className="neu-sm rounded-2xl px-4 py-3 text-sm">
            <HighlightedText text={step.text} highlight={highlight} />
          </div>
          <Button className="w-full" onClick={onTeachNext} disabled={loading}>
            {lastTeach ? 'Try 3 problems' : 'Next'}
          </Button>
        </div>
      ) : problem ? (
        <div className="neu space-y-4 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-fog">
            Problem {index + 1} of {lesson.problems.length} · {problem.difficulty ?? 'easy'}
          </p>
          <TutorRichText text={problem.prompt} className="text-base" />
          <div className="grid gap-2">
            {problem.choices.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => !checked && setChoice(item.key)}
                className={cn(
                  'rounded-2xl px-4 py-3 text-left text-sm',
                  choice === item.key ? 'neu-raised text-white' : 'neu-sm',
                  checked && item.key === problem.answer && 'bg-ok/20',
                  checked && choice === item.key && item.key !== problem.answer && 'bg-bad/20'
                )}
              >
                <span className="mr-2 font-mono text-[10px]">{item.key}</span>
                {item.text}
              </button>
            ))}
          </div>
          {checked && (
            <p className="text-sm text-fog">
              {correct ? 'Yes. ' : 'Not that one. '}
              <TutorRichText text={problem.explain} />
            </p>
          )}
          {!checked ? (
            <Button className="w-full" onClick={onCheck} disabled={!choice}>Check</Button>
          ) : (
            <Button className="w-full" onClick={onNext} loading={saving}>
              {index + 1 < lesson.problems.length ? 'Next' : 'Finish lesson'}
            </Button>
          )}
          {saveError && <p className="text-sm text-bad">{saveError}</p>}
        </div>
      ) : null}
    </div>
  )
}
