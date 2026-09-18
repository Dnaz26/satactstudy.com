import { examplesForLevel, normalizeExampleSet, type LessonExampleSet } from './examples'
import { tagDifficulties, type StudyLevel, type StudyProblem, type StudyRank } from './types'

export type GuidedLesson = {
  title: string
  /** Step 1 — one-sentence super-simple definition */
  whatItIs: string
  /** Step 2 — one-sentence real-world example */
  irlExample: string
  /** Step 3 — parts, analysis, how to understand it */
  breakdown: string
  /** Step 4 — agent-built example the student translates / analyzes */
  translateExample: string
  examples: LessonExampleSet
  problems: StudyProblem[]
}

/**
 * Copilot lesson framework (agent tracks internally; not shown as a UI checklist):
 * 1 Definition → 2 IRL example → 3 Breakdown → 4 Build/translate →
 * 5 Correct examples → 6 Incorrect examples → 7 Explain back →
 * 8 Practice 5 → 9 Create a question
 */
export const LESSON_STEPS = [
  { id: 'definition', label: 'Definition', role: 'agent' },
  { id: 'irlExample', label: 'Real-world example', role: 'agent' },
  { id: 'breakdown', label: 'Breakdown', role: 'agent' },
  { id: 'build', label: 'Build & translate', role: 'student' },
  { id: 'yesExamples', label: 'Correct examples', role: 'agent' },
  { id: 'noExamples', label: 'Incorrect examples', role: 'agent' },
  { id: 'explainBack', label: 'Your words', role: 'student' },
  { id: 'practice', label: 'Practice 5', role: 'student' },
  { id: 'create', label: 'Build a question', role: 'student' },
] as const

export type LessonStepId = (typeof LESSON_STEPS)[number]['id']

/** Internal agent checklist — same order as LESSON_STEPS. */
export const LESSON_AGENT_CHECKLIST = LESSON_STEPS.map((step) => ({
  id: step.id,
  label: step.label,
}))

export const PRACTICE_DIFFICULTY_LADDER: StudyRank[] = [
  'easy',
  'easy',
  'medium',
  'medium',
  'hard',
]

export const EXPLAIN_PASS_SCORE = 85
export const BUILD_PASS_SCORE = 70
export const CREATE_PASS_SCORE = 85
export const CREATE_SAVE_SCORE = 95

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Keep kid-friendly definitions short (1–2 plain sentences). */
function simpleDef(text: string, fallback: string): string {
  const cleaned = clean(text)
  if (!cleaned) return fallback
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 2)
  const joined = parts.join(' ')
  if (joined.length <= 220) {
    return /[.!?]$/.test(joined) ? joined : `${joined}.`
  }
  return `${clean(joined.slice(0, 210))}…`
}

function oneSentence(text: string, fallback: string): string {
  const cleaned = clean(text)
  if (!cleaned) return fallback
  const first = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned
  if (first.length <= 160) {
    return /[.!?]$/.test(first) ? first : `${first}.`
  }
  return `${clean(first.slice(0, 150))}…`
}

const GUIDED_OVERRIDES: Record<string, Partial<GuidedLesson>> = {
  'Numerical Identity & Number Systems': {
    whatItIs:
      'Every number has an identity: natural numbers count (1, 2, 3), whole numbers add 0, integers add negatives, rationals are ratios, irrationals like pi never repeat, and all of them live inside the real numbers.',
    irlExample: 'Sorting players by jersey number uses natural numbers, while a bank balance of -$20 needs integers.',
    breakdown:
      'Natural ⊂ Whole ⊂ Integers ⊂ Rational ⊂ Real ⊂ Complex. Irrationals are real but not rational. Classify each number into every set it fits: 5 is all six, -3 skips natural and whole, and √-1 is imaginary.',
    translateExample: '7',
  },
  'Linear functions': {
    whatItIs:
      'A linear function is a steady prediction machine. It tells you how much something grows or shrinks at the same speed every time.',
    irlExample:
      'If you sell t-shirts and want to know how many you must sell to make 500 dollars, a linear function can help you predict that.',
    breakdown:
      'm is how fast the amount changes each step. b is where you start when you have sold zero. Together they make a straight-line prediction.',
    translateExample: 'y = x + 4',
  },
}

function asWhatItIs(level: StudyLevel, teach: string[]): string {
  const first = teach[0]
  if (first) {
    return simpleDef(
      first,
      `${level.title} is a simple idea you can use on the SAT and ACT.`,
    )
  }
  return simpleDef(
    `${level.title} is a simple idea you can use on many test questions.`,
    `${level.title} is a simple test idea.`,
  )
}

function asIrlExample(level: StudyLevel, title: string): string {
  const seed = clean(level.example)
  if (seed && !/\?$/.test(seed) && seed.length > 8 && !/which|what is|solve/i.test(seed)) {
    return oneSentence(
      seed.startsWith('Counting') || seed.length < 90
        ? seed
        : `You can use ${title} in real life like this: ${seed}`,
      `You can use ${title} to figure something out in real life.`,
    )
  }
  return oneSentence(
    `You can use ${title} to figure something out in everyday life, like counting or predicting.`,
    `You can use ${title} in real life.`,
  )
}

function asBreakdown(teach: string[], tricks: string[], title: string): string {
  const chunks = [...teach.slice(1), ...tricks.slice(0, 2)].map(clean).filter(Boolean)
  if (chunks.length >= 1) return clean(chunks.join(' '))
  return clean(
    `Break ${title} into clear parts. Name each part, say what job it does, and show how you would analyze a new example from scratch.`,
  )
}

function padPracticeProblems(level: StudyLevel, source: StudyProblem[]): StudyProblem[] {
  const base = tagDifficulties(source.length ? source : level.problems, Math.max(5, source.length || level.problems.length))
  const byRank: Record<StudyRank, StudyProblem[]> = { easy: [], medium: [], hard: [] }
  for (const item of base) {
    byRank[item.difficulty ?? 'easy'].push(item)
  }
  const out: StudyProblem[] = []
  for (const rank of PRACTICE_DIFFICULTY_LADDER) {
    const pool = byRank[rank]
    const pick = pool[out.filter((p) => p.difficulty === rank).length % Math.max(1, pool.length)]
      ?? base[out.length % Math.max(1, base.length)]
      ?? level.problems[0]
    if (pick) out.push({ ...pick, difficulty: rank })
  }
  return out
}

function liveExample(level: StudyLevel, override?: string): string {
  const candidate = clean(override || '')
  if (
    candidate
    && !/\?$/.test(candidate)
    && !/^(which of the following|which is|which sentence|what is|pick the|choose the)\b/i.test(candidate)
  ) {
    return candidate
  }
  for (const problem of level.problems) {
    const correct = problem.choices.find((c) => c.key === problem.answer)?.text
    if (correct?.trim()) return clean(correct)
  }
  const seed = clean(level.example)
  if (seed && !/\?$/.test(seed)) return seed
  return level.title
}

/** Build guided lesson content for the copilot tutoring screen. */
export function buildGuidedLesson(
  level: StudyLevel,
  override?: Omit<Partial<GuidedLesson>, 'examples'> & {
    examples?: Partial<LessonExampleSet> | null
  },
): GuidedLesson {
  const curated = GUIDED_OVERRIDES[level.title] ?? {}
  const teach = level.teach.map(clean).filter(Boolean)
  const tricks = level.tricks.map(clean).filter(Boolean)
  const merged = { ...curated, ...override }
  // Keep hand-tuned kid-friendly definition / real-life example when we have them.
  if (curated.whatItIs) merged.whatItIs = curated.whatItIs
  if (curated.irlExample) merged.irlExample = curated.irlExample
  const problemsSource = merged.problems?.length ? merged.problems : level.problems

  return {
    title: level.title,
    whatItIs: simpleDef(
      merged.whatItIs || asWhatItIs(level, teach),
      `${level.title} is a simple test idea.`,
    ),
    irlExample: oneSentence(
      merged.irlExample || asIrlExample(level, level.title),
      `You can use ${level.title} in real life.`,
    ),
    breakdown: merged.breakdown || asBreakdown(teach, tricks, level.title),
    translateExample: liveExample(level, merged.translateExample),
    examples: normalizeExampleSet(level, merged.examples ?? examplesForLevel(level)),
    problems: padPracticeProblems(level, problemsSource),
  }
}
