import { examplesForLevel, normalizeExampleSet, type LessonExampleSet } from './examples'
import { tagDifficulties, type StudyLevel, type StudyProblem, type StudyRank } from './types'

export type GuidedLesson = {
  title: string
  whatItIs: string
  breakdown: string
  translateExample: string
  examples: LessonExampleSet
  problems: StudyProblem[]
}

/**
 * Copilot lesson arc:
 * Agent teaches (what → yes → no), then student works (explain → practice → create).
 */
export const LESSON_STEPS = [
  { id: 'what', label: 'What it is', role: 'agent' },
  { id: 'yesExamples', label: 'Correct examples', role: 'agent' },
  { id: 'noExamples', label: 'Incorrect examples', role: 'agent' },
  { id: 'explainBack', label: 'Your words', role: 'student' },
  { id: 'practice', label: 'Practice 5', role: 'student' },
  { id: 'create', label: 'Build a question', role: 'student' },
] as const

export type LessonStepId = (typeof LESSON_STEPS)[number]['id']

export const PRACTICE_DIFFICULTY_LADDER: StudyRank[] = [
  'easy',
  'easy',
  'medium',
  'medium',
  'hard',
]

export const EXPLAIN_PASS_SCORE = 85
export const CREATE_PASS_SCORE = 85
export const CREATE_SAVE_SCORE = 95

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

const GUIDED_OVERRIDES: Record<string, Partial<GuidedLesson>> = {
  'Whole numbers': {
    whatItIs:
      'Whole numbers are the counting numbers starting at 0 — like 0, 1, 2, 3. No fractions, decimals, or negatives.',
    breakdown:
      'A whole number is a complete count. If you see a slash, a decimal point, or a minus sign, it is not a whole number.',
    translateExample: '7',
  },
  'Linear functions': {
    whatItIs:
      'A linear function is a steady-rate machine: put in x, get out y on a straight line. It looks like y = mx + b.',
    breakdown:
      'm is the slope (how fast y changes). b is the starting value when x is 0.',
    translateExample: 'y = x + 4',
  },
}

function asWhatItIs(level: StudyLevel, teach: string[]): string {
  const first = teach[0]
  if (first) {
    const short = clean(first)
    if (short.length <= 160) return short
    return clean(`${short.slice(0, 150)}…`)
  }
  return clean(`${level.title} is a test skill you can reuse on many SAT/ACT items.`)
}

function asBreakdown(teach: string[], tricks: string[], title: string): string {
  const chunks = [...teach.slice(1), ...tricks.slice(0, 1)].map(clean).filter(Boolean)
  if (chunks.length >= 1) return clean(chunks.join(' '))
  return clean(`Break ${title} into clear parts. Name each part and say what job it does.`)
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
  const problemsSource = merged.problems?.length ? merged.problems : level.problems

  return {
    title: level.title,
    whatItIs: merged.whatItIs || asWhatItIs(level, teach),
    breakdown: merged.breakdown || asBreakdown(teach, tricks, level.title),
    translateExample: liveExample(level, merged.translateExample),
    examples: normalizeExampleSet(level, merged.examples ?? examplesForLevel(level)),
    problems: padPracticeProblems(level, problemsSource),
  }
}
