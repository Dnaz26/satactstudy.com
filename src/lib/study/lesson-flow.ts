import { bankExamplesForTitle, examplesForLevel, normalizeExampleSet, type LessonExample, type LessonExampleSet } from './examples'
import { type StudyLevel, type StudyProblem, type StudyRank } from './types'
import { textUsesUntaught, untaughtPhrases, withoutUntaughtSentences } from './taught-scope'

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
  connections?: { yes: LessonExample[]; no: LessonExample[] }
  stages: LessonStage[]
  problems: StudyProblem[]
}

export type LessonStage = {
  level: 'easy' | 'medium' | 'hard' | 'very hard' | 'upper range'
  title: string
  newSkills: string[]
  explanation: string
  workedExamples: string[]
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
  { id: 'build', label: 'Understanding check', role: 'student' },
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
  'medium',
  'hard',
  'hard',
  'hard',
]

export const LESSON_STAGE_LEVELS: LessonStage['level'][] = ['easy', 'medium', 'hard', 'very hard', 'upper range']

/** A tutoring explanation passes when the score is above 70. */
export const EXPLAIN_PASS_SCORE = 70

export function explanationPassed(score: number): boolean {
  return score > EXPLAIN_PASS_SCORE
}
export const BUILD_PASS_SCORE = 70
export const CREATE_PASS_SCORE = 70
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

/**
 * One thing at a time: when a teach entry packs several "Name: ..." ideas
 * into one string (e.g. "Commutative: ... Associative: ... Distributive: ..."),
 * keep ONLY the first concept for the definition step. Later steps teach the rest.
 */
function firstConceptOnly(text: string): string {
  const cleaned = clean(text)
  if (!cleaned) return cleaned
  const clauses = cleaned.match(/[A-Z][a-z]+\s*:[^.;!?]+[.;!?]?/g)
  if (clauses && clauses.length >= 2) return clean(clauses[0])
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length >= 2 && /^[A-Z][a-z]+\s*:/.test(sentences[1] ?? '')) {
    return clean(sentences[0] ?? cleaned)
  }
  return cleaned
}

function hasConcreteExample(text: string): boolean {
  return /[0-9]/.test(text) || /=/.test(text) || /\bfor example\b/i.test(text)
}

/** Strip teacher-prose prefixes so board math starts at the numbers. */
function stripProsePrefix(text: string): string {
  const stripped = clean(text).replace(
    /^.*?\b(look at|consider|take|say|suppose|imagine|like|for instance|e\.g\.?|such as)\s+(?=[0-9a-z])/i,
    '',
  )
  return clean(stripped) || clean(text)
}

/**
 * Every definition must end with one tiny worked example with real numbers,
 * e.g. commutative -> "For example, 3 + 5 = 5 + 3."
 */
function withConcreteExample(def: string, level: StudyLevel): string {
  const cleaned = clean(def)
  if (!cleaned) return cleaned
  const punctuated = /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
  if (hasConcreteExample(cleaned)) return punctuated
  const seed = clean(level.example)
  const seedRepeatsRule = seed.length > 0 && punctuated.toLowerCase().includes(seed.toLowerCase().replace(/[.!?]+$/, ''))
  if (seed && !seedRepeatsRule && !/\?$/.test(seed) && seed.length > 8 && /[0-9=]/.test(seed)) {
    const one = seed.split(/(?<=[.!?])\s+/)[0] ?? seed
    const ex = stripProsePrefix(one.length <= 140 ? one : `${clean(one.slice(0, 130))}…`)
    const lower = ex.charAt(0).toLowerCase() + ex.slice(1)
    const exPunctuated = /[.!?]$/.test(lower) ? lower : `${lower}.`
    return `${punctuated} For example, ${exPunctuated}`
  }
  for (const problem of level.problems) {
    const correct = problem.choices.find((c) => c.key === problem.answer)?.text
    if (correct && /[0-9=]/.test(correct)) {
      const ex = clean(correct)
      return `${punctuated} For example, ${ex}${/[.!?]$/.test(ex) ? '' : '.'}`
    }
  }
  return punctuated
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
    stages: [
      {
        level: 'easy',
        title: 'Start with the line',
        newSkills: ['slope', 'y-intercept', 'function input'],
        explanation: 'Start from 3rd-grade whole-number adding, subtracting, multiplying, and dividing. In y = mx + b, m is the change for one step and b is the value when x = 0. To find f(2), replace every x with 2. Check: if f(x) = 4x + 1, what is f(3)?',
        workedExamples: ['y = 3x + 1 has slope 3 and y-intercept 1.', 'If f(x) = 3x + 1, then f(2) = 3(2) + 1 = 7.'],
      },
      {
        level: 'medium',
        title: 'Add signed arithmetic and distribution',
        newSkills: ['negative numbers', 'adding like terms', 'distributive property'],
        explanation: 'A minus sign changes the sign of every term inside parentheses. After distributing, combine x terms with x terms and plain numbers with plain numbers. Check: what is 5x - 2(x + 3)?',
        workedExamples: ['2(3x + 4) = 6x + 8.', '7x - 2(3x + 4) = 7x - 6x - 8 = x - 8.'],
      },
      {
        level: 'hard',
        title: 'Add fractions and division',
        newSkills: ['fraction coefficients', 'common denominators', 'clearing denominators'],
        explanation: 'A fraction bar means division. You may combine fractions with a common denominator or multiply the whole equation by a common denominator to remove them. Check: if x/2 + 1 = 5, what is x?',
        workedExamples: ['(7x - 13)/5 means divide the entire expression 7x - 13 by 5.', 'If x/3 + 2 = 6, multiply every term by 3: x + 6 = 18, so x = 12.'],
      },
      {
        level: 'very hard',
        title: 'Add substituted inputs and parameters',
        newSkills: ['function substitution', 'expressions as inputs', 'unknown parameters'],
        explanation: 'An input can be a whole expression. Put parentheses around it everywhere x appears. A parameter is a letter whose value must make all given conditions true. Check: if f(x) = x + 4, what is f(a - 1)?',
        workedExamples: ['If f(x) = 2x - 5, then f(2a - 3) = 2(2a - 3) - 5 = 4a - 11.', 'If 4a - 11 = a + 7, then 3a = 18 and a = 6.'],
      },
      {
        level: 'upper range',
        title: 'Combine conditions and compare powers',
        newSkills: ['multiple conditions', 'equivalent forms', 'linear versus exponential structure'],
        explanation: 'Use one condition to find the parameter, then use that value in the next condition. An exponent on the variable, such as x², makes a rule nonlinear, so first check whether the power belongs to a coefficient, an input, or the variable itself. Check: is 4x² a linear function of x?',
        workedExamples: ['If f(2a - 3) finds a, substitute that same a into f(4a + 9).', '3²x means 9x and is linear, but 3x² has x squared and is not linear.'],
      },
    ],
  },
}

function defaultStages(level: StudyLevel, teach: string[], tricks: string[]): LessonStage[] {
  const ideas = [...teach, ...tricks].map(clean).filter(Boolean)
  const idea = (index: number) => ideas[index % Math.max(1, ideas.length)] || `the next part of ${level.title}`
  const labels: LessonStage['level'][] = ['easy', 'medium', 'hard', 'very hard', 'upper range']
  return labels.map((stage, index) => ({
    level: stage,
    title: index === 0 ? 'Build the foundation' : `Add one new layer: ${stage}`,
    newSkills: [idea(index)],
    explanation: index === 0
      ? `Start from 3rd-grade whole-number adding, subtracting, multiplying, and dividing, plus halves and quarters. Then learn this part: ${idea(index)}. Name what the parts mean before solving. Check: say the idea back in one sentence before the next layer.`
      : `New idea: ${idea(index)}. Use only moves already shown, then decide which step must happen first. Check: solve one small case of this layer before the next layer begins.`,
    workedExamples: [
      index === 0 ? liveExample(level) : `Example: use ${idea(index)} together with the earlier ${level.title} steps.`,
      `Check each step against the rule before moving to the ${stage} question.`,
    ],
  }))
}

function asWhatItIs(level: StudyLevel, teach: string[]): string {
  const first = teach[0]
  if (first) {
    // One thing at a time: a packed entry like
    // "Commutative: ... Associative: ... Distributive: ..." must surface
    // ONLY the first concept here. The rest are taught in later steps.
    const oneThing = firstConceptOnly(first)
    const def = simpleDef(
      oneThing,
      `${level.title} is a simple idea you can use on the SAT and ACT.`,
    )
    return withConcreteExample(def, level)
  }
  return withConcreteExample(
    simpleDef(
      `${level.title} is a simple idea you can use on many test questions.`,
      `${level.title} is a simple test idea.`,
    ),
    level,
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

type IdentityCase = {
  candidate: string
  yes: boolean
  explain: string
}

/** Ask whether one concrete case belongs to the topic. Never ask a side operation. */
function identityPhrase(title: string): string {
  const set = numberSetKey(title)
  if (set === 'natural numbers') return 'a natural number'
  if (set === 'whole numbers') return 'a whole number'
  if (set === 'integers') return 'an integer'
  if (set === 'rationals') return 'a rational number'
  if (set === 'irrational numbers') return 'an irrational number'
  if (set === 'real numbers') return 'a real number'
  if (set === 'complex numbers') return 'a complex number'
  let base = (title.split(':')[0] ?? title).trim().replace(/^(a|an|the)\s+/i, '')
  const lower = base.toLowerCase()
  if (/^(commutative|associative|distributive)$/i.test(lower)) return lower
  const words = lower.split(/\s+/).filter(Boolean)
  if (words.length >= 3 || /\band\b/.test(lower)) return `an example of ${lower}`
  const singular = lower.replace(/ies$/, 'y').replace(/([^s])s$/, '$1')
  const article = /^[aeiou]/i.test(singular) ? 'an' : 'a'
  return `${article} ${singular}`
}

function showCandidate(label: string): string {
  const text = clean(label).replace(/[.]+$/g, '')
  if (/[a-z]{3,}/i.test(text) && /\s/.test(text) && !/[=^√]/.test(text)) {
    return `“${text.replace(/^[“"]|[”"]$/g, '')}”`
  }
  return text
}

function isMembershipLabel(label: string, title: string): boolean {
  const text = clean(label)
  const words = text.split(/\s+/)
  const topic = (title.split(':')[0] ?? title).trim().toLowerCase()
  const topicWord = topic.split(/\s+/).find((word) => word.length >= 4 && !['with', 'from', 'that', 'this'].includes(word)) ?? topic
  if (!text || words.length > 12) return false
  if (/^(a clear|another|a third|not |almost |off |these )/i.test(text)) return false
  if (/^(which|what|solve|find|pick|choose)\b/i.test(text)) return false
  if (/\b(makes|means|tells|shows|happens|stands for)\b/i.test(text)) return false
  if (topicWord && new RegExp(`\\b${topicWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text)) return false
  if (/\b(are|is|cannot|must not)\b/i.test(text) && words.length > 5) return false
  if (/^[\d\s./$%-]+$/.test(text) && !/number/i.test(title)) return false
  return /[=^√π]|[0-9]|[“"]/.test(text) || words.length <= 8
}

function numberSetKey(title: string): string | null {
  const key = (title.split(':')[0] ?? title).trim().toLowerCase()
  const names = [
    'natural numbers',
    'whole numbers',
    'integers',
    'rationals',
    'irrational numbers',
    'real numbers',
    'complex numbers',
  ]
  if (names.includes(key)) return key
  const loose = names.find((name) => key.startsWith(`${name} `))
  if (loose && /\b(are|is|add)\b/.test(key)) return loose
  return null
}

function numberIdentityCases(title: string): IdentityCase[] | null {
  const key = numberSetKey(title)
  if (key === 'natural numbers') {
    return [
      { candidate: '7', yes: true, explain: '7 is a natural number. Natural numbers are 1, 2, 3, and so on.' },
      { candidate: '0', yes: false, explain: 'Natural numbers start at 1. 0 is not a natural number.' },
      { candidate: '3', yes: true, explain: '3 is one of 1, 2, 3, and so on, so it is a natural number.' },
      { candidate: '4.2', yes: false, explain: '4.2 is not 1, 2, 3, or any count like those, so it is not a natural number.' },
      { candidate: '1', yes: true, explain: '1 is the first natural number.' },
    ]
  }
  if (key === 'whole numbers') {
    return [
      { candidate: '√2 + 0', yes: false, explain: '√2 + 0 is still √2, so it is not a whole number.' },
      { candidate: '0', yes: true, explain: '0 is a whole number. Whole numbers are 0, 1, 2, 3, and so on.' },
      { candidate: '11', yes: true, explain: '11 is a whole number.' },
      { candidate: '3/5', yes: false, explain: '3/5 is not 0, 1, 2, 3, or any count like those, so it is not a whole number.' },
      { candidate: '6 + 0', yes: true, explain: '6 + 0 is still 6, and 6 is a whole number.' },
    ]
  }
  if (key === 'integers') {
    return [
      { candidate: '−4', yes: true, explain: '−4 is an integer. Integers include numbers below 0.' },
      { candidate: '1/2', yes: false, explain: '1/2 is not an integer.' },
      { candidate: '0', yes: true, explain: '0 is an integer.' },
      { candidate: '2.5', yes: false, explain: '2.5 is not an integer.' },
      { candidate: '9', yes: true, explain: '9 is an integer.' },
    ]
  }
  if (key === 'rationals') {
    return [
      { candidate: '1/2', yes: true, explain: '1/2 is a rational number.' },
      { candidate: '√2', yes: false, explain: '√2 is not a rational number.' },
      { candidate: '0.25', yes: true, explain: '0.25 is a rational number.' },
      { candidate: 'π', yes: false, explain: 'π is not a rational number.' },
      { candidate: '4', yes: true, explain: '4 is a rational number.' },
    ]
  }
  if (key === 'irrational numbers') {
    return [
      { candidate: '√2', yes: true, explain: '√2 is an irrational number.' },
      { candidate: '1/2', yes: false, explain: '1/2 is not an irrational number.' },
      { candidate: 'π', yes: true, explain: 'π is an irrational number.' },
      { candidate: '0.25', yes: false, explain: '0.25 is not an irrational number.' },
      { candidate: '√3 + 0', yes: true, explain: '√3 + 0 is still √3, and √3 is an irrational number.' },
    ]
  }
  if (key === 'real numbers') {
    return [
      { candidate: '√2', yes: true, explain: '√2 is a real number.' },
      { candidate: '4', yes: true, explain: '4 is a real number.' },
      { candidate: '−3', yes: true, explain: '−3 is a real number.' },
      { candidate: '1/2', yes: true, explain: '1/2 is a real number.' },
      { candidate: '0', yes: true, explain: '0 is a real number.' },
    ]
  }
  if (key === 'complex numbers') {
    return [
      { candidate: '4', yes: true, explain: '4 is a complex number.' },
      { candidate: '√2', yes: true, explain: '√2 is a complex number.' },
      { candidate: '−3', yes: true, explain: '−3 is a complex number.' },
      { candidate: '1/2', yes: true, explain: '1/2 is a complex number.' },
      { candidate: '0', yes: true, explain: '0 is a complex number.' },
    ]
  }
  return null
}

function propertyCases(title: string): IdentityCase[] | null {
  const key = title.toLowerCase()
  if (/commutative/.test(key)) {
    return [
      { candidate: '2 + 3 = 3 + 2', yes: true, explain: 'The addends swap and the value stays 5, so this is commutative.' },
      { candidate: '8 − 3 = 3 − 8', yes: false, explain: '8 − 3 is 5, and 3 − 8 is not 5, so this is not commutative.' },
      { candidate: '4 × 5 = 5 × 4', yes: true, explain: 'The factors swap and the value stays 20, so this is commutative.' },
      { candidate: '8 ÷ 2 = 2 ÷ 8', yes: false, explain: '8 ÷ 2 is 4, and 2 ÷ 8 is not 4, so this is not commutative.' },
      { candidate: '6 + 1 = 1 + 6', yes: true, explain: 'Either order is 7, so this is commutative.' },
    ]
  }
  if (/associative/.test(key)) {
    return [
      { candidate: '(2 + 3) + 4 = 2 + (3 + 4)', yes: true, explain: 'The grouping changes and the value stays 9, so this is associative.' },
      { candidate: '(8 − 3) − 1 = 8 − (3 − 1)', yes: false, explain: 'The left side is 4 and the right side is 6, so this is not associative.' },
      { candidate: '(2 × 3) × 4 = 2 × (3 × 4)', yes: true, explain: 'The grouping changes and the value stays 24, so this is associative.' },
      { candidate: '(12 ÷ 6) ÷ 2 = 12 ÷ (6 ÷ 2)', yes: false, explain: 'The left side is 1 and the right side is 4, so this is not associative.' },
      { candidate: '(1 + 5) + 2 = 1 + (5 + 2)', yes: true, explain: 'Either grouping is 8, so this is associative.' },
    ]
  }
  if (/distributive/.test(key)) {
    return [
      { candidate: '4(x + 5) = 4x + 20', yes: true, explain: '4 multiplies both parts, so this is distributive.' },
      { candidate: '4(x + 5) = 4x + 5', yes: false, explain: '5 was not multiplied by 4, so this is not distributive.' },
      { candidate: '3(x + 2) = 3x + 6', yes: true, explain: '3 multiplies both parts, so this is distributive.' },
      { candidate: '2(x + 4) = 2x + 4', yes: false, explain: '4 was not multiplied by 2, so this is not distributive.' },
      { candidate: '5(x + 1) = 5x + 5', yes: true, explain: '5 multiplies both parts, so this is distributive.' },
    ]
  }
  if (/negative number/.test(key)) {
    return [
      { candidate: '−5', yes: true, explain: '−5 is left of 0, so it is a negative number.' },
      { candidate: '6', yes: false, explain: '6 is right of 0, so it is not a negative number.' },
      { candidate: '−1', yes: true, explain: '−1 is a negative number.' },
      { candidate: '0', yes: false, explain: '0 is not a negative number.' },
      { candidate: '−8', yes: true, explain: '−8 is a negative number.' },
    ]
  }
  return null
}

function grammarCases(title: string): IdentityCase[] | null {
  const focus = (title.split(':').slice(1).join(':') || title).toLowerCase()
  if (/comma splice/.test(focus) && !/run-on/.test(focus)) {
    return [
      { candidate: '“The bus stopped, the riders left.”', yes: true, explain: 'A comma is the only join between two thoughts, so this is a comma splice.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'This is one finished thought, so it is not a comma splice.' },
      { candidate: '“The lamps went out, the street went dark.”', yes: true, explain: 'Two thoughts are joined only by a comma, so this is a comma splice.' },
      { candidate: '“The lamps went out.”', yes: false, explain: 'This is one finished thought, so it is not a comma splice.' },
    ]
  }
  if (/run-on/.test(focus)) {
    return [
      { candidate: '“The bus stopped the riders left.”', yes: true, explain: 'Two thoughts are smashed together with no join, so this is a run-on.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'This is one finished thought, so it is not a run-on.' },
    ]
  }
  if (/fragment/.test(focus)) {
    return [
      { candidate: '“Because it rained.”', yes: true, explain: 'It does not finish the thought, so it is a fragment.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'It has a subject and a verb, so it is not a fragment.' },
    ]
  }
  if (/complete sentence/.test(focus)) {
    return [
      { candidate: '“The bus stopped.”', yes: true, explain: 'It has a who and a what-happens, so it is a complete sentence.' },
      { candidate: '“Because it rained.”', yes: false, explain: 'It never finishes the thought, so it is not a complete sentence.' },
    ]
  }
  return null
}

function honestFallback(title: string, concept: string): IdentityCase[] {
  const phrase = identityPhrase(title)
  const key = title.toLowerCase()
  const percents = concept.match(/\d+(?:\.\d+)?%/g) ?? []
  if (/percent/.test(key)) {
    const shown = percents[0] ?? '50%'
    return [
      { candidate: shown, yes: true, explain: `${shown} is ${phrase}.` },
      { candidate: '7', yes: false, explain: '7 has no percent sign, so it is not a percent.' },
      { candidate: '25%', yes: true, explain: '25% is a percent.' },
      { candidate: '3/4', yes: false, explain: '3/4 is written as a fraction, not a percent.' },
    ]
  }
  if (/fraction/.test(key)) {
    return [
      { candidate: '3/4', yes: true, explain: '3/4 is a fraction.' },
      { candidate: '7', yes: false, explain: '7 is not written as a fraction.' },
      { candidate: '1/2', yes: true, explain: '1/2 is a fraction.' },
      { candidate: '50%', yes: false, explain: '50% is a percent, not a fraction.' },
    ]
  }
  if (/decimal/.test(key)) {
    const shown = concept.match(/\d+\.\d+/)?.[0] ?? '1.4'
    return [
      { candidate: shown, yes: true, explain: `${shown} is a decimal.` },
      { candidate: '7', yes: false, explain: '7 has no decimal point, so it is not a decimal.' },
      { candidate: '0.5', yes: true, explain: '0.5 is a decimal.' },
    ]
  }
  if (/complete sentence/.test(key)) {
    return [
      { candidate: '“The bus stopped.”', yes: true, explain: 'It has a who and a what-happens, so it is a complete sentence.' },
      { candidate: '“Because it rained.”', yes: false, explain: 'It never finishes the thought, so it is not a complete sentence.' },
    ]
  }
  if (/fragment/.test(key)) {
    return [
      { candidate: '“Because it rained.”', yes: true, explain: 'It does not finish the thought, so it is a fragment.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'It has a subject and a verb, so it is not a fragment.' },
    ]
  }
  if (/comma splice/.test(key) && !/run-on/.test(key)) {
    return [
      { candidate: '“The bus stopped, the riders left.”', yes: true, explain: 'A comma is the only join between two thoughts, so this is a comma splice.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'This is one finished thought, so it is not a comma splice.' },
    ]
  }
  if (/run-on|comma splice/.test(key)) {
    return [
      { candidate: '“The bus stopped the riders left.”', yes: true, explain: 'Two thoughts are smashed together, so this is a run-on.' },
      { candidate: '“The bus stopped.”', yes: false, explain: 'This is one finished thought, so it is not a run-on.' },
    ]
  }
  if (/bottom number|denominator/.test(key)) {
    return [
      { candidate: 'the 4 in 3/4', yes: true, explain: 'In 3/4, 4 is the bottom number.' },
      { candidate: 'the 3 in 3/4', yes: false, explain: 'In 3/4, 3 is the top number.' },
    ]
  }
  return [
    { candidate: 'the case that follows the rule', yes: true, explain: `This is ${phrase}.` },
    { candidate: 'the case that breaks the rule', yes: false, explain: `This is not ${phrase}.` },
  ]
}

function casesFromConcept(title: string, concept: string): IdentityCase[] {
  const phrase = identityPhrase(title)
  const equations = [...concept.matchAll(/[A-Za-z0-9()√π][^?.!]{0,42}=[^?.!]{0,42}/g)]
    .map((match) => clean(match[0]))
    .filter((item) => item.length > 2 && item.length < 70)
  if (!equations.length) return []
  return equations.slice(0, 3).map((candidate) => ({
    candidate,
    yes: true,
    explain: `This is ${phrase}.`,
  }))
}

function casesFromExamples(title: string, examples: LessonExampleSet): IdentityCase[] {
  const phrase = identityPhrase(title)
  const yes = examples.yes.filter((item) => isMembershipLabel(item.label, title))
  const no = examples.no.filter((item) => isMembershipLabel(item.label, title))
  const out: IdentityCase[] = []
  const take = Math.max(yes.length, no.length, 1)
  for (let index = 0; index < take && out.length < 5; index += 1) {
    const good = yes[index % Math.max(1, yes.length)]
    const bad = no[index % Math.max(1, no.length)]
    if (good && out.length < 5) {
      out.push({
        candidate: showCandidate(good.label),
        yes: true,
        explain: clean(good.why) || `This is ${phrase}.`,
      })
    }
    if (bad && out.length < 5) {
      out.push({
        candidate: showCandidate(bad.label),
        yes: false,
        explain: clean(bad.why) || `This is not ${phrase}.`,
      })
    }
  }
  return out
}

function identificationQuestions(
  title: string,
  examples: LessonExampleSet,
  blocked: string[],
  concept = '',
): StudyProblem[] {
  const phrase = identityPhrase(title)
  const curated = numberIdentityCases(title) ?? propertyCases(title) ?? grammarCases(title)
  const bank = bankExamplesForTitle(title)
  const fromBank = bank ? casesFromExamples(title, bank) : []
  const mentioned = casesFromExamples(title, examples).filter((item) => {
    const bare = item.candidate.replace(/[“”"]/g, '').trim().toLowerCase()
    return bare.length > 1 && /[0-9=√]/.test(bare) && concept.toLowerCase().includes(bare)
  })
  const fromConcept = casesFromConcept(title, concept)
  const picked = curated
    ?? (fromBank.length ? fromBank : null)
    ?? (mentioned.length ? mentioned : null)
    ?? fromConcept
  const source = picked.flatMap((item) => {
    if (textUsesUntaught(item.candidate, blocked)) return []
    const explain = textUsesUntaught(item.explain, blocked)
      ? (item.yes ? `This is ${phrase}.` : `This is not ${phrase}.`)
      : item.explain
    return [{ ...item, explain }]
  })
  const cases = source.length ? source : honestFallback(title, concept)
  const keys = ['A', 'B', 'C', 'D']
  const ranks: StudyRank[] = ['easy', 'medium', 'hard', 'hard', 'hard']
  const problems: StudyProblem[] = []
  for (let index = 0; index < 5; index += 1) {
    const item = cases[index % cases.length]
    const raw = item.yes
      ? ['Yes', 'No', 'Only the first part', 'Only after it is changed']
      : ['Yes', 'No', 'Yes, because of an extra step', 'Yes, because part of it fits']
    const answerAt = item.yes ? 0 : 1
    const shift = index % 4
    const spun = raw.map((text, choiceIndex) => ({ text, correct: choiceIndex === answerAt }))
    const rotated = [...spun.slice(shift), ...spun.slice(0, shift)]
    const answer = keys[rotated.findIndex((choice) => choice.correct)] ?? 'A'
    const prompt = `Is ${item.candidate} ${phrase}?`
    if (problems.some((problem) => problem.prompt === prompt)) continue
    problems.push({
      prompt,
      answer,
      explain: item.explain,
      difficulty: ranks[problems.length] ?? 'hard',
      choices: rotated.map((choice, choiceIndex) => ({ key: keys[choiceIndex] ?? 'A', text: choice.text })),
    })
  }
  return problems.slice(0, 5)
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

/** Multiple-choice check: identify whether one case belongs to the topic. */
export function understandingCheck(lesson: GuidedLesson): StudyProblem {
  return lesson.problems[0] ?? identificationQuestions(lesson.title, lesson.examples, [])[0]
}

/** Build guided lesson content for the copilot tutoring screen. */
export function buildGuidedLesson(
  level: StudyLevel,
  override?: Omit<Partial<GuidedLesson>, 'examples'> & {
    examples?: Partial<LessonExampleSet> | null
  },
): GuidedLesson {
  const baseTitle = level.title.split(':')[0]?.trim() ?? level.title
  const curated = GUIDED_OVERRIDES[level.title] ?? GUIDED_OVERRIDES[baseTitle] ?? {}
  const teach = level.teach.map(clean).filter(Boolean)
  const tricks = level.tricks.map(clean).filter(Boolean)
  const merged = { ...curated, ...override }
  // Keep hand-tuned kid-friendly definition / real-life example when we have them.
  if (curated.whatItIs) merged.whatItIs = curated.whatItIs
  if (curated.irlExample) merged.irlExample = curated.irlExample
  const authoredStages = merged.stages?.length === 5 ? merged.stages : []
  const owned = [
    level.title,
    level.example,
    ...teach,
    ...level.objectives,
    ...authoredStages.flatMap((stage) => [stage.explanation, ...stage.newSkills, ...stage.workedExamples]),
  ].join(' ')
  const stages = authoredStages.length === 5 ? authoredStages : defaultStages(level, teach, tricks)
  const blocked = untaughtPhrases(level, owned)
  const safeIdea = `${level.title} is the only new idea in this lesson.`

  const examples = limitBoardExamples(
    normalizeExampleSet(level, merged.examples ?? examplesForLevel(level)),
    blocked,
    level.title,
  )
  const problems = identificationQuestions(
    level.title,
    examples,
    blocked,
    `${level.example} ${teach[0] ?? ''}`,
  )

  return {
    title: level.title,
    whatItIs: withoutUntaughtSentences(
      withConcreteExample(
        simpleDef(
          firstConceptOnly(merged.whatItIs || asWhatItIs(level, teach)),
          `${level.title} is a simple test idea.`,
        ),
        level,
      ),
      blocked,
      safeIdea,
    ),
    irlExample: withoutUntaughtSentences(
      oneSentence(
        merged.irlExample || asIrlExample(level, level.title),
        `You can use ${level.title} in real life.`,
      ),
      blocked,
      `You can use ${level.title} on its own.`,
    ),
    breakdown: withoutUntaughtSentences(
      merged.breakdown || asBreakdown(teach, tricks, level.title),
      blocked,
      `Name the parts of ${level.title} before you answer.`,
    ),
    translateExample: textUsesUntaught(liveExample(level, merged.translateExample), blocked)
      ? level.title
      : liveExample(level, merged.translateExample),
    examples,
    connections: merged.connections,
    stages: stages.map((stage) => ({
      ...stage,
      explanation: withoutUntaughtSentences(stage.explanation, blocked, `This layer stays inside ${level.title}.`),
      workedExamples: stage.workedExamples.filter((example) => !textUsesUntaught(example, blocked)).slice(0, 2).length >= 2
        ? stage.workedExamples.filter((example) => !textUsesUntaught(example, blocked)).slice(0, 2)
        : [`Use ${level.title} on a small case.`, `Check the result against the ${level.title} rule.`],
      newSkills: stage.newSkills.filter((skill) => !textUsesUntaught(skill, blocked)).length
        ? stage.newSkills.filter((skill) => !textUsesUntaught(skill, blocked))
        : [level.title],
    })),
    problems,
  }
}

function limitBoardExamples(set: LessonExampleSet, blocked: string[], title: string): LessonExampleSet {
  const keep = (item: LessonExample) => !textUsesUntaught(`${item.label} ${item.why}`, blocked)
  const yes = set.yes.filter(keep)
  const no = set.no.filter(keep)
  const yesFill = [
    { label: `A clear ${title} case`, why: `This follows ${title}.` },
    { label: `Another ${title} case`, why: `This also follows ${title}.` },
    { label: `A third ${title} case`, why: `This still follows ${title}.` },
  ]
  const noFill = [
    { label: `Not ${title}`, why: `it does not follow ${title}` },
    { label: `Almost ${title}`, why: `it looks close but breaks ${title}` },
    { label: `Off ${title}`, why: `it ignores the rule for ${title}` },
  ]
  const take = (items: LessonExample[], fill: LessonExample[]) => {
    const out = [...items]
    for (const item of fill) {
      if (out.length >= 3) break
      if (out.some((row) => row.label.toLowerCase() === item.label.toLowerCase())) continue
      out.push(item)
    }
    return out.slice(0, 3)
  }
  return {
    yesTitle: set.yesTitle,
    noTitle: set.noTitle,
    yes: take(yes, yesFill),
    no: take(no, noFill),
  }
}
