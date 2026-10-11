'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TutorRichText } from '@/components/practice/question-prompt'
import { buildGuidedLesson, type GuidedLesson } from '@/lib/study/lesson-flow'
import type { StudyLevel, StudyProblem, StudyTrack } from '@/lib/study/levels'

const STEPS = [
  'What you are learning', 'Why it is useful', 'Three correct examples', 'Three incorrect examples',
  'Tip and breakdown', 'First five questions', 'The next layer', 'Why the new layer matters',
  'How the ideas connect', 'Three connected examples', 'Three connected traps',
  'Second five questions', 'Create a question',
] as const
const EXAMPLE_STEPS = new Set([2, 3, 9, 10])

function oneSentence(value: string) {
  const text = value.trim().split(/(?<=[.!?])\s+/)[0] ?? value
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function validProblems(items: StudyProblem[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const signature = item.prompt.trim().toLowerCase()
    if (!signature || seen.has(signature) || item.choices.length !== 4 ||
        new Set(item.choices.map((choice) => choice.key)).size !== 4 ||
        !item.choices.some((choice) => choice.key === item.answer)) return false
    seen.add(signature)
    return true
  })
}

export function StudyLessonV2({ track, level, initialPhase = 0 }: {
  track: StudyTrack
  level: StudyLevel
  initialPhase?: number
}) {
  const router = useRouter()
  const [lesson, setLesson] = React.useState<GuidedLesson>(() => buildGuidedLesson(level))
  const [phase, setPhase] = React.useState(Math.max(0, Math.min(12, initialPhase)))
  const [example, setExample] = React.useState(0)
  const [chatOpen, setChatOpen] = React.useState(false)
  const [quiz, setQuiz] = React.useState<StudyProblem[]>([])
  const [quizIndex, setQuizIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<string[]>([])
  const [selected, setSelected] = React.useState('')
  const [locked, setLocked] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [createPrompt, setCreatePrompt] = React.useState('')
  const [createChoices, setCreateChoices] = React.useState(['', '', '', ''])
  const [createAnswer, setCreateAnswer] = React.useState('A')
  const [createExplanation, setCreateExplanation] = React.useState('')
  const [createScore, setCreateScore] = React.useState<number | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let live = true
    void fetch('/api/study/lesson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track, level: level.index }) })
      .then((response) => response.ok ? response.json() as Promise<Partial<GuidedLesson>> : null)
      .then((data) => { if (live && data) setLesson(buildGuidedLesson(level, data)) })
      .catch(() => undefined)
    return () => { live = false }
  }, [track, level])

  React.useEffect(() => {
    if (phase !== 5 && phase !== 11) return
    let live = true
    setLoading(true)
    setMessage('')
    const extra = phase === 11
    void fetch('/api/study/lesson', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ track, level: level.index, extra }) })
      .then((response) => response.ok ? response.json() as Promise<Partial<GuidedLesson>> : null)
      .then((data) => {
        if (!live) return
        const pool = validProblems(data?.problems ?? lesson.problems)
        const first = new Set(lesson.problems.map((item) => item.prompt.trim().toLowerCase()))
        const distinct = extra ? pool.filter((item) => !first.has(item.prompt.trim().toLowerCase())) : pool
        setQuiz((distinct.length >= 5 ? distinct : pool).slice(0, 5))
      })
      .catch(() => { if (live) setQuiz(validProblems(lesson.problems).slice(0, 5)) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [phase, track, level.index, lesson.problems])

  async function persist(next: number, complete = false) {
    try {
      const response = await fetch('/api/study/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track, level: level.index, status: complete ? 'completed' : 'in_progress', lesson_step: complete ? null : `v2:${next}`, lesson_beat: 0 }),
      })
      if (!response.ok) throw new Error('Save failed')
      if (complete) router.push('/study')
    } catch { setMessage('Your progress could not be saved. Please try again.') }
  }

  function advance() {
    if (EXAMPLE_STEPS.has(phase) && example < 2) { setExample(example + 1); return }
    if (phase === 12) return
    const next = phase + 1
    setPhase(next); setExample(0); setQuizIndex(0); setAnswers([]); setSelected(''); setLocked(false); setMessage('')
    void persist(next)
  }

  function resetQuiz() {
    setQuizIndex(0); setAnswers([]); setSelected(''); setLocked(false)
    setMessage('You need at least 4 of 5 correct to continue. Try these again after reviewing the explanations.')
  }

  function nextQuestion() {
    if (!locked) return
    const updated = [...answers, selected]
    if (quizIndex < 4) { setAnswers(updated); setQuizIndex(quizIndex + 1); setSelected(''); setLocked(false); return }
    const correct = updated.filter((answer, index) => answer === quiz[index]?.answer).length
    if (correct >= 4) { setMessage(`${correct}/5 correct — you passed.`); advance() }
    else resetQuiz()
  }

  async function submitCreated() {
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/study/grade-created-question', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        track, level: level.index, prompt: createPrompt,
        choices: createChoices.map((text, index) => ({ key: 'ABCD'[index], text })), answer: createAnswer, explanation: createExplanation,
      }) })
      const data = await response.json() as { score?: number; feedback?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Could not grade this question')
      setCreateScore(data.score ?? 0)
      setMessage(data.feedback ?? '')
      if ((data.score ?? 0) >= 70) await persist(12, true)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.') }
    finally { setSaving(false) }
  }

  const nextLayer = lesson.stages[1] ?? lesson.stages[0]
  const connectedGood = lesson.connections?.yes ?? Array.from({ length: 3 }, (_, index) => ({
    label: nextLayer?.workedExamples[index % Math.max(1, nextLayer.workedExamples.length)] ?? lesson.examples.yes[index]?.label ?? '',
    why: `${nextLayer?.title ?? lesson.title} builds on ${lesson.title} by using ${nextLayer?.newSkills[0] ?? 'the same rule'}.`,
  }))
  const connectedBad = lesson.connections?.no ?? lesson.examples.no.slice(0, 3).map((item) => ({
    label: item.label,
    why: `${oneSentence(item.why)} Check this mistake before applying ${nextLayer?.title ?? 'the new layer'}.`,
  }))
  const displayedExample = phase === 2 ? lesson.examples.yes[example] : phase === 3 ? lesson.examples.no[example] : phase === 9 ? connectedGood[example] : connectedBad[example]
  const question = quiz[quizIndex]
  const progress = Math.round(((phase + (EXAMPLE_STEPS.has(phase) ? example / 3 : 0)) / STEPS.length) * 100)

  return <div className={`mx-auto grid w-full gap-5 pb-16 pt-3 ${chatOpen ? 'max-w-[1500px] lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]' : 'max-w-3xl'}`}>
    <main className="min-w-0 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-extrabold uppercase tracking-widest text-[#777]">{track === 'math' ? 'Math' : 'English'} · Step {phase + 1} of 13</p><h1 className="mt-1 font-display text-3xl text-[#333]">{lesson.title}</h1></div>
        <button type="button" onClick={() => setChatOpen(!chatOpen)} className="inline-flex shrink-0 items-center gap-2 rounded-2xl border-2 border-[#1cb0f6] bg-[#e8f6ff] px-4 py-3 font-bold text-[#087caf]"><MessageCircle size={18} /> Chat</button>
      </header>
      <div className="h-3 overflow-hidden rounded-full bg-[#e5e5e5]"><div className="h-full rounded-full bg-[#58cc02] transition-all" style={{ width: `${progress}%` }} /></div>
      <section className="rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-5 shadow-[0_7px_0_#e5e5e5] sm:p-8">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#1cb0f6]">{STEPS[phase]}</p>
        {phase === 0 && <p className="mt-5 text-xl font-bold leading-relaxed text-[#333]">{oneSentence(lesson.whatItIs)}</p>}
        {phase === 1 && <p className="mt-5 text-xl font-bold leading-relaxed text-[#333]">{lesson.irlExample}</p>}
        {EXAMPLE_STEPS.has(phase) && displayedExample && <div className="mt-5 space-y-4"><p className="text-sm font-extrabold text-[#777]">Example {example + 1} of 3</p><div className="rounded-2xl bg-[#f7f7f7] p-5 text-xl font-bold text-[#333]"><TutorRichText text={displayedExample.label} /></div><p className="text-base text-[#555]">{oneSentence(displayedExample.why)}</p></div>}
        {phase === 4 && <div className="mt-5 space-y-4"><p className="text-xl font-bold text-[#333]">{lesson.breakdown}</p><p className="rounded-2xl bg-[#fff3e8] p-5 text-base text-[#444]">Tip: {level.tricks[0] ?? 'Identify what the question asks before choosing a method.'}</p><p className="text-base text-[#555]">Work through: <TutorRichText text={lesson.translateExample} /></p></div>}
        {phase === 6 && <div className="mt-5 space-y-4"><p className="text-xl font-bold text-[#333]">{nextLayer?.title}</p><p className="text-base text-[#555]">New idea: {nextLayer?.newSkills.join(', ')}</p></div>}
        {phase === 7 && <p className="mt-5 text-xl leading-relaxed text-[#333]">{nextLayer?.explanation}</p>}
        {phase === 8 && <div className="mt-5 space-y-4"><p className="text-xl font-bold text-[#333]">Use what you learned about {lesson.title}, then apply {nextLayer?.title?.toLowerCase()}.</p><p className="text-base text-[#555]">{nextLayer?.explanation}</p></div>}
        {(phase === 5 || phase === 11) && <p className="mt-5 text-sm font-semibold text-[#777]">Pass mark: 70% (at least 4 of 5 correct).</p>}
        {(phase === 5 || phase === 11) && <div className="mt-5 space-y-4">{loading ? <p>Preparing five questions…</p> : question ? <><p className="text-sm font-extrabold text-[#777]">Question {quizIndex + 1} of 5 · {quizIndex === 0 ? 'Easy start' : quizIndex === 4 ? 'Hardest' : 'Getting harder'}</p><p className="text-xl font-bold leading-relaxed text-[#333]"><TutorRichText text={question.prompt} /></p><div className="grid gap-2">{question.choices.map((choice) => <button type="button" key={choice.key} onClick={() => !locked && setSelected(choice.key)} className={`rounded-2xl border-2 p-4 text-left font-semibold ${selected === choice.key ? 'border-[#1cb0f6] bg-[#e8f6ff]' : 'border-[#e5e5e5] bg-white'} ${locked && choice.key === question.answer ? '!border-[#58cc02] !bg-[#edffe6]' : ''}`}><span className="mr-3 font-bold">{choice.key}.</span><TutorRichText text={choice.text} /></button>)}</div>{locked && <p className="rounded-2xl bg-[#f7f7f7] p-4 text-sm text-[#444]"><TutorRichText text={question.explain} /></p>}{!locked ? <Button onClick={() => setLocked(true)} disabled={!selected}>Check answer</Button> : <Button onClick={nextQuestion}>Next question</Button>}</> : <p>Five valid questions are not available right now. Try loading again.</p>}</div>}
        {phase === 12 && <div className="mt-5 space-y-4"><p className="text-base text-[#555]">Create a four-choice question that combines the original idea and the new layer. Score 70 or higher to pass.</p><textarea aria-label="Your question" value={createPrompt} onChange={(event) => setCreatePrompt(event.target.value)} placeholder="Write your question…" className="min-h-28 w-full rounded-2xl border-2 border-[#ddd] p-4" /><div className="grid gap-2">{createChoices.map((value, index) => <label key={index} className="flex items-center gap-2"><button type="button" onClick={() => setCreateAnswer('ABCD'[index])} className={`w-10 rounded-xl p-2 font-bold ${createAnswer === 'ABCD'[index] ? 'bg-[#1cb0f6] text-white' : 'bg-[#eee]'}`}>{'ABCD'[index]}</button><input aria-label={`Choice ${'ABCD'[index]}`} value={value} onChange={(event) => setCreateChoices((prior) => prior.map((item, i) => i === index ? event.target.value : item))} className="w-full rounded-xl border-2 border-[#ddd] p-3" /></label>)}</div><textarea aria-label="Explain the answer" value={createExplanation} onChange={(event) => setCreateExplanation(event.target.value)} placeholder="Explain why your answer works…" className="min-h-24 w-full rounded-2xl border-2 border-[#ddd] p-4" />{createScore !== null && <p className="font-bold">Score: {createScore}/100</p>}<Button onClick={() => void submitCreated()} disabled={saving || createPrompt.trim().length < 12 || createChoices.some((choice) => !choice.trim())}>{saving ? 'Checking…' : 'Grade my question'}</Button></div>}
        {message && <p role="status" className="mt-4 rounded-xl bg-[#fff3e8] p-3 text-sm text-[#555]">{message}</p>}
        {phase !== 5 && phase !== 11 && phase !== 12 && <Button className="mt-7 w-full" onClick={advance}>{EXAMPLE_STEPS.has(phase) && example < 2 ? 'Next example' : 'Continue'}</Button>}
      </section>
    </main>
    {chatOpen && <aside className="min-w-0 overflow-hidden rounded-[2rem] border-4 border-[#e5e5e5] bg-white lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]"><div className="flex items-center justify-between border-b border-[#eee] px-4 py-3"><p className="font-bold">Chat with your agent</p><button type="button" onClick={() => setChatOpen(false)} aria-label="Close chat"><X size={20} /></button></div><iframe title="Agent chat" src="/chat?embedded=1" className="h-[650px] w-full lg:h-[calc(100%-54px)]" /></aside>}
  </div>
}
