'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Calculator, CheckCircle2, LockKeyhole, MessageCircle, RotateCcw, Timer, UserRound, X } from 'lucide-react'
import { TestBooklet, type BookletMark, type BookletQuestion } from '@/components/practice/test-booklet'
import { TeachingBoard } from '@/components/study/equation-board'
import { NovaCharacter } from '@/components/study/nova-character'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type FeatureId = 'tutoring' | 'rapid' | 'games' | 'practice'

const FEATURES: Array<{ id: FeatureId; title: string; blurb: string }> = [
  { id: 'tutoring', title: 'Tutoring', blurb: 'Learn with the animated Nova pencil coach.' },
  { id: 'rapid', title: 'Rapid Fire', blurb: 'Answer timed questions with instant feedback.' },
  { id: 'games', title: 'Game', blurb: 'Play first, then use questions to unlock another run.' },
  { id: 'practice', title: 'Practice Test', blurb: 'Use the real booklet with Desmos beside it.' },
]

const PRACTICE_QUESTIONS: BookletQuestion[] = [
  { id: 'landing-practice-1', question_text: 'If f(x) = x² − 4x + 1, what is f(3) − f(1)?', choices: [{ key: 'A', text: '−4' }, { key: 'B', text: '−2' }, { key: 'C', text: '0' }, { key: 'D', text: '2' }], correct_answer: 'C', difficulty: 'medium', topic_id: null, topic_name: 'Advanced Math', test_type: 'SAT' },
  { id: 'landing-practice-2', question_text: 'Which choice most logically completes the text?', choices: [{ key: 'A', text: 'As a result,' }, { key: 'B', text: 'In contrast,' }, { key: 'C', text: 'For example,' }, { key: 'D', text: 'Similarly,' }], correct_answer: 'B', difficulty: 'medium', topic_id: null, topic_name: 'Transitions', test_type: 'SAT' },
  { id: 'landing-practice-3', question_text: 'The line y = 3x + 4 is shifted down 6 units. What is the new y-intercept?', choices: [{ key: 'A', text: '−6' }, { key: 'B', text: '−2' }, { key: 'C', text: '2' }, { key: 'D', text: '10' }], correct_answer: 'B', difficulty: 'medium', topic_id: null, topic_name: 'Linear Functions', test_type: 'SAT' },
  { id: 'landing-practice-4', question_text: 'If 4a = 3b and b = 20, what is the value of a?', choices: [{ key: 'A', text: '12' }, { key: 'B', text: '15' }, { key: 'C', text: '16' }, { key: 'D', text: '24' }], correct_answer: 'B', difficulty: 'easy', topic_id: null, topic_name: 'Algebra', test_type: 'SAT' },
]

function DemoFrame({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-[570px] overflow-hidden rounded-[1.75rem] border border-line bg-ink p-4 shadow-[0_22px_50px_rgba(40,24,12,0.08)] transition-shadow hover:shadow-[0_28px_65px_rgba(40,24,12,0.13)] sm:p-6">{children}</div>
}

function UnlockRow({ unlocked, requirement, onNext, label = 'Next feature' }: { unlocked: boolean; requirement: string; onNext: () => void; label?: string }) {
  return <div className={cn('flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between', unlocked ? 'border-emerald-200 bg-emerald-50' : 'border-line bg-white')}><p className={cn('flex items-center gap-2 text-sm', unlocked ? 'text-emerald-800' : 'text-fog')}>{unlocked ? <CheckCircle2 className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4 text-signal" />}{unlocked ? 'Feature tried — next experience unlocked.' : requirement}</p><Button onClick={onNext} disabled={!unlocked}>{label}</Button></div>
}

function TutoringDemo({ onComplete }: { onComplete: () => void }) {
  const [beat, setBeat] = React.useState(0)
  const [quizAnswer, setQuizAnswer] = React.useState<string | null>(null)
  const correctExamples = [
    { label: 'y = 2x + 3', why: 'The slope is 2 and the y-intercept is 3.' },
    { label: 'y = −x + 5', why: 'The slope is −1 and the y-intercept is 5.' },
    { label: '2y = 6x − 4', why: 'Divide by 2 to get y = 3x − 2.' },
  ]
  const incorrectExamples = [
    { label: 'y = x² + 1', why: 'The squared term makes this a quadratic, not a linear function.' },
    { label: 'y = 2/x', why: 'The variable is in the denominator, so its rate of change is not constant.' },
    { label: 'y = 3ˣ', why: 'The variable is an exponent, making this an exponential function.' },
  ]
  const quiz = beat >= 6
  const correct = quizAnswer === 'B'
  const example = beat < 3 ? correctExamples[beat] : incorrectExamples[Math.min(beat - 3, 2)]
  const line = quiz
    ? correct ? 'Exactly. y = −3x + 7 has a constant slope of −3, so it is linear.' : quizAnswer ? 'Not quite. Look for an equation whose variable has an exponent of 1 and a constant rate of change.' : 'Your turn. Which equation represents a linear function?'
    : beat < 3
      ? `Correct example ${beat + 1} of 3: ${example.why}`
      : `Incorrect example ${beat - 2} of 3: ${example.why}`
  return (
    <DemoFrame>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-fog">Copilot · Math · Level 1 · Step 2 of 6</p><h3 className="mt-2 font-display text-3xl tracking-tight text-paper sm:text-4xl">Linear functions</h3></div>
          <span className="rounded-full border border-line bg-white px-4 py-2 font-mono text-xs text-fog">Studied · 00:08</span>
        </div>
        <div className="flex gap-1.5">{[0, 1, 2, 3, 4, 5, 6].map((item) => <span key={item} className={cn('h-1.5 flex-1 rounded-full transition', item <= beat ? 'bg-signal' : 'bg-black/10')} />)}</div>
        <div className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(160deg,#fff_0%,#fff5f0_55%,#ffe8df_100%)] px-4 pb-5 pt-6 shadow-[0_22px_0_rgba(0,0,0,0.05)] sm:px-6">
          <div className="relative flex items-end gap-2 sm:gap-4">
            <div className="relative z-10 -mb-1 shrink-0"><NovaCharacter mood={correct ? 'cheer' : quiz ? 'think' : beat >= 3 ? 'point' : 'talk'} size="md" className="sm:hidden" /><NovaCharacter mood={correct ? 'cheer' : quiz ? 'think' : beat >= 3 ? 'point' : 'talk'} size="lg" className="hidden sm:block" /></div>
            <div className="relative z-10 mb-10 min-w-0 flex-1">
              <div className="absolute -left-1 top-8 h-5 w-5 rotate-45 bg-white shadow-[-1px_1px_0_rgba(0,0,0,0.05)]" />
              <div className="relative rounded-[1.6rem] border border-black/8 bg-white px-5 py-4 shadow-[0_16px_0_rgba(0,0,0,0.04)]">
                <div className="mb-2 flex items-center gap-2"><p className="font-display text-lg text-paper">Nova</p><span className="rounded-full bg-signal/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">Teaching</span><MessageCircle className="ml-auto h-4 w-4 text-signal" /></div>
                <AnimatePresence mode="wait"><motion.p key={`${beat}-${quizAnswer}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="min-h-[4.5rem] text-lg leading-relaxed text-paper sm:text-xl">{line}</motion.p></AnimatePresence>
              </div>
            </div>
          </div>
        </div>
        {!quiz ? <TeachingBoard stepId={beat < 3 ? 'yesExamples' : 'noExamples'} focusSide={beat < 3 ? 'yes' : 'no'} focusLabel={example.label} examples={{ yesTitle: 'These ARE linear functions', noTitle: 'These are NOT linear functions', yes: correctExamples, no: incorrectExamples }} /> : (
          <div className="overflow-hidden rounded-[1.5rem] border border-line bg-white">
            <p className="border-b border-line px-5 py-4 font-display text-xl text-paper">Which equation represents a linear function?</p>
            <div className="divide-y divide-line">{[['A', 'y = x² − 4'], ['B', 'y = −3x + 7'], ['C', 'y = 5/x'], ['D', 'y = 2ˣ']].map(([key, text]) => <button key={key} type="button" onClick={() => setQuizAnswer(key)} className={cn('flex w-full items-center gap-3 px-5 py-4 text-left text-sm transition', quizAnswer === key && (key === 'B' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'))}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current font-mono text-xs font-semibold">{key}</span>{text}</button>)}</div>
          </div>
        )}
        {quiz ? <UnlockRow unlocked={correct} requirement="Answer the question correctly to complete the demo." onNext={onComplete} label="Back to features" /> : <div className="flex justify-end"><Button onClick={() => setBeat((current) => current + 1)}>{beat === 5 ? 'Answer a question' : 'Next example'}</Button></div>}
      </div>
    </DemoFrame>
  )
}

function PracticeDemo({ onComplete }: { onComplete: () => void }) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [marks, setMarks] = React.useState<Record<string, BookletMark>>({})
  const [focusedId, setFocusedId] = React.useState<string | null>(PRACTICE_QUESTIONS[0].id)
  const passed = Object.values(marks).some((mark) => mark.correct)
  return (
    <DemoFrame><div className="space-y-4"><div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]"><div className="max-h-[520px] overflow-y-auto"><TestBooklet testType="SAT" sectionLabel="Math · Module 1" questions={PRACTICE_QUESTIONS} answers={answers} marks={marks} focusedId={focusedId} onFocus={setFocusedId} onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))} onCheck={(id) => setMarks((current) => ({ ...current, [id]: { correct: answers[id] === PRACTICE_QUESTIONS.find((question) => question.id === id)?.correct_answer } }))} /></div><div className="overflow-hidden rounded-2xl border border-line bg-white"><div className="flex items-center justify-between border-b border-line px-4 py-3"><span className="inline-flex items-center gap-2 text-sm font-medium text-paper"><Calculator className="h-4 w-4 text-signal" /> Desmos</span><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">Live side tool</span></div><div className="relative h-[330px] bg-[#fafafa]" style={{ backgroundImage: 'linear-gradient(rgba(20,20,20,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,20,.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }}><span className="absolute inset-x-0 top-1/2 h-px bg-black/30" /><span className="absolute inset-y-0 left-1/2 w-px bg-black/30" /><svg viewBox="0 0 300 220" className="absolute inset-0 h-full w-full" aria-label="Graph of a quadratic"><path d="M20 190 Q150 -20 280 190" fill="none" stroke="#ff5c39" strokeWidth="4" /></svg></div><div className="space-y-2 p-4"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-fog">Expression 1</p><p className="rounded-xl bg-panel-2 px-3 py-2 font-mono text-sm text-paper">y = x² − 4x + 1</p><p className="text-xs leading-5 text-fog">Graph, calculate, and answer without leaving the test.</p></div></div></div><UnlockRow unlocked={passed} requirement="Choose an answer and check it correctly to complete the demo." onNext={onComplete} label="Back to features" /></div></DemoFrame>
  )
}

function RapidDemo({ onComplete }: { onComplete: () => void }) {
  const [picked, setPicked] = React.useState<string | null>(null)
  const [tool, setTool] = React.useState<string | null>(null)
  const correct = picked === 'C'
  return (
    <DemoFrame>
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <div className="space-y-3 border-b border-line pb-4">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.14em] text-fog">Rapid fire · SAT</p><p className="mt-1 text-sm text-paper">Q4 · 3 correct · 3 streak</p></div><span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 font-mono text-sm text-paper"><Timer className="h-4 w-4 text-signal" /> 00:26</span></div>
          <div className="flex gap-2 text-xs text-fog">{['Ask Nova', 'Calculator', 'Hint'].map((item) => <button key={item} onClick={() => setTool((current) => current === item ? null : item)} className={cn('rounded-full border px-3 py-2 transition', tool === item ? 'border-signal bg-signal text-white' : 'border-line bg-white hover:-translate-y-0.5 hover:text-paper')}>{item}</button>)}</div>
        </div>
        <AnimatePresence>{tool && <motion.div initial={{ opacity: 0, height: 0, y: -8 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><div className="mt-4 rounded-2xl border border-signal/20 bg-panel-2 p-4 text-sm text-paper">{tool === 'Hint' ? 'Factor 45 using two numbers that add to 14.' : tool === 'Calculator' ? 'Desmos opened: enter y = x² − 14x + 45 and inspect the x-intercepts.' : 'Nova: Start by asking which two factors of 45 add to −14.'}</div></motion.div>}</AnimatePresence>
        <p className={cn('py-5 text-sm', correct ? 'text-ok' : picked ? 'text-bad' : 'text-fog')}>{correct ? 'Correct · 4 in a row' : picked ? 'Not quite — use a tool or try again.' : '30 seconds. Pick an answer.'}</p>
        <div className="space-y-2 border-y border-line py-5"><p className="text-xs uppercase tracking-[0.14em] text-fog">Question 4</p><p className="text-base leading-6 text-paper">What are the solutions of x² − 14x + 45 = 0?</p></div>
        <div className="flex flex-col divide-y divide-line border-b border-line">{[['A', 'x = 5 only'], ['B', 'x = 14 and x = 45'], ['C', 'x = 5 and x = 9'], ['D', 'x = −5 and x = −9']].map(([key, text]) => <button key={key} onClick={() => setPicked(key)} className={cn('flex min-h-[58px] items-center gap-3 py-3 text-left', picked === key && 'bg-[rgba(255,212,200,0.4)]')}><span className={cn('flex h-8 w-8 items-center justify-center font-mono text-xs font-semibold', picked === key ? 'text-signal' : 'text-fog')}>{key}</span><span className="text-sm text-paper">{text}</span></button>)}</div>
        <div className="mt-5"><UnlockRow unlocked={correct} requirement="Answer correctly to complete the demo." onNext={onComplete} label="Back to features" /></div>
      </div>
    </DemoFrame>
  )
}

function CustomizeDemo({ onComplete }: { onComplete: () => void }) {
  const [tried, setTried] = React.useState<Array<'short' | 'graph'>>([])
  const bothTried = tried.includes('short') && tried.includes('graph')
  return (
    <DemoFrame>
      <div className="space-y-5 pt-1"><div><h3 className="font-display text-4xl tracking-tight text-paper">One question. Two custom tutors.</h3><p className="mt-2 text-sm text-fog">Try both conversations to see how the AI adapts.</p></div><div className="grid gap-4 lg:grid-cols-2"><motion.article animate={tried.includes('short') ? { y: -6, boxShadow: '0 22px 48px rgba(255,92,57,.16)' } : { y: 0 }} className="rounded-[1.5rem] border border-line bg-white p-5"><div className="flex items-center gap-3 border-b border-line pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-signal"><UserRound className="h-4 w-4" /></span><div><p className="font-display text-lg text-paper">Ari + Nova</p><p className="text-xs text-fog">One-sentence answers</p></div></div><div className="mt-4 space-y-3"><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-signal px-4 py-3 text-sm text-white">How do I solve 2x + 6 = 18?</div><AnimatePresence>{tried.includes('short') && <motion.div initial={{ opacity: 0, x: -14, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} className="max-w-[88%] rounded-2xl rounded-bl-sm bg-panel-2 px-4 py-3 text-sm text-paper"><span className="mb-1 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-signal"><MessageCircle className="h-3 w-3" /> Nova</span>Subtract 6, then divide by 2: x = 6.</motion.div>}</AnimatePresence><Button size="sm" className="w-full" variant={tried.includes('short') ? 'success' : 'default'} onClick={() => setTried((current) => current.includes('short') ? current : [...current, 'short'])}>{tried.includes('short') ? 'Concise Nova tried' : 'Try concise Nova'}</Button></div></motion.article><motion.article animate={tried.includes('graph') ? { y: -6, boxShadow: '0 22px 48px rgba(255,92,57,.16)' } : { y: 0 }} className="rounded-[1.5rem] border border-line bg-white p-5"><div className="flex items-center gap-3 border-b border-line pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-panel-2 text-signal"><UserRound className="h-4 w-4" /></span><div><p className="font-display text-lg text-paper">Maya + Graph Nova</p><p className="text-xs text-fog">Visual Desmos walkthrough</p></div></div><div className="mt-4 space-y-3"><div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-signal px-4 py-3 text-sm text-white">Show me where the solutions are.</div><AnimatePresence>{tried.includes('graph') && <motion.div initial={{ opacity: 0, y: 12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="rounded-2xl rounded-bl-sm bg-panel-2 p-4"><span className="mb-2 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-signal"><Calculator className="h-3 w-3" /> Nova opened Desmos</span><p className="text-sm text-paper">Enter y = x² − 14x + 45. The x-intercepts are the solutions.</p><div className="relative mt-3 h-24 overflow-hidden rounded-xl bg-white" style={{ backgroundImage: 'linear-gradient(rgba(20,20,20,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,20,.06) 1px, transparent 1px)', backgroundSize: '16px 16px' }}><svg viewBox="0 0 260 90" className="h-full w-full"><path d="M10 10 Q130 130 250 10" fill="none" stroke="#ff5c39" strokeWidth="3" /><circle cx="90" cy="67" r="4" fill="#ff5c39" /><circle cx="170" cy="67" r="4" fill="#ff5c39" /></svg></div></motion.div>}</AnimatePresence><Button size="sm" className="w-full" variant={tried.includes('graph') ? 'success' : 'default'} onClick={() => setTried((current) => current.includes('graph') ? current : [...current, 'graph'])}>{tried.includes('graph') ? 'Visual Nova tried' : 'Try visual Nova'}</Button></div></motion.article></div><UnlockRow unlocked={bothTried} requirement="Try both tutor styles to unlock the next feature." onNext={onComplete} /></div>
    </DemoFrame>
  )
}

void CustomizeDemo

function GamesDemo({ onComplete }: { onComplete: () => void }) {
  const [playing, setPlaying] = React.useState(false)
  const [playerY, setPlayerY] = React.useState(50)
  const [aiY, setAiY] = React.useState(50)
  const [ball, setBall] = React.useState({ x: 50, y: 50 })
  const [score, setScore] = React.useState({ player: 0, ai: 0 })
  const velocity = React.useRef({ x: 0.52, y: 0.34 })
  const tried = playing || score.player > 0 || score.ai > 0

  React.useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setBall((current) => {
        const x = current.x + velocity.current.x
        let y = current.y + velocity.current.y
        if (y <= 4 || y >= 96) { velocity.current.y *= -1; y = Math.max(4, Math.min(96, y)) }
        setAiY((currentAi) => currentAi + Math.max(-1.1, Math.min(1.1, y - currentAi)) * .35)
        if (x <= 7 && Math.abs(y - playerY) < 15 && velocity.current.x < 0) velocity.current.x = Math.abs(velocity.current.x) * 1.035
        if (x >= 93 && Math.abs(y - aiY) < 15 && velocity.current.x > 0) velocity.current.x = -Math.abs(velocity.current.x) * 1.035
        if (x < -2 || x > 102) {
          setScore((currentScore) => x < 0 ? { ...currentScore, ai: currentScore.ai + 1 } : { ...currentScore, player: currentScore.player + 1 })
          velocity.current = { x: x < 0 ? .52 : -.52, y: (Math.random() > .5 ? 1 : -1) * .34 }
          return { x: 50, y: 50 }
        }
        return { x, y }
      })
    }, 16)
    return () => window.clearInterval(timer)
  }, [playing, playerY, aiY])

  const reset = () => { setPlaying(false); setBall({ x: 50, y: 50 }); setScore({ player: 0, ai: 0 }); setPlayerY(50); setAiY(50); velocity.current = { x: .52, y: .34 } }
  return (
    <DemoFrame>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pt-2">
        <div className="flex items-end justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-signal">Arcade live</p><h3 className="mt-1 font-display text-4xl text-paper sm:text-5xl">Neon Pong</h3></div><button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-fog hover:text-paper"><RotateCcw className="h-3.5 w-3.5" /> Reset</button></div>
        <div className="relative aspect-[16/9] min-h-[330px] cursor-none overflow-hidden rounded-[1.5rem] border border-signal/30 bg-[#211511] shadow-[inset_0_0_60px_rgba(255,92,57,.12),0_20px_50px_rgba(40,24,12,.12)]" onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setPlayerY(Math.max(12, Math.min(88, ((event.clientY - rect.top) / rect.height) * 100))) }} onPointerDown={() => setPlaying(true)}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,92,57,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,92,57,.25) 1px, transparent 1px)', backgroundSize: '28px 28px' }} /><span className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/20" />
          <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 font-mono text-3xl font-bold tracking-[.35em] text-white"><span>{score.player}</span><span className="mx-5 text-white/30">:</span><span>{score.ai}</span></div>
          <span className="absolute left-[4%] h-[24%] w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_white]" style={{ top: `${playerY}%` }} /><span className="absolute right-[4%] h-[24%] w-2 -translate-y-1/2 rounded-full bg-signal shadow-[0_0_20px_#ff5c39]" style={{ top: `${aiY}%` }} /><span className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_22px_white]" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
          {!playing && <button type="button" onClick={() => setPlaying(true)} className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-signal px-7 py-3 font-semibold text-white shadow-[0_10px_30px_rgba(255,92,57,.4)]">Play now</button>}
          <p className="absolute inset-x-0 bottom-4 text-center font-mono text-[10px] uppercase tracking-[.18em] text-white/55">Move your pointer to control the left paddle</p>
        </div>
        <UnlockRow unlocked={tried} requirement="Start Neon Pong to complete the feature." onNext={onComplete} label="Back to features" />
      </div>
    </DemoFrame>
  )
}

function FeatureMiniScreen({ id }: { id: FeatureId }) {
  if (id === 'tutoring') return <div className="relative mt-6 h-44 overflow-hidden rounded-[1.5rem] border border-black/10 bg-[linear-gradient(160deg,#fff_0%,#fff5f0_55%,#ffe8df_100%)] px-3 pb-2 pt-3 shadow-[0_9px_0_rgba(0,0,0,0.05)]">
    <div className="flex gap-1">{[0, 1, 2, 3, 4, 5].map((item) => <span key={item} className={cn('h-1 flex-1 rounded-full', item < 2 ? 'bg-signal' : 'bg-black/10')} />)}</div>
    <p className="mt-2 font-mono text-[8px] uppercase tracking-[.12em] text-fog">Copilot · Math · Linear functions</p>
    <div className="absolute -bottom-5 -left-1 scale-[.68]"><NovaCharacter mood="talk" size="md" /></div>
    <div className="absolute bottom-5 left-20 right-3 rounded-[1.1rem] rounded-bl-sm border border-black/5 bg-white p-3 shadow-[0_8px_0_rgba(0,0,0,.04)] transition-transform duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1"><p className="font-display text-xs text-paper">Nova <span className="ml-1 font-mono text-[7px] uppercase tracking-wider text-signal">Teaching</span></p><p className="mt-1 text-[10px] leading-4 text-paper">A linear function has a constant slope: y = mx + b.</p></div>
  </div>
  if (id === 'rapid') return <div className="mt-6 h-44 overflow-hidden rounded-2xl border border-line bg-[#fffdfa] p-4">
    <div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-wider text-fog">Question 4 · streak 3</span><span className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 font-mono text-[10px] text-white"><Timer className="h-3 w-3" /> 00:26</span></div>
    <p className="mt-4 text-xs font-medium leading-5 text-paper">Solve x² − 14x + 45 = 0</p>
    <div className="mt-3 grid grid-cols-2 gap-2">{['5 only', '14, 45', '5, 9', '−5, −9'].map((answer, index) => <span key={answer} className={cn('rounded-lg border px-2 py-2 text-[10px] transition duration-300', index === 2 ? 'border-signal bg-signal/10 text-signal group-hover:bg-signal group-hover:text-white group-focus-visible:bg-signal group-focus-visible:text-white' : 'border-line text-fog')}>{String.fromCharCode(65 + index)} · {answer}</span>)}</div>
  </div>
  if (id === 'games') return <div className="relative mt-6 h-44 overflow-hidden rounded-2xl border border-[#ff835f]/30 bg-[#241916] shadow-inner">
    <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(255,92,57,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,92,57,.18) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
    <div className="absolute inset-x-4 top-3 flex justify-between font-mono text-[9px] uppercase tracking-wider text-[#ffb8a7]"><span>Nova Pong</span><span>3 — 2</span></div>
    <span className="absolute left-5 top-16 h-12 w-1.5 rounded-full bg-white shadow-[0_0_12px_white] transition-transform duration-500 group-hover:translate-y-7 group-focus-visible:translate-y-7" /><span className="absolute right-5 top-24 h-12 w-1.5 rounded-full bg-signal shadow-[0_0_14px_#ff5c39] transition-transform duration-500 group-hover:-translate-y-10 group-focus-visible:-translate-y-10" /><span className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_16px_white] transition-transform duration-500 group-hover:translate-x-10 group-hover:-translate-y-8 group-focus-visible:translate-x-10 group-focus-visible:-translate-y-8" />
    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[9px] text-white/70">CLEAR 5 TO REPLAY</span>
  </div>
  return <div className="mt-6 grid h-44 grid-cols-[1.18fr_.82fr] gap-2 overflow-hidden rounded-2xl border border-line bg-[#f7f3ee] p-2">
    <div className="rounded-xl bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><span className="font-mono text-[8px] uppercase text-fog">SAT Math · 1/22</span><span className="h-2 w-8 rounded-full bg-signal/20" /></div><p className="mt-3 text-[10px] leading-4 text-paper">If f(x) = x² − 4x + 1, what is f(3) − f(1)?</p><div className="mt-2 grid grid-cols-2 gap-1">{['A −4', 'B −2', 'C 0', 'D 2'].map((answer) => <span key={answer} className="rounded border border-line px-1.5 py-1 text-[8px] text-fog">{answer}</span>)}</div></div>
    <div className="relative overflow-hidden rounded-xl bg-white" style={{ backgroundImage: 'linear-gradient(rgba(20,20,20,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,20,.07) 1px, transparent 1px)', backgroundSize: '12px 12px' }}><span className="absolute left-2 top-2 z-10 rounded-full bg-white px-2 py-1 font-mono text-[8px] text-signal shadow">Desmos</span><svg viewBox="0 0 120 130" className="absolute inset-0 h-full w-full"><path d="M5 115 Q60 -30 115 115" fill="none" stroke="#ff5c39" strokeWidth="3" className="transition-[stroke-width] duration-300 group-hover:[stroke-width:5] group-focus-visible:[stroke-width:5]" /></svg></div>
  </div>
}

function FeatureCard({ feature, preview = false, onClick }: { feature: (typeof FEATURES)[number]; preview?: boolean; onClick?: () => void }) {
  const Comp = onClick ? motion.button : motion.div
  return (
    <Comp aria-label={onClick ? `Open ${feature.title}` : undefined} whileHover={onClick ? { y: -5, scale: 1.01 } : undefined} whileTap={onClick ? { scale: .985 } : undefined} onClick={onClick} className={cn('group relative overflow-hidden rounded-[1.75rem] border border-line bg-white p-4 text-left shadow-[0_16px_35px_rgba(40,24,12,0.07)]', preview && 'mx-auto min-h-[290px] w-full max-w-3xl p-6')}>
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-signal/10 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <FeatureMiniScreen id={feature.id} />
        {onClick && <span className="sr-only">Open {feature.title}</span>}
      </div>
      {preview && <motion.span key={feature.id} className="absolute inset-x-0 bottom-0 h-1.5 origin-left bg-signal" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 3, ease: 'linear' }} />}
    </Comp>
  )
}

export function ProductShowcase() {
  const [phase, setPhase] = React.useState<'preview' | 'choose'>('preview')
  const [previewIndex, setPreviewIndex] = React.useState(0)
  const [selected, setSelected] = React.useState<FeatureId | null>(null)

  React.useEffect(() => {
    if (phase !== 'preview') return
    const timer = window.setTimeout(() => {
      if (previewIndex === FEATURES.length - 1) setPhase('choose')
      else setPreviewIndex((current) => current + 1)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [phase, previewIndex])

  const closeDemo = () => setSelected(null)
  const demo = selected === 'tutoring' ? <TutoringDemo onComplete={closeDemo} />
    : selected === 'rapid' ? <RapidDemo onComplete={closeDemo} />
      : selected === 'games' ? <GamesDemo onComplete={closeDemo} />
        : selected === 'practice' ? <PracticeDemo onComplete={closeDemo} />
          : null

  if (phase === 'preview') {
    return <div><AnimatePresence mode="wait"><motion.div key={FEATURES[previewIndex].id} initial={{ opacity: 0, x: 70, scale: .96, filter: 'blur(6px)' }} animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -70, scale: .97, filter: 'blur(6px)' }} transition={{ duration: .48, ease: [0.22, 1, 0.36, 1] }}><FeatureCard feature={FEATURES[previewIndex]} preview /></motion.div></AnimatePresence><div className="mt-4 flex justify-center gap-2">{FEATURES.map((feature, index) => <span key={feature.id} className={cn('h-1.5 rounded-full transition-all', index === previewIndex ? 'w-8 bg-signal' : 'w-4 bg-black/10')} />)}</div></div>
  }

  return <><div className="grid gap-5 sm:grid-cols-2">{FEATURES.map((feature) => <FeatureCard key={feature.id} feature={feature} onClick={() => setSelected(feature.id)} />)}</div><AnimatePresence>{selected && <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper/55 p-3 backdrop-blur-md sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) closeDemo() }}><motion.div role="dialog" aria-modal="true" aria-label={`${FEATURES.find((feature) => feature.id === selected)?.title} demo`} className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-ink shadow-[0_36px_100px_rgba(20,12,8,.28)]" initial={{ y: 36, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: .97 }} transition={{ type: 'spring', stiffness: 240, damping: 25 }}><button type="button" onClick={closeDemo} className="sticky right-4 top-4 z-50 float-right mr-4 mt-4 flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-paper shadow-lg" aria-label="Close feature demo"><X className="h-5 w-5" /></button><div className="clear-both p-2 sm:p-3">{demo}</div></motion.div></motion.div>}</AnimatePresence></>
}
