'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { Calculator, Gauge, Loader2, PenLine, Scale, Send, Sparkles, Target, TrendingUp } from 'lucide-react'
import { DesmosPanel } from '@/components/desmos/desmos-panel'
import { DesmosProvider, useDesmos } from '@/components/desmos/desmos-provider'
import { PreviewSignup } from '@/components/preview-signup'
import { QuestionPrompt, TutorRichText } from '@/components/practice/question-prompt'
import type { BookletQuestion } from '@/components/practice/test-booklet'
import { cn } from '@/lib/utils'
import type { TutorTrigger } from '@/lib/tutor/types'

const MISTAKE_KEY = 'prep:last-rapid-fire-mistake'

type Message = { role: 'user' | 'assistant'; content: string; board?: boolean }

type MistakeContext = {
  questionId?: string
  questionText?: string
  passageContent?: string | null
  topicId?: string | null
  topicName?: string | null
  sectionName?: string | null
  selectedAnswer?: string
  correctAnswer?: string
  choices?: Array<{ key: string; text: string; label?: string }>
  officialExplanation?: string | null
}

type VisualStep = {
  mark: 'rewrite' | 'highlight' | 'circle' | 'underline'
  title: string
  expression: string
  focus: string
  note: string
}

type VisualProblem = {
  kind: 'math' | 'reading'
  original: string
  steps: VisualStep[]
  answer?: string
}

type CoachTopic = {
  name: string
  section: string
  topicId: string | null
  accuracy: number | null
  total: number
  correct: number
}

type CoachReport = {
  weak: CoachTopic[]
  unseen: CoachTopic[]
  focus: CoachTopic | null
  answered: number
  correct: number
  accuracy: number
  readiness: number
  predicted: number | null
  target: number | null
  preference: string | null
  testDate: string | null
}

const CHAT_ACTIONS = [
  { id: 'practice', label: 'Practice Problem', hint: 'A weak or new topic', face: '#1cb0f6', soft: '#e8f6ff', icon: Target },
  { id: 'compare', label: 'SAT vs ACT', hint: 'Four questions, then a pick', face: '#ff9600', soft: '#fff4e6', icon: Scale },
  { id: 'ready', label: 'Ready %', hint: 'Score and what to fix', face: '#58cc02', soft: '#f1ffe8', icon: Gauge },
  { id: 'improve', label: 'Improve', hint: 'Five questions a topic', face: '#ce82ff', soft: '#f8efff', icon: TrendingUp },
  { id: 'tricks', label: 'Tricks', hint: 'The shortcut, then a problem', face: '#ff4b4b', soft: '#fff0f0', icon: Sparkles },
] as const

const COMPARE_QUESTIONS = [
  { prompt: 'Which reading style feels easier?', sat: 'A few short passages', act: 'One longer passage' },
  { prompt: 'Do you want a science section built from charts?', sat: 'No science section', act: 'Yes, I like charts' },
  { prompt: 'Where do you lose the most time?', sat: 'Long reading', act: 'A fast clock' },
  { prompt: 'Which math set fits you better?', sat: 'Fewer questions, more reasoning', act: 'More questions, quicker work' },
] as const

function trickFor(name: string) {
  const topic = name.toLowerCase()
  if (/percent|ratio|proportion/.test(topic)) return 'Turn the percent into a multiplier first. 20% off is ×0.8. 15% more is ×1.15.'
  if (/exponent|power/.test(topic)) return 'Same base: add exponents when you multiply, subtract them when you divide. Do not expand the powers.'
  if (/linear|slope|equation/.test(topic)) return 'Slope is rise over run. If a point is given, plug it in instead of rebuilding the equation.'
  if (/quadratic|parabola/.test(topic)) return 'Roots: factor or use the product of the roots. Vertex x-value: −b / (2a).'
  if (/grammar|punctuation|comma|modifier|transition|sentence/.test(topic)) return 'Pick the shortest choice that stays grammatical. Extra words are usually the trap.'
  if (/inference|evidence|reading|main idea|purpose/.test(topic)) return 'The answer has to be stated or directly supported. Cross out any choice that adds a new idea.'
  return 'Look for the one move that removes work: plug in a number, cancel a factor, or eliminate two choices that say the same thing.'
}

async function pullQuestions(options: { count?: number; topicName?: string; sectionName?: string; testType?: 'SAT' | 'ACT' }) {
  const query = new URLSearchParams({ count: String(options.count ?? 1), difficulty: 'mixed', mode: 'chat' })
  if (options.topicName) query.set('topicName', options.topicName)
  if (options.sectionName && options.sectionName !== 'Math') query.set('sectionName', options.sectionName)
  if (options.testType) query.set('testType', options.testType)
  let response = await fetch(`/api/practice/questions?${query.toString()}`)
  let data = await response.json() as { questions?: BookletQuestion[]; error?: string }
  if (response.ok && !data.questions?.length && options.topicName) {
    query.delete('topicName')
    response = await fetch(`/api/practice/questions?${query.toString()}`)
    data = await response.json() as { questions?: BookletQuestion[]; error?: string }
  }
  if (!response.ok || !data.questions?.length) throw new Error(data.error ?? 'No questions were available.')
  return data.questions
}

async function loadCoach() {
  const response = await fetch('/api/ai/coach')
  const data = await response.json() as CoachReport & { error?: string }
  if (!response.ok) throw new Error(data.error ?? 'Could not read your account.')
  return data
}

async function readTutorStream(res: Response, onDelta: (chunk: string) => void): Promise<void> {
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = await res.json() as { message?: string; error?: string }
    onDelta(data.message ?? data.error ?? '')
    return
  }
  if (!res.body) throw new Error('No stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const json = JSON.parse(payload) as { delta?: string; message?: string }
          onDelta(json.delta ?? json.message ?? '')
        } catch {
          onDelta(payload)
        }
      }
    }
  }
}

function graphLinesFromText(text: string) {
  const clean = text.replace(/\*\*/g, '').replace(/`/g, '')
  const matches = clean.match(/\by\s*=\s*[-+0-9xX().\s*/^]{1,42}/g) ?? []
  return [...new Set(matches.map((line) => line.replace(/\s+/g, '').replace(/X/g, 'x')))]
    .filter((line) => /x/.test(line) && /^y=[-+0-9x().*/^]+$/.test(line))
    .slice(0, 4)
}

function firstSentence(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (!compact) return compact
  const match = compact.match(/^(.{1,180}?[.!?])\s/)
  return match?.[1] ?? compact.slice(0, 180)
}


function isMathQuestion(question: Pick<BookletQuestion, 'section_name' | 'question_text'> | MistakeContext | null) {
  if (!question) return false
  const record = question as Partial<MistakeContext & Pick<BookletQuestion, 'section_name' | 'question_text'>>
  const section = record.sectionName ?? record.section_name ?? ''
  const text = record.questionText ?? record.question_text ?? ''
  return /math/i.test(section) || /\b(solve|equation|function|graph|line|triangle|circle|slope|percent|probability|meters|value of x|\d+x|y\s*=|root|roots|zero|zeros|quadratic|factor|intercept|vertex|polynomial|system|inequality|sin|cos|tan|ratio|mean|median)\b/i.test(text)
}

function shouldUseWorkBoard(text: string) {
  const compact = text.trim()
  if (!compact) return false
  if (/\b(more important|most important|importance|better to study|worth studying|how often|percent of (the )?test|study schedule|which test|score prediction)\b/i.test(compact)) return false
  if (/^(hello|hi|hey|thanks|thank you|good morning)[!. ]*$/i.test(compact)) return false
  // A definition request needs a normal example in chat; reserve the board for a concrete problem.
  if (/^(what (is|are)|define|tell me about|what does)\b/i.test(compact) && !/[=+÷×^√]|\d/.test(compact)) return false
  return /[?=+÷×^√]|\d|\b(help|show|solve|find|explain|teach|break down|breakdown|work|example|question|problem|answer|wrong|mistake|root|roots|zero|zeros|equation|function|graph|slope|intercept|vertex|quadratic|factor|polynomial|system|inequality|triangle|circle|angle|sin|cos|tan|grammar|comma|semicolon|colon|apostrophe|transition|inference|main idea|evidence|claim|passage|reading|vocab|math|english|sentence|punctuation|percent|fraction|ratio|geometry|trigonometry|statistics|probability|mean|median|area|volume)\b/i.test(compact)
}

function contextFromUserText(text: string): MistakeContext {
  const math = /[=+÷×^√]|\d\s*[a-z]|\b(root|roots|zero|zeros|equation|function|graph|slope|intercept|vertex|quadratic|factor|polynomial|system|inequality|triangle|circle|angle|sin|cos|tan|solve|find x|math|fraction|ratio|geometry|trigonometry|statistics|probability|mean|median|area|volume)\b/i.test(text)
  const grammar = /\b(grammar|comma|semicolon|colon|apostrophe|transition|modifier|pronoun|verb|sentence|punctuation)\b/i.test(text)
  return {
    questionText: text.trim(),
    passageContent: null,
    sectionName: math ? 'Math' : grammar ? 'Reading and Writing' : 'Reading',
    topicName: math ? 'Math help' : grammar ? 'Grammar help' : 'Reading help',
  }
}

function requestedProblemTopic(text: string): string | null {
  const request = text.match(/\b(?:give|generate|make|create|pull|show|ask)\b(?:\s+me)?(?:\s+(?:a|an|some|one))?\s+(.+?)\s+(?:questions?|problems?)\b/i)?.[1]
  if (!request) return null
  const cleaned = request
    .replace(/\b(?:sat|act|hard|easy|medium|practice|math|english|reading|grammar)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
}

function practiceRequest(text: string): { sectionName: string; testType?: 'SAT' | 'ACT'; topicName?: string } | null {
  const wantsPractice = /\b(question|questions|problem|problems|passage)\b/i.test(text)
    && /\b(answer|do|practice|work|solve|try|pull|show|give|together|break|lets|let's)\b/i.test(text)
  if (!wantsPractice) return null
  const sectionName = /\bscience\b/i.test(text)
    ? 'Science'
    : /\b(reading and writing|reading & writing)\b/i.test(text)
      ? 'Reading and Writing'
      : /\benglish\b/i.test(text)
        ? 'English'
        : /\breading\b/i.test(text)
          ? 'Reading'
          : /\bmath\b/i.test(text)
            ? 'Math'
            : ''
  if (!sectionName) return null
  const testType = /\bact\b/i.test(text) || sectionName === 'Science' ? 'ACT' as const : /\bsat\b/i.test(text) ? 'SAT' as const : undefined
  const topic = requestedProblemTopic(text)
  const topicName = topic && !/^(science|math|english|reading|reading and writing)$/i.test(topic) ? topic : undefined
  return { sectionName, testType, topicName }
}

function questionSubjectFromTopic(topic: string): 'math' | 'english' {
  return /\b(function|equation|algebra|geometry|triangle|circle|angle|slope|quadratic|polynomial|percent|ratio|probability|statistic|mean|median|trig|sin|cos|tan|number|area|volume|coordinate|inequalit|system)\b/i.test(topic) ? 'math' : 'english'
}

function copilotAttemptMatches(answer: string, step: VisualStep, finalAnswer?: string, isLast = false): boolean {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9=.+\-]/g, '')
  const attempt = clean(answer)
  if (!attempt) return false
  const targets = [step.focus, isLast ? finalAnswer : ''].filter(Boolean).map((value) => clean(String(value)))
  return targets.some((target) => target.length > 0 && (attempt.includes(target) || target.includes(attempt)))
}

function stepWithBlank(step: VisualStep): React.ReactNode {
  const at = step.expression.toLowerCase().indexOf(step.focus.toLowerCase())
  if (at < 0 || !step.focus.trim()) return <QuestionPrompt text={step.expression} />
  return <><QuestionPrompt as="span" text={step.expression.slice(0, at)} /><span className="mx-1 inline-block min-w-16 border-b-4 border-[#1cb0f6] text-center text-[#1cb0f6]">?</span><QuestionPrompt as="span" text={step.expression.slice(at + step.focus.length)} /></>
}

function localTeachingReply(text: string, topic = '') {
  const subject = topic || (text.match(/\b(systems? of linear (?:functions?|equations?)|compound[- ]complex sentences?|compound sentences?|complete sentences?|quadratics?|linear functions?|grammar|trigonometry|geometry|transitions?|inference|evidence)\b/i)?.[0] ?? 'that topic')
  const key = subject.toLowerCase()
  if (/system.*linear/.test(key)) return 'A system of linear equations is two or more straight-line rules considered together. For example, y = 2x + 1 and y = -x + 7 form a system, and their shared solution is (2, 5) because both equations equal 5 when x = 2.'
  if (/compound[- ]complex sentence/.test(key)) return 'A compound-complex sentence has at least two complete thoughts and at least one dependent thought. For example: “Although it was raining, Maya walked to school, and Leo rode the bus.”'
  if (/compound sentence/.test(key)) return 'A compound sentence joins two complete thoughts with a comma and a joining word. Example: “The rain stopped, and the team resumed practice.”'
  if (/complete sentence/.test(key)) return 'A complete sentence expresses a full thought with a subject and a verb. For example: “The students reviewed.”'
  if (/quadratic/.test(key)) return 'A quadratic has a squared variable, so its graph usually bends into a parabola. Example: x² − 5x + 6 = 0 factors as (x − 2)(x − 3), so its roots are 2 and 3.'
  if (/linear function/.test(key)) return 'A linear function changes at a constant rate. Example: in y = 3x + 4, the rate is 3 and the starting value is 4.'
  return `${subject} is a test idea you can learn by seeing it in action. Example: send me a specific ${subject} question and I will mark each step, or try this tiny example: identify the rule first, then apply it once.`
}


function sampleToMistake(question: BookletQuestion | null): MistakeContext | null {
  if (!question) return null
  return {
    questionId: question.id,
    questionText: question.question_text,
    passageContent: question.passage_content,
    topicId: question.topic_id,
    topicName: question.topic_name,
    sectionName: question.section_name,
    correctAnswer: question.correct_answer,
    choices: question.choices,
    officialExplanation: question.official_explanation ?? question.ai_explanation ?? null,
  }
}

function renderMarkedExpression(step: VisualStep) {
  const source = step.expression
  let focus = step.focus.trim()
  if (!focus || focus.length >= source.length * 0.75 || !source.toLowerCase().includes(focus.toLowerCase())) {
    focus = source.match(/[A-Za-z0-9]+(?:\/[A-Za-z0-9]+)?/)?.[0] ?? ''
  }
  const markClass = step.mark === 'highlight'
    ? 'rounded-md bg-[#fff067] px-1'
    : step.mark === 'circle'
      ? 'inline-block rounded-full border-4 border-[#ff4b4b] px-3 py-1'
      : step.mark === 'underline'
        ? 'underline decoration-[#1cb0f6] decoration-4 underline-offset-8'
      : ''
  if (!focus || step.mark === 'rewrite') return <QuestionPrompt as="span" text={source} className="text-lg font-black leading-8 text-[#222]" />
  const parts: Array<{ text: string; marked: boolean }> = []
  let cursor = 0
  const lowerSource = source.toLowerCase()
  const lowerFocus = focus.toLowerCase()
  while (cursor < source.length) {
    const found = lowerSource.indexOf(lowerFocus, cursor)
    if (found < 0) { parts.push({ text: source.slice(cursor), marked: false }); break }
    if (found > cursor) parts.push({ text: source.slice(cursor, found), marked: false })
    parts.push({ text: source.slice(found, found + focus.length), marked: true })
    cursor = found + focus.length
  }
  return <>{parts.map((part, index) => <span key={`${part.text}-${index}`} className={part.marked ? markClass : undefined}><QuestionPrompt as="span" text={part.text} className="text-lg font-black leading-8 text-[#222]" /></span>)}</>
}

function LiveTeacherPlayback({ problem, question, finalAnswer, bankQuestion, onComplete }: { problem: VisualProblem; question: string; finalAnswer?: string; bankQuestion: boolean; onComplete: () => void }) {
  const [questionChars, setQuestionChars] = React.useState(0)
  const [stepIndex, setStepIndex] = React.useState(0)
  const [expressionChars, setExpressionChars] = React.useState(0)
  const [showMark, setShowMark] = React.useState(false)
  const [noteChars, setNoteChars] = React.useState(0)
  const [finished, setFinished] = React.useState(false)
  const completionSent = React.useRef(false)
  const step = problem.steps[stepIndex]

  React.useEffect(() => {
    setQuestionChars(0)
    setStepIndex(0)
    setExpressionChars(0)
    setShowMark(false)
    setNoteChars(0)
    setFinished(false)
    completionSent.current = false
  }, [problem.original])

  React.useEffect(() => {
    if (!finished || completionSent.current) return
    completionSent.current = true
    onComplete()
  }, [finished, onComplete])

  React.useEffect(() => {
    if (questionChars < question.length) {
      const timer = window.setTimeout(() => setQuestionChars((value) => Math.min(value + 1, question.length)), 38)
      return () => window.clearTimeout(timer)
    }
    if (!step) return
    if (expressionChars < step.expression.length) {
      const timer = window.setTimeout(() => setExpressionChars((value) => Math.min(value + 1, step.expression.length)), 58)
      return () => window.clearTimeout(timer)
    }
    if (!showMark) {
      const timer = window.setTimeout(() => setShowMark(true), 750)
      return () => window.clearTimeout(timer)
    }
    if (noteChars < step.note.length) {
      const timer = window.setTimeout(() => setNoteChars((value) => Math.min(value + 1, step.note.length)), 36)
      return () => window.clearTimeout(timer)
    }
    const timer = window.setTimeout(() => {
      if (stepIndex < problem.steps.length - 1) {
        setStepIndex((value) => value + 1)
        setExpressionChars(0)
        setShowMark(false)
        setNoteChars(0)
      } else {
        setFinished(true)
      }
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [expressionChars, noteChars, problem.steps.length, question.length, questionChars, showMark, step, stepIndex])

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#e5e5e5] bg-[#fffdf8] p-4 pr-8">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#ff9600]"><PenLine className="h-4 w-4" /> {bankQuestion ? 'Question from the bank' : 'Your question'}</p>
        <div className="min-h-14 text-base font-extrabold leading-7 text-[#3c3c3c]">
          <QuestionPrompt as="span" text={question.slice(0, questionChars)} />
          {questionChars < question.length ? <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-[#1cb0f6] align-middle" /> : null}
        </div>
      </div>

      {questionChars >= question.length && step ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1cb0f6]">Agent writing live</p>
            <p className="rounded-full bg-[#eaf7ff] px-3 py-1 text-xs font-black text-[#126c9b]">Step {stepIndex + 1} of {problem.steps.length}</p>
          </div>
          {problem.steps.slice(0, stepIndex).map((completedStep, completedIndex) => (
            <div key={`completed-${completedStep.title}-${completedIndex}`} className="rounded-2xl border-2 border-[#d9d9d9] bg-[#fafafa] p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#777] text-xs font-black text-white">{completedIndex + 1}</span>
                <p className="text-sm font-black text-[#555]">{completedStep.title}</p>
              </div>
              <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(12rem,0.8fr)]">
                <div className="rounded-xl bg-white p-4 font-mono text-lg font-black leading-8 text-[#222]">{renderMarkedExpression(completedStep)}</div>
                <div className="hidden items-center justify-center text-3xl font-black text-[#ff7676] sm:flex" aria-hidden="true">→</div>
                <div className="relative rounded-2xl border-2 border-[#9edcff] bg-[#eef9ff] px-4 py-3 text-sm font-bold leading-5 text-[#126c9b] before:absolute before:-left-2 before:top-1/2 before:hidden before:h-4 before:w-4 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-l-2 before:border-[#9edcff] before:bg-[#eef9ff] sm:before:block">{completedStep.note}</div>
              </div>
            </div>
          ))}
          <div className="relative rounded-2xl border-2 border-[#e5e5e5] bg-white p-3 shadow-[0_4px_0_#e5e5e5]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3c3c3c] text-xs font-black text-white">{stepIndex + 1}</span>
              <p className="text-sm font-black text-[#3c3c3c]">{step.title}</p>
            </div>
            <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_2.5rem_minmax(12rem,0.8fr)]">
              <div className="relative min-h-20 rounded-xl bg-[#fffdf8] p-4 font-mono text-lg font-black leading-8 text-[#222]">
                {showMark ? renderMarkedExpression(step) : <><QuestionPrompt as="span" text={step.expression.slice(0, expressionChars)} className="text-lg font-black leading-8 text-[#222]" />{expressionChars < step.expression.length ? <span className="ml-0.5 inline-block h-6 w-0.5 animate-pulse bg-[#222] align-middle" /> : null}</>}
              </div>
              <div className={cn('hidden items-center justify-center text-3xl font-black text-[#ff4b4b] transition-opacity duration-300 sm:flex', showMark ? 'opacity-100' : 'opacity-0')} aria-hidden="true">→</div>
              <div className={cn('relative min-h-20 rounded-2xl border-2 border-[#1cb0f6] bg-[#eaf7ff] px-4 py-3 text-sm font-bold leading-5 text-[#126c9b] transition-opacity duration-300 before:absolute before:-left-2 before:top-1/2 before:hidden before:h-4 before:w-4 before:-translate-y-1/2 before:rotate-45 before:border-b-2 before:border-l-2 before:border-[#1cb0f6] before:bg-[#eaf7ff] sm:before:block', showMark ? 'opacity-100' : 'opacity-0')}>
                {step.note.slice(0, noteChars)}
                {showMark && noteChars < step.note.length ? <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#126c9b] align-middle" /> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {finished && finalAnswer ? (
        <div className="mt-4 rounded-2xl border-2 border-[#58cc02] bg-[#edffe6] p-4 text-center shadow-[0_4px_0_#46a302]">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#3f9400]">Final answer</p>
          <p className="mt-1 font-display text-3xl text-[#2f7600]">{finalAnswer.toUpperCase()}</p>
        </div>
      ) : null}
    </>
  )
}

function CopilotAnswerBox({ stepNumber, onSubmit }: { stepNumber: number; onSubmit: (answer: string) => void }) {
  const [answer, setAnswer] = React.useState('')
  React.useEffect(() => setAnswer(''), [stepNumber])
  return (
    <div className="mt-4 rounded-2xl border-2 border-[#9edcff] bg-white p-3">
      <label htmlFor="copilot-step-answer" className="block text-xs font-black uppercase tracking-[0.12em] text-[#126c9b]">Write your step here</label>
      <div className="mt-2 flex gap-2">
        <input id="copilot-step-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && answer.trim()) { onSubmit(answer.trim()); setAnswer('') } }} placeholder="Type the number, equation, word, or sentence…" className="min-h-12 flex-1 rounded-xl border-2 border-[#e5e5e5] bg-[#fffdf8] px-4 text-sm font-bold text-[#222] outline-none focus:border-[#1cb0f6]" />
        <button type="button" disabled={!answer.trim()} onClick={() => { onSubmit(answer.trim()); setAnswer('') }} className="rounded-xl bg-[#58cc02] px-5 text-sm font-black text-white shadow-[0_4px_0_#46a302] disabled:opacity-40">Check</button>
      </div>
    </div>
  )
}


function WorkBoard({
  active,
  onDesmosDemo,
  loadingQuestion,
  visualProblem,
  onLessonComplete,
  copilotStep,
  onCopilotSubmit,
  autonomousMode,
  onAutonomousAnswer,
  embedded = false,
}: {
  active: MistakeContext | null
  onDesmosDemo: () => void
  loadingQuestion: boolean
  visualProblem: VisualProblem | null
  onLessonComplete: () => void
  copilotStep: number | null
  onCopilotSubmit: (answer: string) => void
  autonomousMode: boolean
  onAutonomousAnswer: (answer: string) => void
  embedded?: boolean
}) {
  const shell = embedded
    ? 'bg-transparent p-1'
    : 'rounded-[2rem] border-4 border-[#e5e5e5] bg-white p-5 shadow-[0_10px_0_#e5e5e5]'
  const section = active?.sectionName ?? ''
  const math = /math/i.test(section) || (!section && (visualProblem?.kind === 'math' || isMathQuestion(active)))
  const boardTitle = /science/i.test(section) ? 'Science breakdown' : math ? 'Math breakdown' : 'Reading / grammar breakdown'
  if (loadingQuestion && !active) {
    return (
      <aside className={shell}>
        <p className="inline-flex items-center gap-2 text-sm font-bold text-[#777]"><Loader2 className="h-4 w-4 animate-spin" /> Pulling a real question from the bank…</p>
      </aside>
    )
  }
  if (!active) return null
  const rawAnswer = visualProblem?.answer ?? active.correctAnswer
  const matchingChoice = active.choices?.find((choice) => choice.key === rawAnswer || choice.label === rawAnswer)
  const finalAnswer = matchingChoice?.text ?? rawAnswer
  return (
    <aside className={shell}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1cb0f6]">Live work board</p>
          <p className="font-display text-2xl text-[#3c3c3c]">{boardTitle}</p>
        </div>
        {math ? (
          <button
            type="button"
            onClick={onDesmosDemo}
            className="rounded-full bg-[#eaf7ff] px-3 py-2 text-xs font-black text-[#1c7fb4]"
          >
            Show Desmos
          </button>
        ) : null}
      </div>

      {active.passageContent ? (
        <div className="mb-4 rounded-2xl bg-[#fffdf8] p-4 text-sm font-semibold leading-7 text-[#3c3c3c]">
          <QuestionPrompt text={active.passageContent} className="text-sm font-semibold leading-7 text-[#3c3c3c]" />
        </div>
      ) : null}

      {!visualProblem ? <div className="relative overflow-hidden rounded-2xl border-2 border-[#e5e5e5] bg-[#fffdf8] p-4 pr-8"><p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#ff9600]"><PenLine className="h-4 w-4" /> {active.questionId ? 'Question from the bank' : 'Your question'}</p><QuestionPrompt text={active.questionText ?? ''} className="text-base font-extrabold leading-7 text-[#3c3c3c]" /></div> : null}

      {loadingQuestion && !visualProblem ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#eaf7ff] p-4 text-sm font-bold text-[#126c9b]">
          <Loader2 className="h-4 w-4 animate-spin" /> Working through this question step by step…
        </div>
      ) : null}

      {visualProblem && copilotStep === null && !autonomousMode ? <LiveTeacherPlayback problem={visualProblem} question={active.questionText ?? ''} finalAnswer={finalAnswer} bankQuestion={Boolean(active.questionId)} onComplete={onLessonComplete} /> : null}
      {visualProblem && copilotStep !== null && !autonomousMode ? (
        <div className="space-y-3">
          <div className="rounded-2xl border-2 border-[#e5e5e5] bg-[#fffdf8] p-4">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[#ff9600]">Your copilot question</p>
            <QuestionPrompt text={active.questionText ?? ''} className="text-base font-extrabold leading-7 text-[#3c3c3c]" />
          </div>
          {visualProblem.steps.slice(0, copilotStep).map((completed, index) => (
            <div key={`copilot-complete-${index}`} className="rounded-2xl border-2 border-[#d9d9d9] bg-[#fafafa] p-3">
              <p className="mb-2 text-sm font-black text-[#555]">Step {index + 1}: {completed.title}</p>
              <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(12rem,0.8fr)]">
                <div className="rounded-xl bg-white p-3 font-mono text-lg font-black">{renderMarkedExpression(completed)}</div><div className="hidden text-2xl font-black text-[#ff4b4b] sm:block">→</div><div className="rounded-xl border-2 border-[#9edcff] bg-[#eef9ff] p-3 text-sm font-bold text-[#126c9b]">{completed.note}</div>
              </div>
            </div>
          ))}
          {visualProblem.steps[copilotStep] ? (
            <div className="rounded-2xl border-4 border-[#1cb0f6] bg-[#eaf7ff] p-4 shadow-[0_6px_0_#1587bd]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#126c9b]">Your turn · Step {copilotStep + 1}</p>
              <p className="mt-2 text-lg font-black text-[#222]">{visualProblem.steps[copilotStep]?.title}</p>
              <div className="mt-3 rounded-xl bg-white p-4 font-mono text-lg font-black text-[#222]">{stepWithBlank(visualProblem.steps[copilotStep]!)}</div>
              <p className="mt-2 text-sm font-bold leading-6 text-[#126c9b]">I wrote the step and left one important part blank. Enter only the missing part below.</p>
              <CopilotAnswerBox stepNumber={copilotStep} onSubmit={onCopilotSubmit} />
            </div>
          ) : finalAnswer ? (
            <div className="rounded-2xl border-2 border-[#58cc02] bg-[#edffe6] p-4 text-center"><p className="text-xs font-black uppercase text-[#3f9400]">Final answer</p><p className="mt-1 font-display text-2xl text-[#2f7600]">{finalAnswer}</p></div>
          ) : null}
        </div>
      ) : null}
      {autonomousMode ? (
        <div className="space-y-3">
          <div className="rounded-2xl border-4 border-[#ff9600] bg-[#fff8e8] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#c56f00]">Independent question · No hints</p>
            <QuestionPrompt text={active.questionText ?? ''} className="mt-2 text-base font-extrabold leading-7 text-[#3c3c3c]" />
          </div>
          <div className="grid gap-2">
            {active.choices?.map((choice) => <button key={choice.key} type="button" onClick={() => onAutonomousAnswer(choice.key)} className="rounded-xl border-2 border-[#e5e5e5] bg-white p-3 text-left text-sm font-bold text-[#3c3c3c] hover:border-[#1cb0f6]"><span className="mr-2 font-black">{choice.label ?? choice.key}.</span>{choice.text}</button>)}
          </div>
        </div>
      ) : null}
    </aside>
  )
}

type ChatThread = { id: string; title: string; updatedAt: string; messages: Message[] }
const THREADS_KEY = 'prep:chat-threads'
const ACTIVE_THREAD_KEY = 'prep:chat-active'
function isRealThread(thread: ChatThread) {
  return thread.messages.some((message) => message.role === 'user' && message.content.trim().length > 0)
}

function readThreads(): ChatThread[] {
  try {
    const raw = window.localStorage.getItem(THREADS_KEY)
    const parsed = raw ? JSON.parse(raw) as ChatThread[] : []
    return Array.isArray(parsed) ? parsed.filter((thread) => thread?.id && Array.isArray(thread.messages) && isRealThread(thread)).slice(0, 24) : []
  } catch {
    return []
  }
}

function ChatInner({ guestPreview = false }: { guestPreview?: boolean }) {
  const params = useSearchParams()
  const desmos = useDesmos()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [threads, setThreads] = React.useState<ChatThread[]>([])
  const [threadId, setThreadId] = React.useState<string | null>(null)
  const threadsReady = React.useRef(false)
  const [input, setInput] = React.useState('')
  const [selectedTopic, setSelectedTopic] = React.useState('')
  const [awaitingQuestionSubject, setAwaitingQuestionSubject] = React.useState(false)
  const [questionQueue, setQuestionQueue] = React.useState<BookletQuestion[]>([])
  const [questionQueueIndex, setQuestionQueueIndex] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [mistake, setMistake] = React.useState<MistakeContext | null>(null)
  const [customQuestion, setCustomQuestion] = React.useState<MistakeContext | null>(null)
  const [sampleQuestion, setSampleQuestion] = React.useState<BookletQuestion | null>(null)
  const [loadingQuestion, setLoadingQuestion] = React.useState(true)
  const [showDesmosDemo, setShowDesmosDemo] = React.useState(false)
  const [showWorkBoard, setShowWorkBoard] = React.useState(false)
  const [visualProblem, setVisualProblem] = React.useState<VisualProblem | null>(null)
  const [awaitingUnderstanding, setAwaitingUnderstanding] = React.useState(false)
  const [copilotStep, setCopilotStep] = React.useState<number | null>(null)
  const [copilotExamplesCompleted, setCopilotExamplesCompleted] = React.useState(0)
  const [autonomousMode, setAutonomousMode] = React.useState(false)
  const [boardLoading, setBoardLoading] = React.useState(false)
  const [boardError, setBoardError] = React.useState('')
  const [guestSignup, setGuestSignup] = React.useState(false)
  const [readyReport, setReadyReport] = React.useState<CoachReport | null>(null)
  const [compareStep, setCompareStep] = React.useState<number | null>(null)
  const [actionBusy, setActionBusy] = React.useState(false)
  const compareScore = React.useRef({ sat: 0, act: 0 })
  const improveRef = React.useRef<{ topics: CoachTopic[]; index: number } | null>(null)
  const boardRequestRef = React.useRef(0)
  const messagesRef = React.useRef(messages)
  const loadedMistakeRef = React.useRef(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  messagesRef.current = messages
  React.useEffect(() => {
    const saved = readThreads()
    setThreads(saved)
    setMessages([])
    setThreadId(crypto.randomUUID())
    threadsReady.current = true
    let cancelled = false
    void fetch('/api/ai/history')
      .then((response) => response.json())
      .then((data: { threads?: ChatThread[] }) => {
        if (cancelled || !Array.isArray(data.threads)) return
        setThreads((previous) => {
          const map = new Map(previous.map((thread) => [thread.id, thread]))
          for (const thread of data.threads ?? []) {
            if (!map.has(thread.id) && isRealThread(thread)) map.set(thread.id, thread)
          }
          return [...map.values()].filter(isRealThread).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 24)
        })
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (!threadsReady.current || !threadId) return
    const titleSource = messages.find((message) => message.role === 'user' && message.content.trim())
    if (!titleSource) return
    const title = titleSource.content.replace(/\s+/g, ' ').slice(0, 64)
    const thread: ChatThread = {
      id: threadId,
      title,
      updatedAt: new Date().toISOString(),
      messages: messages.map((message) => ({ role: message.role, content: message.content, board: message.board })),
    }
    setThreads((previous) => {
      const next = [thread, ...previous.filter((item) => item.id !== threadId)].slice(0, 24)
      try {
        window.localStorage.setItem(THREADS_KEY, JSON.stringify(next))
        window.localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
      } catch { /* ignore */ }
      return next
    })
    const timer = window.setTimeout(() => {
      void fetch('/api/ai/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: thread.id, title: thread.title, messages: thread.messages }),
      }).catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [messages, threadId])

  function openThread(thread: ChatThread) {
    setThreadId(thread.id)
    setMessages(thread.messages.filter((message) => message.role === 'user' || message.content.trim()))
    setShowWorkBoard(false)
    setVisualProblem(null)
    setBoardError('')
    setReadyReport(null)
    setCompareStep(null)
  }

  function newChat() {
    setThreadId(crypto.randomUUID())
    setMessages([])
    setShowWorkBoard(false)
    setVisualProblem(null)
    setBoardError('')
    setReadyReport(null)
    setCompareStep(null)
    setInput('')
  }

  React.useEffect(() => {
    window.localStorage.setItem('prep:chat-viewed', '1')
    window.localStorage.removeItem('prep:study-nudge')
    window.dispatchEvent(new Event('prep:chat-viewed'))
  }, [])
  const activeQuestion = customQuestion ?? mistake ?? sampleToMistake(sampleQuestion)

  const showDatabaseQuestion = React.useCallback((question: BookletQuestion, index: number, total: number) => {
    const context = sampleToMistake(question)
    if (!context) return
    setCustomQuestion(context)
    setCopilotStep(null)
    setShowWorkBoard(true)
    setVisualProblem(null)
    setBoardError('')
    setMessages((previous) => [...previous, {
      role: 'assistant',
      content: `I identified the topic as ${question.topic_name ?? 'the requested skill'}, pulled database question ${index + 1} of ${total}, and started the live breakdown.`,
    }])
  }, [])

  const startDatabaseQuestions = React.useCallback(async (
    subjectOrRequest: 'math' | 'english' | { sectionName: string; testType?: 'SAT' | 'ACT'; topicName?: string; originalRequest?: string },
    topicName?: string,
    originalRequest?: string,
  ) => {
    const request = typeof subjectOrRequest === 'string'
      ? { sectionName: subjectOrRequest === 'math' ? 'Math' : 'Reading and Writing', topicName, originalRequest }
      : subjectOrRequest
    setLoading(true)
    setAwaitingQuestionSubject(false)
    setMessages((previous) => [...previous, { role: 'user', content: request.originalRequest ?? request.sectionName }, { role: 'assistant', content: `Pulling a ${[request.testType, request.sectionName, request.topicName].filter(Boolean).join(' ')} question from the bank so we can break it down.` }])
    try {
      const query = new URLSearchParams({ count: '5', difficulty: 'mixed', mode: 'chat', sectionName: request.sectionName })
      if (request.testType) query.set('testType', request.testType)
      if (request.topicName) query.set('topicName', request.topicName)
      let response = await fetch(`/api/practice/questions?${query.toString()}`)
      let data = await response.json() as { questions?: BookletQuestion[]; error?: string }
      if (response.ok && !data.questions?.length && request.topicName) {
        query.delete('topicName')
        response = await fetch(`/api/practice/questions?${query.toString()}`)
        data = await response.json() as { questions?: BookletQuestion[]; error?: string }
      }
      if (response.ok && !data.questions?.length && request.sectionName === 'Reading') {
        query.set('sectionName', 'Reading and Writing')
        response = await fetch(`/api/practice/questions?${query.toString()}`)
        data = await response.json() as { questions?: BookletQuestion[]; error?: string }
      }
      if (!response.ok || !data.questions?.length) throw new Error(data.error ?? 'No questions were available.')
      const shuffled = [...data.questions].sort(() => Math.random() - 0.5)
      setQuestionQueue(shuffled)
      setQuestionQueueIndex(0)
      setMessages((previous) => previous.slice(0, -1))
      showDatabaseQuestion(shuffled[0], 0, shuffled.length)
    } catch (error) {
      setMessages((previous) => {
        const next = [...previous]
        next[next.length - 1] = { role: 'assistant', content: error instanceof Error ? error.message : 'I could not load database questions.' }
        return next
      })
    } finally { setLoading(false) }
  }, [showDatabaseQuestion])

  const buildBoard = React.useCallback(async (question: MistakeContext) => {
    const requestId = ++boardRequestRef.current
    setBoardLoading(true)
    setBoardError('')
    setVisualProblem(null)
    try {
      const res = await fetch('/api/ai/work-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.questionText,
          passage: question.passageContent ?? undefined,
          choices: question.choices,
          selectedAnswer: question.selectedAnswer,
          correctAnswer: question.correctAnswer,
          explanation: question.officialExplanation ?? undefined,
          section: question.sectionName,
        }),
      })
      const data = await res.json() as { error?: string; kind?: 'math' | 'reading'; steps?: VisualStep[]; answer?: string }
      if (!res.ok || !data.steps?.length || (data.kind !== 'math' && data.kind !== 'reading')) {
        throw new Error(data.error ?? 'Board unavailable')
      }
      if (requestId === boardRequestRef.current) setVisualProblem({ kind: data.kind, steps: data.steps, answer: data.answer, original: question.questionText ?? '' })
    } catch (err) {
      if (requestId === boardRequestRef.current) setBoardError(err instanceof Error ? err.message : 'I could not draw the steps yet. Ask me to try again.')
    } finally {
      if (requestId === boardRequestRef.current) setBoardLoading(false)
    }
  }, [])

  const loadAutonomousQuestion = React.useCallback(async () => {
    setBoardLoading(true)
    try {
      const response = await fetch('/api/practice/questions?count=1&difficulty=mixed&mode=chat')
      const data = await response.json() as { questions?: BookletQuestion[]; error?: string }
      const next = data.questions?.[0]
      if (!response.ok || !next) throw new Error(data.error ?? 'No independent question was available.')
      const context = sampleToMistake(next)
      if (!context) throw new Error('The independent question could not be loaded.')
      setCustomQuestion(context)
      setVisualProblem(null)
      setCopilotStep(null)
      setAutonomousMode(true)
      setShowWorkBoard(true)
      setMessages((previous) => [...previous, { role: 'assistant', content: 'Now solve this random database question independently. I will check your answer after you choose.' }])
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'I could not load another independent question.' }])
    } finally {
      setBoardLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!customQuestion?.questionId || !questionQueue.some((question) => question.id === customQuestion.questionId)) return
    void buildBoard(customQuestion)
  }, [buildBoard, customQuestion, questionQueue])

  const submitCopilotAttempt = React.useCallback((text: string) => {
    if (copilotStep === null || !visualProblem) return
    const step = visualProblem.steps[copilotStep]
    if (!step) return
    const isLast = copilotStep === visualProblem.steps.length - 1
    const correct = copilotAttemptMatches(text, step, visualProblem.answer, isLast)
    const nextStep = copilotStep + 1
    setMessages((previous) => [...previous, { role: 'user', content: text }, { role: 'assistant', content: correct ? 'That step works. I added it to our shared work; now try the next step.' : 'That step needs a fix, so I completed it on the board for you. You take control again on the next step.' }])
    setCopilotStep(nextStep)
    if (nextStep >= visualProblem.steps.length) {
      const completed = copilotExamplesCompleted + 1
      setCopilotExamplesCompleted(completed)
      if (completed >= 3) {
        setMessages((previous) => [...previous, { role: 'assistant', content: 'You finished three copilot examples. The next questions are independent, so I will not give hints.' }])
        void loadAutonomousQuestion()
      } else {
        setAwaitingUnderstanding(true)
        setMessages((previous) => [...previous, { role: 'assistant', content: 'Do you have any questions, or do you understand everything before the next related question?' }])
      }
    }
  }, [copilotExamplesCompleted, copilotStep, loadAutonomousQuestion, visualProblem])

  const submitAutonomousAnswer = React.useCallback((answer: string) => {
    if (!autonomousMode || !customQuestion) return
    const correct = answer === customQuestion.correctAnswer
    const correctChoice = customQuestion.choices?.find((choice) => choice.key === customQuestion.correctAnswer)
    setMessages((previous) => [...previous, { role: 'user', content: answer }, { role: 'assistant', content: correct ? 'Correct. Loading another independent database question.' : `Not quite. The correct answer was ${correctChoice?.text ?? customQuestion.correctAnswer ?? 'unavailable'}. Loading another independent question.` }])
    void loadAutonomousQuestion()
  }, [autonomousMode, customQuestion, loadAutonomousQuestion])

  const loadImproveTopic = React.useCallback(async (topic: CoachTopic) => {
    const questions = await pullQuestions({ count: 5, topicName: topic.name, sectionName: topic.section })
    setQuestionQueue(questions)
    setQuestionQueueIndex(0)
    showDatabaseQuestion(questions[0], 0, questions.length)
  }, [showDatabaseQuestion])

  const send = React.useCallback(async (text: string, trigger: TutorTrigger = 'chat', question?: MistakeContext | null) => {
    if (awaitingUnderstanding && !question) {
      if (/\b(yes|understand|understood|got it|ready|makes sense|continue)\b/i.test(text)) {
        const nextIndex = questionQueueIndex + 1
        const nextQuestion = questionQueue[nextIndex]
        setMessages((previous) => [...previous, { role: 'user', content: text }])
        setAwaitingUnderstanding(false)
        if (nextQuestion) {
          setQuestionQueueIndex(nextIndex)
          const context = sampleToMistake(nextQuestion)
          if (context) {
            setCustomQuestion(context)
            setShowWorkBoard(true)
            setAutonomousMode(false)
            setCopilotStep(0)
            setVisualProblem(null)
            setMessages((previous) => [...previous, { role: 'assistant', content: `Great — now we will solve another ${nextQuestion.topic_name ?? 'related'} question together. I will guide one step, and you will type the work.` }])
          }
        } else {
          const plan = improveRef.current
          if (plan && plan.index + 1 < plan.topics.length) {
            const finished = plan.topics[plan.index]
            plan.index += 1
            const nextTopic = plan.topics[plan.index]
            setMessages((previous) => [...previous, { role: 'assistant', content: `${finished?.name ?? 'That topic'} is done. Next: ${nextTopic.name}. Five questions.` }])
            void loadImproveTopic(nextTopic)
          } else {
            improveRef.current = null
            setMessages((previous) => [...previous, { role: 'assistant', content: 'You completed every related question in this set.' }])
          }
        }
      } else {
        setMessages((previous) => [...previous, { role: 'user', content: text }, { role: 'assistant', content: 'Tell me which word or step feels confusing, and I will explain that one small part before we continue.' }])
      }
      return
    }
    if (copilotStep !== null && visualProblem && !question) {
      submitCopilotAttempt(text)
      return
    }
    if (/^(hello|hi|hey|good morning|good afternoon|good evening)[!. ]*$/i.test(text.trim()) && !question) {
      setShowWorkBoard(false)
      setCustomQuestion(null)
      setVisualProblem(null)
      setBoardError('')
      setMessages((previous) => [...previous, { role: 'user', content: text }, { role: 'assistant', content: 'Hi! Ask me a SAT or ACT question whenever you are ready.' }])
      return
    }
    const asksDefinition = /^(what (is|are)|define|tell me about|what does)\b/i.test(text.trim()) && !/[=+÷×^√]|\d/.test(text)
    const asksForQuestions = /\b(generate|give|make|create)\b.*\bquestions?\b/i.test(text)
    const practice = practiceRequest(text)
    if (practice && !question) {
      setShowWorkBoard(false)
      setCustomQuestion(null)
      setVisualProblem(null)
      setAutonomousMode(false)
      setCopilotExamplesCompleted(0)
      setCopilotStep(null)
      void startDatabaseQuestions({ ...practice, originalRequest: text })
      return
    }
    const requestedTopic = requestedProblemTopic(text)
    if (requestedTopic && !question) {
      setShowWorkBoard(false)
      setCustomQuestion(null)
      setVisualProblem(null)
      setAutonomousMode(false)
      setCopilotExamplesCompleted(0)
      setCopilotStep(null)
      void startDatabaseQuestions(questionSubjectFromTopic(requestedTopic), requestedTopic, text)
      return
    }
    if (asksForQuestions && !question) {
      setShowWorkBoard(false)
      setCustomQuestion(null)
      setAwaitingQuestionSubject(true)
      setMessages((previous) => [...previous, { role: 'user', content: text }, { role: 'assistant', content: 'Would you like Math or English questions?' }])
      return
    }
    if (awaitingQuestionSubject && /^(math|english|reading|reading and writing)\b/i.test(text.trim())) {
      void startDatabaseQuestions(/^math\b/i.test(text.trim()) ? 'math' : 'english')
      return
    }
    if (asksDefinition && !question) {
      setShowWorkBoard(false)
      setCustomQuestion(null)
      setVisualProblem(null)
      setBoardError('')
      setMessages((previous) => [...previous, { role: 'user', content: text }, { role: 'assistant', content: localTeachingReply(text, selectedTopic) }])
      return
    }
    const academic = !asksDefinition && (trigger === 'wrong_answer' || shouldUseWorkBoard(text))
    const nextQuestion = question ?? (academic ? { ...contextFromUserText(text), topicName: selectedTopic || contextFromUserText(text).topicName } : null)
    if (academic && nextQuestion) {
      setShowWorkBoard(true)
      if (!question) setCustomQuestion(nextQuestion)
      void buildBoard(nextQuestion)
      setMessages((previous) => [...previous, { role: 'user', content: text }])
      return
    } else {
      setShowWorkBoard(false)
    }
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '', board: academic }])
    setLoading(true)
    try {
      const res = await fetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: true,
          trigger,
          messages: [...messagesRef.current, userMsg],
          context: nextQuestion
            ? {
                questionId: nextQuestion.questionId,
                questionText: [nextQuestion.passageContent, nextQuestion.questionText].filter(Boolean).join('\n\nQuestion: '),
                topicId: nextQuestion.topicId,
                topicName: nextQuestion.topicName ?? undefined,
                sectionName: nextQuestion.sectionName ?? undefined,
                selectedAnswer: nextQuestion.selectedAnswer,
                correctAnswer: nextQuestion.correctAnswer,
                choices: nextQuestion.choices,
                officialExplanation: nextQuestion.officialExplanation,
                submitted: Boolean(nextQuestion.selectedAnswer),
                isCorrect: nextQuestion.selectedAnswer ? false : undefined,
                desmosAvailable: isMathQuestion(nextQuestion),
                openChat: true,
              }
            : { desmosAvailable: false, openChat: true, topicName: selectedTopic || undefined },
        }),
      })

      let assembled = ''
      await readTutorStream(res, (chunk) => {
        assembled += chunk
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + chunk }
          return next
        })
      })

      if (!assembled.trim() || /hit a snag|connection issue|try again whenever/i.test(assembled)) {
        const fallback = localTeachingReply(text, selectedTopic)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: fallback }
          return next
        })
        assembled = fallback
      } else if (asksDefinition && !/\b(for example|example:|e\.g\.)\b/i.test(assembled)) {
        const withExample = `${assembled.trim()} Example: ${localTeachingReply(text, selectedTopic).split('Example: ').pop() ?? 'try one small case and check the rule.'}`
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: withExample }
          return next
        })
        assembled = withExample
      }

      const graphLines = graphLinesFromText(assembled)
      if (graphLines.length && isMathQuestion(nextQuestion)) {
        setShowDesmosDemo(true)
        desmos.setOpen(true)
        void desmos.applyActions(graphLines.map((latex, index) => ({
          type: 'addExpression',
          latex,
          id: `chat-demo-${Date.now()}-${index}`,
          color: index === 0 ? '#ff4b4b' : '#1cb0f6',
        })))
      }
    } catch {
      const fallback = localTeachingReply(text, selectedTopic)
      setMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: fallback }
        return next
      })
    } finally {
      setLoading(false)
    }
  }, [awaitingQuestionSubject, awaitingUnderstanding, buildBoard, copilotStep, desmos, loadImproveTopic, questionQueue, questionQueueIndex, selectedTopic, startDatabaseQuestions, submitCopilotAttempt, visualProblem])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  React.useEffect(() => {
    let cancelled = false
    async function loadQuestion() {
      setLoadingQuestion(true)
      try {
        const res = await fetch('/api/practice/questions?count=1&difficulty=mixed&mode=chat')
        const data = await res.json() as { questions?: BookletQuestion[] }
        if (!cancelled) setSampleQuestion(data.questions?.[0] ?? null)
      } catch {
        if (!cancelled) setSampleQuestion(null)
      } finally {
        if (!cancelled) setLoadingQuestion(false)
      }
    }
    void loadQuestion()
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    if (loadedMistakeRef.current) return
    loadedMistakeRef.current = true
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem(MISTAKE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as MistakeContext
      setMistake(parsed)
      setShowWorkBoard(true)
      if (params.get('from') === 'rapid-fire') {
        void send('I missed this Rapid Fire question. Break down exactly where I went wrong, show the best method, then give me one harder follow-up question so I can prove I understand.', 'wrong_answer', parsed)
      } else {
        void buildBoard(parsed)
      }
    } catch {
      window.sessionStorage.removeItem(MISTAKE_KEY)
    }
  }, [params, send, buildBoard])

  function requireAccount() {
    if (!guestPreview) return false
    setGuestSignup(true)
    return true
  }

  async function runPractice() {
    if (requireAccount() || actionBusy) return
    setCompareStep(null)
    setReadyReport(null)
    setActionBusy(true)
    setLoading(true)
    try {
      const report = await loadCoach()
      const focus = report.focus
      const reason = focus?.total
        ? `You are ${Math.round((focus.accuracy ?? 0) * 100)}% on ${focus.name} from practice, Rapid Fire, exams, and games. This question is from that weak spot.`
        : focus
          ? `${focus.name} has not been assessed yet in Rapid Fire, practice tests, or games. Start here.`
          : 'Nothing is weak or unassessed yet, so this is a fresh bank question.'
      setMessages((previous) => [...previous, { role: 'user', content: 'Practice Problem' }, { role: 'assistant', content: reason }])
      const questions = await pullQuestions({ count: 1, topicName: focus?.name, sectionName: focus?.section })
      setQuestionQueue(questions)
      setQuestionQueueIndex(0)
      showDatabaseQuestion(questions[0], 0, 1)
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'Could not load a practice problem.' }])
    } finally {
      setLoading(false)
      setActionBusy(false)
    }
  }

  function startCompare() {
    if (requireAccount() || actionBusy) return
    compareScore.current = { sat: 0, act: 0 }
    setReadyReport(null)
    setCompareStep(0)
    setMessages((previous) => [...previous, { role: 'user', content: 'SAT vs ACT' }, { role: 'assistant', content: COMPARE_QUESTIONS[0].prompt }])
  }

  async function answerCompare(side: 'sat' | 'act') {
    if (compareStep === null || actionBusy) return
    const current = COMPARE_QUESTIONS[compareStep]
    compareScore.current[side] += 1
    const next = compareStep + 1
    if (next < COMPARE_QUESTIONS.length) {
      setCompareStep(next)
      setMessages((previous) => [...previous, { role: 'user', content: current[side] }, { role: 'assistant', content: COMPARE_QUESTIONS[next].prompt }])
      return
    }
    setCompareStep(null)
    setActionBusy(true)
    setLoading(true)
    const winner = compareScore.current.sat >= compareScore.current.act ? 'SAT' : 'ACT'
    try {
      const [satQuestions, actQuestions] = await Promise.all([
        pullQuestions({ count: 1, testType: 'SAT' }),
        pullQuestions({ count: 1, testType: 'ACT' }),
      ])
      const sat = satQuestions[0]
      const act = actQuestions[0]
      const featured = winner === 'SAT' ? sat : act
      setMessages((previous) => [...previous, { role: 'user', content: current[side] }, {
        role: 'assistant',
        content: `From those answers, the ${winner} fits you better (${compareScore.current.sat} SAT, ${compareScore.current.act} ACT).\n\nSAT example: ${sat.question_text.replace(/\s+/g, ' ').slice(0, 220)}\n\nACT example: ${act.question_text.replace(/\s+/g, ' ').slice(0, 220)}\n\nThe ${winner} example is open in Breakdown.`,
      }])
      setQuestionQueue([featured])
      setQuestionQueueIndex(0)
      showDatabaseQuestion(featured, 0, 1)
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'Could not load example questions.' }])
    } finally {
      setLoading(false)
      setActionBusy(false)
    }
  }

  async function runReady() {
    if (requireAccount() || actionBusy) return
    setCompareStep(null)
    setActionBusy(true)
    try {
      const report = await loadCoach()
      setReadyReport(report)
      setShowWorkBoard(false)
      const weakLine = report.weak.slice(0, 3).map((topic) => `${topic.name} ${Math.round((topic.accuracy ?? 0) * 100)}%`).join(', ')
      setMessages((previous) => [...previous, { role: 'user', content: 'Ready %' }, {
        role: 'assistant',
        content: `Readiness is ${report.readiness}%. ${report.predicted != null ? `Predicted score ${report.predicted}. ` : ''}${weakLine ? `Improve ${weakLine} before test day.` : 'Answer a few more questions so the weak spots can get specific.'} The full account card is on the right.`,
      }])
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'Could not load readiness.' }])
    } finally {
      setActionBusy(false)
    }
  }

  async function runImprove() {
    if (requireAccount() || actionBusy) return
    setCompareStep(null)
    setReadyReport(null)
    setActionBusy(true)
    setLoading(true)
    try {
      const report = await loadCoach()
      const topics = (report.weak.length ? report.weak : report.unseen).slice(0, 4)
      if (!topics.length) {
        setMessages((previous) => [...previous, { role: 'user', content: 'Improve' }, { role: 'assistant', content: 'No weak or unassessed topics yet. Take a few Rapid Fire or practice questions and I can target them.' }])
        return
      }
      improveRef.current = { topics, index: 0 }
      const list = topics.map((topic) => topic.total ? `${topic.name} (${Math.round((topic.accuracy ?? 0) * 100)}%)` : `${topic.name} (not assessed)`).join(', ')
      setMessages((previous) => [...previous, { role: 'user', content: 'Improve' }, { role: 'assistant', content: `Weak spots: ${list}. Five questions on ${topics[0].name}, then the next topic.` }])
      await loadImproveTopic(topics[0])
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'Could not start improvement questions.' }])
    } finally {
      setLoading(false)
      setActionBusy(false)
    }
  }

  async function runTricks() {
    if (requireAccount() || actionBusy) return
    setCompareStep(null)
    setReadyReport(null)
    setActionBusy(true)
    setLoading(true)
    try {
      const report = await loadCoach()
      const focus = report.focus
      const trick = trickFor(focus?.name ?? '')
      setMessages((previous) => [...previous, { role: 'user', content: 'Tricks' }, { role: 'assistant', content: `${focus ? `${focus.name}: ` : ''}${trick} Use that on the question in Breakdown.` }])
      const questions = await pullQuestions({ count: 1, topicName: focus?.name, sectionName: focus?.section })
      setQuestionQueue(questions)
      setQuestionQueueIndex(0)
      showDatabaseQuestion(questions[0], 0, 1)
    } catch (error) {
      setMessages((previous) => [...previous, { role: 'assistant', content: error instanceof Error ? error.message : 'Could not load a trick question.' }])
    } finally {
      setLoading(false)
      setActionBusy(false)
    }
  }

  function runAction(id: (typeof CHAT_ACTIONS)[number]['id']) {
    if (id === 'practice') void runPractice()
    else if (id === 'compare') startCompare()
    else if (id === 'ready') void runReady()
    else if (id === 'improve') void runImprove()
    else void runTricks()
  }

  function sendMessage() {
    if (guestPreview) {
      setGuestSignup(true)
      return
    }
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const queuedQuestion = questionQueue[questionQueueIndex]
    const answer = text.match(/^([A-D])(?:[.)\s]|$)/i)?.[1]?.toUpperCase()
    if (queuedQuestion && answer) {
      const context = sampleToMistake(queuedQuestion)
      if (!context) return
      const selectedChoice = queuedQuestion.choices.find((choice) => (choice.label ?? choice.key).toUpperCase() === answer)
      const selectedKey = selectedChoice?.key ?? answer
      const answered = { ...context, selectedAnswer: selectedKey }
      setCustomQuestion(answered)
      setShowWorkBoard(true)
      setMessages((previous) => [...previous, { role: 'user', content: answer }, {
        role: 'assistant',
        content: selectedKey === queuedQuestion.correct_answer
          ? 'Correct. Review the method in Breakdown, then move to the next question.'
          : 'Let’s fix it together. Follow the marked steps in Breakdown.',
      }])
      void buildBoard(answered)
      return
    }
    const refersToMiss = Boolean(mistake && /\b(this|that|same|mistake|my answer|why was|try again|next step|continue)\b/i.test(text))
    void send(text, refersToMiss ? 'wrong_answer' : 'chat', refersToMiss ? mistake : null)
  }

  function openDesmosDemo() {
    if (!activeQuestion || !isMathQuestion(activeQuestion)) return
    setShowDesmosDemo(true)
    desmos.setOpen(true)
    void send('Show me how to set up this problem visually in Desmos. Only include equations that should actually be graphed.', 'chat', activeQuestion)
  }

  const handleLessonComplete = React.useCallback(() => {
    if (copilotStep !== null || awaitingUnderstanding) return
    setAwaitingUnderstanding(true)
    setMessages((previous) => [...previous, { role: 'assistant', content: 'Do you have any questions, or do you understand everything before we try the next related question together?' }])
  }, [awaitingUnderstanding, copilotStep])

  return (
    guestSignup ? <PreviewSignup /> : (
      <section className="mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 overflow-hidden rounded-[1.8rem] border border-[#d9e8f5] bg-white shadow-[0_18px_50px_rgba(28,80,140,0.08)] sm:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className="flex min-h-0 flex-col bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_140px)] sm:border-r sm:border-[#e6eef6]">
          <div className="flex items-center gap-2 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#8aa0b5]">Previous chats</p>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {threads.filter(isRealThread).map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => openThread(thread)}
                  className={cn('max-w-44 shrink-0 truncate rounded-full border px-3 py-1 text-xs font-bold', thread.id === threadId ? 'border-[#1cb0f6] bg-[#e8f6ff] text-[#0d6f9b]' : 'border-transparent bg-white text-[#3c3c3c] shadow-sm')}
                >
                  {thread.title}
                </button>
              ))}
            </div>
            <button type="button" onClick={newChat} className="shrink-0 rounded-full bg-[#1cb0f6] px-3 py-1.5 text-xs font-extrabold text-white shadow-[0_3px_0_#1899d6]">New</button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-2">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.3rem] bg-[linear-gradient(135deg,#1cb0f6,#7c5cff)] text-white shadow-[0_10px_0_#1899d6]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <p className="font-display text-3xl text-[#243044]">Ready when you are</p>
                <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[#7d8da1]">Pick a card or type a question. The chat stays empty until you do.</p>
              </div>
            ) : messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[86%] px-4 py-3 text-sm font-semibold leading-6', msg.role === 'user' ? 'rounded-[1.4rem] rounded-br-md bg-[linear-gradient(180deg,#3cc4ff,#1cb0f6)] text-white shadow-[0_6px_0_#1899d6]' : 'rounded-[1.4rem] rounded-bl-md border border-[#e6eef6] bg-white text-[#243044] shadow-[0_8px_24px_rgba(36,48,68,0.06)]')}>
                  {msg.content ? <TutorRichText text={msg.board && msg.role === 'assistant' ? firstSentence(msg.content) : msg.content} /> : <span className="inline-flex items-center gap-2 text-[#7d8da1]"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</span>}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-[#e6eef6] bg-white/90 p-3 backdrop-blur">
            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {CHAT_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={actionBusy}
                    onClick={() => runAction(action.id)}
                    className="flex min-h-[4.6rem] flex-col items-start justify-between rounded-2xl border bg-white px-2.5 py-2 text-left shadow-[0_4px_0_#e7eef5] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                    style={{ borderColor: action.face, background: action.soft }}
                  >
                    <Icon className="h-4 w-4" style={{ color: action.face }} />
                    <span>
                      <span className="block text-[11px] font-extrabold leading-4 text-[#243044]">{action.label}</span>
                      <span className="mt-0.5 block text-[10px] font-semibold leading-3 text-[#6d7f93]">{action.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            {compareStep !== null ? (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void answerCompare('sat')} className="rounded-2xl border border-[#b9e4ff] bg-white px-3 py-3 text-left text-sm font-extrabold text-[#0d6f9b] shadow-[0_3px_0_#d7f0ff]">{COMPARE_QUESTIONS[compareStep].sat}</button>
                <button type="button" onClick={() => void answerCompare('act')} className="rounded-2xl border border-[#ffd7a8] bg-white px-3 py-3 text-left text-sm font-extrabold text-[#a15c00] shadow-[0_3px_0_#ffe7c7]">{COMPARE_QUESTIONS[compareStep].act}</button>
              </div>
            ) : null}
            <div className="flex items-end gap-2 rounded-[1.4rem] border border-[#d9e8f5] bg-[#f8fbfe] p-1.5">
              <textarea id="chat-input" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage() } }} rows={1} placeholder="Ask any question…" className="max-h-24 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm font-bold text-[#243044] outline-none placeholder:text-[#9aafc2]" />
              <button type="button" onClick={sendMessage} disabled={loading || !input.trim()} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#58cc02] text-white shadow-[0_4px_0_#46a302] disabled:opacity-40" aria-label="Send message"><Send className="h-5 w-5" /></button>
            </div>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#fffdf8,#eef6ff)] p-5">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: 'radial-gradient(#d5e4f2 1.1px, transparent 1.1px)', backgroundSize: '18px 18px' }} />
          <div className="relative flex min-h-0 flex-1 flex-col">
          <p className="font-display text-3xl text-[#243044]">Breakdown</p>
          <div className="relative mt-3 min-h-0 flex-1 overflow-y-auto">
            {readyReport ? (
              <div className="space-y-3">
                <div className="rounded-[1.4rem] border border-white/70 bg-white/70 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#777]">Readiness</p>
                  <p className="mt-1 font-display text-5xl leading-none text-[#3c3c3c]">{readyReport.readiness}%</p>
                  <p className="mt-2 text-sm font-bold text-[#777]">
                    {readyReport.predicted != null ? `Predicted ${readyReport.predicted}` : 'No predicted score yet'}
                    {readyReport.target != null ? ` · goal ${readyReport.target}` : ''}
                    {readyReport.preference ? ` · ${readyReport.preference}` : ''}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-sm font-bold text-[#3c3c3c]">
                  <p>{readyReport.answered} questions answered · {readyReport.correct} correct · {Math.round(readyReport.accuracy * 100)}% accuracy</p>
                  {readyReport.testDate ? <p className="mt-1 text-[#777]">Test date {readyReport.testDate}</p> : null}
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#777]">Improve before test day</p>
                  {(readyReport.weak.length ? readyReport.weak : readyReport.unseen).slice(0, 6).map((topic) => (
                    <div key={topic.name} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm font-bold">
                      <span>{topic.name}</span>
                      <span className="text-[#ff9600]">{topic.total ? `${Math.round((topic.accuracy ?? 0) * 100)}%` : 'Not assessed'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {showWorkBoard && !readyReport ? (
              <WorkBoard
                embedded
                active={activeQuestion}
                onDesmosDemo={openDesmosDemo}
                loadingQuestion={boardLoading}
                visualProblem={visualProblem}
                onLessonComplete={handleLessonComplete}
                copilotStep={copilotStep}
                onCopilotSubmit={submitCopilotAttempt}
                autonomousMode={autonomousMode}
                onAutonomousAnswer={submitAutonomousAnswer}
              />
            ) : null}
            {!showWorkBoard && !readyReport ? (
              <div className="flex h-full flex-col items-center justify-center rounded-[1.6rem] border border-dashed border-[#c9dced] bg-white/70 px-6 text-center">
                <p className="font-display text-2xl text-[#243044]">Steps show up here</p>
                <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-[#7d8da1]">Start a practice problem and the breakdown stays on this side.</p>
              </div>
            ) : null}
            {boardError ? <p className="mt-3 rounded-xl bg-[#fff0f0] p-3 text-sm font-bold text-[#b72525]">{boardError}</p> : null}
            {showDesmosDemo && desmos.open && isMathQuestion(activeQuestion) ? (
              <div className="mt-3 overflow-hidden rounded-2xl border-2 border-[#e5e5e5] bg-white">
                <div className="flex items-center gap-2 border-b border-[#f0f0f0] p-3">
                  <Calculator className="h-5 w-5 text-[#1cb0f6]" />
                  <p className="font-display text-lg text-[#3c3c3c]">Desmos demo</p>
                </div>
                <div className="h-[280px]"><DesmosPanel embedded /></div>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </section>
    )
  )
}

export function ChatClient({ guestPreview = false }: { guestPreview?: boolean }) {
  return (
    <DesmosProvider enabled>
      <ChatInner guestPreview={guestPreview} />
    </DesmosProvider>
  )
}
