import { ENGLISH_LEVELS as ENGLISH_CORE } from './english-levels'
import { MATH_LEVELS as MATH_CORE } from './math-levels'
import { buildEnglishStrategyLevels, buildMathStrategyLevels } from './strategy-levels'
import { buildTrickStrategyLevels } from './trick-strategy-levels'
import type { LessonScope, LessonTested, StudyLevel, StudyProblem, StudyTrack } from './types'

export type { StudyLevel, StudyProblem, StudyRank, StudyTrack, LessonScope, LessonTested, LevelMeta } from './types'
export { STUDY_RANKS, tagDifficulties, makeLevel, makeProblem } from './types'

const mathStart = Math.max(...MATH_CORE.map((level) => level.index)) + 1
const englishStart = Math.max(...ENGLISH_CORE.map((level) => level.index)) + 1
const mathStrategyEnd = mathStart + buildMathStrategyLevels(mathStart).length
const englishStrategyEnd = englishStart + buildEnglishStrategyLevels(englishStart).length

/**
 * Explicit scope/tested overrides keyed by `${track}:${index}`.
 * Used for existing lessons whose test scope differs from their
 * category default (e.g. complex numbers are ACT-only).
 */
const SCOPE_OVERRIDES: Record<string, { scope: LessonScope; tested?: LessonTested }> = {
  // SAT does not test complex numbers; the ACT does.
  'math:54': { scope: 'act' },
  // Notes-for-a-goal is an SAT synthesis task, not an ACT task.
  'english:89': { scope: 'sat' },
  // Geometric proofs/reasoning/constructions are ACT-reported skills.
  'math:160': { scope: 'act' },
}

function defaultScope(track: StudyTrack, category: string, title: string): LessonScope {
  if (
    category === 'Test strategy'
    || category === 'Hard questions'
    || category === 'Vocabulary'
  ) {
    return title.startsWith('ACT Science') ? 'act_strategy' : 'both_strategy'
  }
  if (category === 'Desmos') return 'sat_strategy'
  if (category === 'ACT Extra' || category === 'ACT English' || category === 'ACT Science') return 'act'
  if (title.startsWith('ACT ') && track === 'english') return 'act'
  return 'both'
}

function defaultTested(category: string, scope: LessonScope): LessonTested {
  if (scope.endsWith('_strategy')) return 'strategy'
  if (category === 'Formulas') return 'prereq'
  return 'direct'
}

/**
 * Backfills curriculum metadata so EVERY lesson carries test tags,
 * a category/subcategory, and a tested designation — even lessons
 * authored before the metadata fields existed.
 */
function tagged(level: StudyLevel): StudyLevel {
  const override = SCOPE_OVERRIDES[`${level.track}:${level.index}`]
    ?? SCOPE_OVERRIDES[`${level.track}:${level.title.toLowerCase()}`]
  const scope = level.scope && level.scope !== 'both'
    ? level.scope
    : (override?.scope ?? defaultScope(level.track, level.category, level.title))
  const tested = level.tested !== 'direct' || override?.tested
    ? (override?.tested ?? level.tested)
    : defaultTested(level.category, scope)
  return {
    ...level,
    scope,
    tested,
    sat: scope === 'sat' || scope === 'both' || scope === 'sat_strategy' || scope === 'both_strategy',
    act: scope === 'act' || scope === 'both' || scope === 'act_strategy' || scope === 'both_strategy',
    subcategory: level.subcategory || level.category,
    prereqs: level.prereqs ?? [],
    objectives: level.objectives?.length ? level.objectives : level.teach.slice(0, 2),
  }
}

// Dependency-based display order. Lesson `index` values stay stable
// (they are URL + progress identifiers); only array order changes.
const MATH_CATEGORY_RANK: Record<string, number> = {
  Foundations: 0,
  Algebra: 1,
  'Advanced Math': 2,
  Geometry: 3,
  'Data Analysis': 4,
  'ACT Extra': 5,
  Formulas: 6,
  'Test strategy': 7,
  Desmos: 8,
  'Hard questions': 9,
}

// Prerequisite-first foundations sequence: number systems before
// everything that computes with numbers.
const MATH_FOUNDATIONS_FIRST = [
  0, 117, 190, 191, 192, 193, 13, 1, 14, 125, 16, 17, 2, 18, 19, 20, 12, 94, 95, 7, 122, 123, 93,
]

const ENGLISH_CATEGORY_RANK: Record<string, number> = {
  Sentences: 0,
  Grammar: 1,
  Punctuation: 2,
  Style: 3,
  Reading: 4,
  'ACT English': 5,
  'ACT Science': 6,
  'Test strategy': 7,
  Vocabulary: 8,
  'Hard questions': 9,
}

const MICRO_ORDER = new Map<string, number>()

function levelKey(level: StudyLevel): string {
  return `${level.track}:${level.index}`
}

function orderMath(a: StudyLevel, b: StudyLevel): number {
  const micro = (MICRO_ORDER.get(levelKey(a)) ?? Number.POSITIVE_INFINITY)
    - (MICRO_ORDER.get(levelKey(b)) ?? Number.POSITIVE_INFINITY)
  if (Number.isFinite(micro) && micro !== 0) return micro
  if (a.category === 'Foundations' && b.category === 'Foundations') {
    const ai = MATH_FOUNDATIONS_FIRST.indexOf(a.index)
    const bi = MATH_FOUNDATIONS_FIRST.indexOf(b.index)
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
  }
  const rank = (MATH_CATEGORY_RANK[a.category] ?? 50) - (MATH_CATEGORY_RANK[b.category] ?? 50)
  if (rank !== 0) return rank
  return a.index - b.index
}

function orderEnglish(a: StudyLevel, b: StudyLevel): number {
  const micro = (MICRO_ORDER.get(levelKey(a)) ?? Number.POSITIVE_INFINITY)
    - (MICRO_ORDER.get(levelKey(b)) ?? Number.POSITIVE_INFINITY)
  if (Number.isFinite(micro) && micro !== 0) return micro
  const rank = (ENGLISH_CATEGORY_RANK[a.category] ?? 50) - (ENGLISH_CATEGORY_RANK[b.category] ?? 50)
  if (rank !== 0) return rank
  return a.index - b.index
}

function cleanMicroText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function splitMicroConcepts(level: StudyLevel): string[] {
  if (/Tricks$/.test(level.category) || level.category === 'Universal Test Tricks') {
    return [level.teach[0] ?? level.example ?? level.title]
  }
  const raw = level.teach.flatMap((item) => {
    const cleaned = cleanMicroText(item)
    const colonParts = cleaned.match(/[A-Z][A-Za-z -]{2,40}:\s*[^.?!]+[.?!]?/g)
    if (colonParts && colonParts.length > 1) return colonParts
    return cleaned
      .split(/(?<=[.?!])\s+(?=(?:[A-Z][a-z]+:|[A-Z]))/g)
      .map(cleanMicroText)
      .filter(Boolean)
  })
  const seen = new Set<string>()
  const concepts = raw.filter((item) => {
    const key = item.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return concepts.length ? concepts : [level.example || level.title]
}

function titleFromConcept(level: StudyLevel, concept: string, part: number, total: number): string {
  if (/Tricks$/.test(level.category) || level.category === 'Universal Test Tricks') return level.title
  const colon = concept.match(/^([A-Z][A-Za-z0-9 /&-]{2,46}):/)
  if (colon?.[1]) return colon[1].trim()
  const lower = concept.toLowerCase()
  const naturalName = concept.match(/^([A-Z][A-Za-z]*(?:\s+[a-z][A-Za-z]*){0,4})\s+(?:is|are|means|add|has|have|tells|measures|uses|needs)\b/)
  if (naturalName?.[1]) return naturalName[1].trim()
  const named = [
    ['slope', 'Slope'],
    ['intercept', 'Y-intercept'],
    ['input', 'Function inputs'],
    ['plug', 'Function inputs'],
    ['substitution', 'Substitution'],
    ['multiply', 'Multiplication'],
    ['divide', 'Division'],
    ['comma', 'Commas'],
    ['semicolon', 'Semicolons'],
    ['colon', 'Colons'],
    ['transition', 'Transitions'],
    ['claim', 'Claims'],
    ['evidence', 'Evidence'],
    ['main idea', 'Main idea'],
    ['inference', 'Inference'],
    ['purpose', 'Author purpose'],
    ['tone', 'Tone'],
  ].find(([needle]) => lower.includes(needle))
  if (named) return `${level.title}: ${named[1]}`
  if (total === 1) return level.title
  const short = cleanMicroText(concept)
    .replace(/[:.?!]+$/, '')
    .split(/\s+/)
    .slice(0, 5)
    .join(' ')
  return short ? `${level.title}: ${short}` : `${level.title}: skill ${part}`
}

function microProblem(level: StudyLevel, concept: string, index: number): StudyProblem {
  const lower = concept.toLowerCase()
  const match = level.problems.find((problem) => {
    const text = `${problem.prompt} ${problem.explain}`.toLowerCase()
    return lower.split(/[^a-z0-9]+/).filter((word) => word.length > 4).some((word) => text.includes(word))
  }) ?? level.problems[index % Math.max(1, level.problems.length)]
  if (match) return match
  const concise = cleanMicroText(concept).replace(/[:.?!]+$/, '')
  return {
    prompt: `Which statement best matches this lesson idea: ${concise}?`,
    answer: 'A',
    choices: [
      { key: 'A', text: concise },
      { key: 'B', text: `A different skill from ${level.title}` },
      { key: 'C', text: 'A shortcut that only works sometimes' },
      { key: 'D', text: 'A common trap answer' },
    ],
    explain: `This level is only about this idea: ${concise}.`,
    difficulty: level.difficulty,
  }
}

function expandMicroLevels(levels: StudyLevel[], track: StudyTrack): StudyLevel[] {
  let order = 0
  return levels.flatMap((level) => {
    const concepts = splitMicroConcepts(level)
    return concepts.map((concept, conceptIndex) => {
      const isFirst = conceptIndex === 0
      const index = isFirst ? level.index : 100000 + level.index * 100 + conceptIndex
      const previousIndex = conceptIndex === 0
        ? undefined
        : isFirst ? undefined : (conceptIndex === 1 ? level.index : 100000 + level.index * 100 + conceptIndex - 1)
      const micro: StudyLevel = {
        ...level,
        index,
        title: titleFromConcept(level, concept, conceptIndex + 1, concepts.length),
        topicMatch: [...level.topicMatch, ...concept.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3)],
        example: concept,
        teach: [concept],
        tricks: level.tricks.slice(0, 1),
        problems: [microProblem(level, concept, conceptIndex)],
        prereqs: previousIndex != null ? [previousIndex] : level.prereqs,
        objectives: [cleanMicroText(concept).replace(/[:.?!]+$/, '')],
      }
      MICRO_ORDER.set(`${track}:${micro.index}`, order)
      order += 1
      return micro
    })
  })
}

const MATH_RAW: StudyLevel[] = [
  ...MATH_CORE,
  ...buildMathStrategyLevels(mathStart),
  ...buildTrickStrategyLevels(mathStrategyEnd, 'math'),
].map(tagged).sort(orderMath)
const ENGLISH_RAW: StudyLevel[] = [
  ...ENGLISH_CORE,
  ...buildEnglishStrategyLevels(englishStart),
  ...buildTrickStrategyLevels(englishStrategyEnd, 'english'),
].map(tagged).sort(orderEnglish)

const MATH_ALL: StudyLevel[] = expandMicroLevels(MATH_RAW, 'math')
const ENGLISH_ALL: StudyLevel[] = expandMicroLevels(ENGLISH_RAW, 'english')

export const MATH_LEVELS: StudyLevel[] = [...MATH_ALL].sort(orderMath)
export const ENGLISH_LEVELS: StudyLevel[] = [...ENGLISH_ALL].sort(orderEnglish)

export function levelsFor(track: StudyTrack): StudyLevel[] {
  return track === 'math' ? MATH_LEVELS : ENGLISH_LEVELS
}

export function getLevel(track: StudyTrack, index: number): StudyLevel | null {
  return levelsFor(track).find((level) => level.index === index) ?? null
}

export function levelsInCategory(track: StudyTrack, category: string): StudyLevel[] {
  return levelsFor(track).filter((level) => level.category === category)
}

export function firstIndexInEachCategory(track: StudyTrack): number[] {
  const seen = new Set<string>()
  const indexes: number[] = []
  for (const level of levelsFor(track)) {
    if (seen.has(level.category)) continue
    seen.add(level.category)
    indexes.push(level.index)
  }
  return indexes
}

export function previousInCategory(track: StudyTrack, index: number): StudyLevel | null {
  const current = getLevel(track, index)
  if (!current) return null
  const same = levelsInCategory(track, current.category)
  const at = same.findIndex((level) => level.index === index)
  return at > 0 ? same[at - 1] ?? null : null
}

export function previousLevel(track: StudyTrack, index: number): StudyLevel | null {
  const levels = levelsFor(track)
  const at = levels.findIndex((level) => level.index === index)
  return at > 0 ? levels[at - 1] ?? null : null
}

export function nextInCategory(track: StudyTrack, index: number): StudyLevel | null {
  const current = getLevel(track, index)
  if (!current) return null
  const same = levelsInCategory(track, current.category)
  const at = same.findIndex((level) => level.index === index)
  return at >= 0 ? same[at + 1] ?? null : null
}

export function isLevelOpen(
  track: StudyTrack,
  index: number,
  statuses: Map<number, string>,
): boolean {
  if (statuses.get(index) === 'completed') return true
  const levels = levelsFor(track)
  if (levels[0]?.index === index) return true
  const prev = previousLevel(track, index)
  return Boolean(prev && statuses.get(prev.index) === 'completed')
}

/**
 * Curated level -> question-bank topic map, keyed by `${track}:${index}`.
 * The bank taxonomy (93 SAT-skill / ACT-domain topics) is far coarser than
 * the lesson taxonomy (380+ lessons), and generic name matching sends
 * lessons to the wrong bank (e.g. number-systems lessons landing in
 * "Rational Expressions"). Pin each lesson to its best-fit bank topic here;
 * `null` means no bank topic fits — fall back to authored questions only
 * rather than showing jumbled ones.
 */
const TOPIC_OVERRIDES: Record<string, string | null> = {
  // ---- math: Foundations ----
  'math:0': 'Rational Numbers',
  'math:117': 'Equivalent expressions',
  'math:190': 'Equivalent expressions',
  'math:191': 'Equivalent expressions',
  'math:192': 'Rational Numbers',
  'math:193': 'Integer Properties',
  'math:13': 'Integer Properties',
  'math:1': 'Rational Numbers',
  'math:14': 'Rational Numbers',
  'math:125': 'Rational Numbers',
  'math:16': 'Percentages',
  'math:17': 'Percentages',
  'math:2': 'Ratios and Proportions',
  'math:18': 'Ratios and Proportions',
  'math:19': 'Ratios and Proportions',
  'math:20': 'Unit Conversions',
  'math:94': 'Integer Properties',
  'math:95': 'Integer Properties',
  'math:122': 'Exponents and Radicals',
  'math:123': 'Exponents and Radicals',
  'math:93': null,
  'math:15': 'Rational Numbers',
  'math:96': 'Ratios and Proportions',
  'math:97': 'Percentages',
  'math:118': 'Rational Numbers',
  'math:119': null,
  'math:120': 'Rational Numbers',
  'math:121': null,
  'math:124': 'Rational Numbers',
  'math:126': null,
  'math:12': null,
  // ---- math: Algebra ----
  'math:3': 'Linear Equations',
  'math:5': 'Systems of Equations',
  'math:21': 'Linear Equations',
  'math:22': 'Linear Equations',
  'math:23': null,
  'math:25': 'Linear Equations',
  'math:26': 'Linear Equations',
  'math:28': 'Systems of Equations',
  'math:29': 'Systems of Equations',
  'math:30': 'Linear Inequalities',
  'math:31': 'Linear Inequalities',
  'math:32': 'Systems of Inequalities',
  'math:98': 'Linear Equations',
  'math:127': 'Linear Equations',
  'math:128': 'Linear Equations',
  'math:129': 'Linear Equations',
  'math:131': null,
  'math:132': 'Linear Equations',
  'math:133': 'Linear Equations',
  'math:134': 'Linear Inequalities',
  // ---- math: Advanced Math ----
  'math:33': 'Exponents and Radicals',
  'math:35': 'Exponents and Radicals',
  'math:37': 'Quadratics',
  'math:38': 'Quadratics',
  'math:39': 'Quadratics',
  'math:40': 'Quadratics',
  'math:41': 'Quadratic Functions',
  'math:42': 'Quadratics',
  'math:43': 'Nonlinear functions',
  'math:101': 'Nonlinear functions',
  'math:144': 'Nonlinear functions',
  'math:44': null,
  'math:45': null,
  'math:145': null,
  'math:146': null,
  'math:47': 'Functions',
  'math:48': 'Functions',
  'math:49': 'Functions',
  'math:51': 'Rational Expressions',
  'math:52': 'Nonlinear Equations',
  'math:53': 'Polynomials',
  'math:54': null,
  'math:55': null,
  'math:56': null,
  'math:100': 'Quadratic Functions',
  'math:102': 'Exponents and Radicals',
  'math:104': 'Polynomials',
  'math:105': 'Rational Expressions',
  'math:106': 'Nonlinear functions',
  'math:135': 'Functions',
  'math:136': 'Functions',
  'math:137': 'Nonlinear functions',
  'math:148': 'Nonlinear functions',
  'math:138': 'Polynomials',
  'math:139': 'Polynomials',
  'math:140': 'Polynomials',
  'math:141': 'Rational Expressions',
  'math:142': 'Exponents and Radicals',
  'math:143': 'Nonlinear functions',
  'math:149': 'Quadratics',
  // ---- math: ACT Extra ----
  'math:86': 'Nonlinear functions',
  'math:87': null,
  'math:88': 'Trigonometry',
  'math:89': 'Trigonometry',
  'math:90': null,
  'math:91': 'Ratios and Proportions',
  'math:92': 'Coordinate Geometry',
  'math:114': null,
  'math:115': null,
  'math:116': 'Trigonometry',
  'math:165': null,
  'math:166': null,
  // ---- math: Geometry ----
  'math:9': 'Angles and Lines',
  'math:69': 'Angles and Lines',
  'math:70': 'Triangles',
  'math:71': 'Triangles',
  'math:72': 'Triangles',
  'math:73': 'Trigonometry',
  'math:74': 'Trigonometry',
  'math:75': 'Trigonometry',
  'math:76': 'Area and Volume',
  'math:78': 'Circles',
  'math:79': 'Circles',
  'math:80': 'Area and Volume',
  'math:81': 'Area and Volume',
  'math:82': 'Coordinate Geometry',
  'math:83': null,
  'math:84': null,
  'math:85': null,
  'math:107': 'Circles',
  'math:108': 'Area and Volume',
  'math:150': 'Angles and Lines',
  'math:151': 'Angles and Lines',
  'math:153': 'Triangles',
  'math:154': 'Triangles',
  'math:155': 'Triangles',
  'math:156': 'Triangles',
  'math:157': 'Triangles',
  'math:158': 'Triangles',
  'math:159': 'Coordinate Geometry',
  'math:160': null,
  'math:161': 'Area and Volume',
  'math:162': 'Circles',
  'math:163': 'Trigonometry',
  'math:164': 'Trigonometry',
  // ---- math: Data Analysis ----
  'math:11': 'Probability',
  'math:58': 'Statistics',
  'math:59': 'Statistics',
  'math:60': 'Statistics and Data',
  'math:61': 'Statistics',
  'math:63': 'Probability',
  'math:64': 'Probability',
  'math:65': 'Probability',
  'math:66': 'Probability',
  'math:67': 'Statistics',
  'math:68': 'Statistics',
  'math:109': 'Statistics',
  'math:111': 'Statistics',
  'math:110': null,
  'math:113': 'Probability',
  'math:173': 'Statistics',
  'math:174': 'Statistics',
  'math:175': 'Statistics',
  'math:176': 'Statistics',
  'math:177': 'Statistics',
  'math:178': 'Statistics',
  'math:180': null,
  'math:181': null,
  'math:182': null,
  'math:183': 'Statistics',
  'math:184': 'Probability',
  'math:185': 'Probability',
  'math:186': 'Probability',
  // ---- math: Desmos strategy ----
  'math:194': 'Quadratic Functions',
  'math:195': 'Function Notation',
  'math:196': 'Functions',
  'math:197': 'Linear functions',
  'math:198': 'Linear Inequalities',
  'math:199': 'Systems of Inequalities',
  'math:200': 'Functions',
  'math:201': 'Statistics and Data',
  'math:202': 'Quadratic Functions',
  'math:203': 'Statistics and Data',
  'math:204': 'Statistics',
  'math:205': 'Statistics',
  'math:206': 'Functions',
  'math:207': 'Circles',
  'math:208': 'Coordinate Geometry',
  'math:209': 'Trigonometry',
  'math:210': 'Nonlinear functions',
  'math:211': 'Polynomials',
  'math:212': 'Functions',
  'math:213': null,
  'math:214': 'Probability',
  'math:215': 'Statistics',
  'math:216': null,
  'math:217': 'Statistics and Data',
  'math:218': 'Functions',
  // ---- math: Formulas / Hard / Test strategy ----
  'math:219': 'Linear Equations',
  'math:220': 'Quadratics',
  'math:221': 'Exponents and Radicals',
  'math:222': 'Percentages',
  'math:223': 'Statistics',
  'math:224': 'Area and Volume',
  'math:225': 'Triangles',
  'math:226': 'Trigonometry',
  'math:227': 'Functions',
  'math:228': 'Linear Equations',
  'math:229': 'Systems of Equations',
  'math:230': 'Functions',
  'math:231': 'Linear Equations',
  'math:232': 'Linear Inequalities',
  'math:233': 'Statistics and Data',
  'math:234': null,
  'math:235': null,
  'math:187': null,
  'math:188': null,
  'math:189': null,
  // ---- english: Grammar ----
  'english:1': 'Subject-Verb Agreement',
  'english:2': 'Pronouns',
  'english:3': 'Parallelism',
  'english:4': 'Modifiers',
  'english:12': 'Subject-Verb Agreement',
  'english:13': 'Verb Tense and Form',
  'english:14': 'Verb Tense and Form',
  'english:15': 'Verb Tense and Form',
  'english:16': 'Pronouns',
  'english:17': 'Pronouns',
  'english:18': 'Pronouns',
  'english:19': 'Pronouns',
  'english:20': 'Grammar and Usage',
  'english:21': 'Modifiers',
  'english:22': 'Modifiers',
  'english:48': 'Grammar and Usage',
  'english:49': 'Modifiers',
  'english:50': 'Modifiers',
  'english:56': 'Pronouns',
  'english:57': 'Pronouns',
  'english:58': 'Pronouns',
  'english:59': 'Verb Tense and Form',
  'english:60': 'Verb Tense and Form',
  'english:70': 'Grammar and Usage',
  'english:71': 'Sentence Boundaries',
  // ---- english: Punctuation ----
  'english:5': 'Punctuation',
  'english:23': 'Punctuation',
  'english:24': 'Punctuation',
  'english:25': 'Punctuation',
  'english:26': 'Punctuation',
  'english:27': 'Punctuation',
  'english:28': 'Punctuation',
  'english:29': 'Punctuation',
  'english:61': 'Sentence Boundaries',
  'english:62': 'Punctuation',
  'english:63': 'Punctuation',
  'english:64': 'Punctuation',
  'english:65': 'Punctuation',
  'english:66': 'Punctuation',
  'english:67': 'Punctuation',
  'english:68': 'Punctuation',
  'english:69': 'Punctuation',
  // ---- english: Sentences ----
  'english:0': 'Sentence Boundaries',
  'english:10': 'Sentence Boundaries',
  'english:11': 'Sentence Boundaries',
  // ---- english: Style ----
  'english:6': 'Concision',
  'english:7': 'Transitions',
  'english:30': 'Concision',
  'english:31': 'Grammar and Usage',
  'english:32': 'Words in Context',
  'english:33': 'Transitions',
  'english:34': 'Transitions',
  'english:35': 'Rhetorical Synthesis',
  'english:36': 'Organization',
  'english:72': 'Grammar and Usage',
  'english:73': 'Concision',
  'english:74': 'Style and Tone',
  'english:75': 'Style and Tone',
  'english:76': 'Words in Context',
  'english:77': 'Sentence Structure',
  'english:78': 'Organization',
  'english:79': 'Organization',
  'english:80': 'Organization',
  'english:81': 'Topic Development',
  'english:82': 'Topic Development',
  'english:83': 'Organization',
  'english:84': 'Rhetorical Synthesis',
  'english:85': 'Style and Tone',
  'english:108': 'Transitions',
  // ---- english: Reading ----
  'english:8': 'Main Idea',
  'english:9': 'Words in Context',
  'english:37': 'Evidence and Details',
  'english:38': 'Inference',
  'english:39': 'Author Purpose',
  'english:40': 'Style and Tone',
  'english:41': 'Text Structure',
  'english:42': 'Comparing Texts',
  'english:43': 'Evidence and Details',
  'english:44': 'Reading Graphs and Tables',
  'english:45': 'Rhetorical Synthesis',
  'english:51': 'Reading Graphs and Tables',
  'english:52': 'Comparing Texts',
  'english:53': 'Evidence and Details',
  'english:54': 'Words in Context',
  'english:55': 'Main Idea',
  'english:86': 'Evidence and Details',
  'english:87': 'Inference',
  'english:88': 'Reading Graphs and Tables',
  'english:89': 'Rhetorical Synthesis',
  'english:90': null,
  'english:91': 'Inference',
  'english:92': 'Text Structure',
  'english:93': 'Text Structure',
  'english:104': 'Text Structure',
  'english:105': 'Sentence Structure',
  'english:106': 'Comparing Texts',
  'english:110': 'Main Idea and Details',
  'english:111': 'Inference',
  'english:112': 'Text Structure',
  'english:113': 'Inference',
  'english:114': 'Vocabulary in Context',
  'english:115': 'Text Structure',
  // ---- english: ACT English / Science / Vocab / Hard ----
  'english:46': 'Concision',
  'english:47': 'Topic Development',
  'english:94': 'Organization',
  'english:95': 'Author Purpose',
  'english:96': 'Comparing Texts',
  'english:117': 'Topic Development',
  'english:118': 'Grammar and Usage',
  'english:97': 'Experimental Design',
  'english:98': 'Conflicting Viewpoints',
  'english:99': 'Experimental Design',
  'english:100': 'Experimental Design',
  'english:101': 'Trend Analysis',
  'english:102': 'Trend Analysis',
  'english:103': 'Conflicting Viewpoints',
  'english:119': 'Reading Graphs and Tables',
  'english:120': 'Reading Graphs and Tables',
  'english:121': 'Reading Graphs and Tables',
  'english:122': 'Reading Graphs and Tables',
  'english:123': 'Trend Analysis',
  'english:125': 'Experimental Design',
  'english:130': 'Conflicting Viewpoints',
  'english:131': 'Conflicting Viewpoints',
  'english:133': 'Experimental Design',
  'english:136': 'Words in Context',
  'english:137': 'Words in Context',
  'english:138': 'Words in Context',
  'english:139': 'Words in Context',
  'english:140': 'Words in Context',
  'english:141': 'Words in Context',
  'english:142': 'Concision',
  'english:143': 'Words in Context',
  'english:144': 'Inference',
  'english:145': 'Subject-Verb Agreement',
  'english:146': 'Evidence and Details',
  'english:147': 'Punctuation',
  'english:148': 'Main Idea',
  'english:149': 'Concision',
  'english:150': 'Reading Graphs and Tables',
  'english:151': 'Evidence and Details',
  'english:152': 'Reading Graphs and Tables',
  'english:134': null,
  'english:135': null,
}

export function matchTopicId(level: StudyLevel, topics: Array<{ id: string; name: string; category_id?: string | null }>): string | null {
  const key = `${level.track}:${level.index}`
  if (Object.hasOwn(TOPIC_OVERRIDES, key)) {
    const wanted = TOPIC_OVERRIDES[key]
    if (wanted === null) return null
    if (wanted) {
      const exact = topics
        .filter((t) => trackAllowsTopic(level.track, t.category_id))
        .filter((t) => t.name.toLowerCase() === wanted.toLowerCase())
        .sort((a, b) => {
          const fit = testFitRank(levelTestOf(level), categoryTestOf(a.category_id))
            - testFitRank(levelTestOf(level), categoryTestOf(b.category_id))
          return fit !== 0 ? fit : a.id.localeCompare(b.id)
        })
      if (exact.length) return exact[0]?.id ?? null
    }
    // Named topic missing from this database — fall through to scoring.
  }
  return scoredTopicMatch(level, topics)
}

export type TopicRef = { id: string; name: string; category_id?: string | null }

const STOPWORDS = new Set([
  'and', 'or', 'the', 'of', 'in', 'a', 'an', 'to', 'for', 'with', 'vs', 'on',
  'by', 'as', 'at', 'from', 'into', 'over', 'than', 'then', 'that', 'this',
  'is', 'are', 'was', 'be', 'via', 'per',
])

function topicWords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => !STOPWORDS.has(w) && !(w.length === 1 && /[a-z]/.test(w)),
  )
}

function wordCovers(topicWord: string, needleWord: string): boolean {
  return topicWord === needleWord
    || topicWord.startsWith(needleWord)
    || needleWord.startsWith(topicWord)
}

/** Seed category suffix 001-008 = SAT, 009+ = ACT (stable seed ids). */
function categoryTestOf(categoryId?: string | null): 'SAT' | 'ACT' | null {
  if (!categoryId) return null
  const n = Number.parseInt(categoryId.split('-').pop() ?? '', 10)
  if (!Number.isFinite(n)) return null
  return n <= 8 ? 'SAT' : 'ACT'
}

/** Math lessons only ever match math topics; verbal lessons match RW/English/Reading/Science. */
function trackAllowsTopic(track: StudyTrack, categoryId?: string | null): boolean {
  if (!categoryId) return true
  const n = Number.parseInt(categoryId.split('-').pop() ?? '', 10)
  if (!Number.isFinite(n)) return true
  const isMath = n <= 4 || (n >= 12 && n <= 16)
  return track === 'math' ? isMath : !isMath
}

function levelTestOf(level: StudyLevel): 'SAT' | 'ACT' | null {
  if (level.scope.startsWith('sat')) return 'SAT'
  if (level.scope.startsWith('act')) return 'ACT'
  return null
}

function testFitRank(levelTest: 'SAT' | 'ACT' | null, topicTest: 'SAT' | 'ACT' | null): number {
  if (!levelTest || !topicTest) return 1
  return topicTest === levelTest ? 0 : 2
}

function scoreTopicCandidate(
  topicName: string,
  topicWordList: string[],
  needle: string,
  needleWordList: string[],
  isTitle: boolean,
  levelTest: 'SAT' | 'ACT' | null,
  topicTest: 'SAT' | 'ACT' | null,
): number | null {
  if (!needleWordList.length) return null
  const used = new Set<number>()
  let covered = 0
  for (const nw of needleWordList) {
    const idx = topicWordList.findIndex((tw, i) => !used.has(i) && wordCovers(tw, nw))
    if (idx >= 0) {
      covered += 1
      used.add(idx)
    }
  }
  if (!covered) return null
  const name = topicName.toLowerCase()
  const n = needle.toLowerCase().trim()
  let score = (1000 * covered) / needleWordList.length
  if (covered === needleWordList.length) score += 300
  if (name === n) score += 2000
  else if (name.startsWith(n)) score += 500
  if (isTitle) score += 150
  score += Math.min(30, n.length)
  score -= 8 * (topicWordList.length - used.size)
  if (levelTest && topicTest) score += topicTest === levelTest ? 200 : -100
  return score
}

function scoredTopicMatch(
  level: StudyLevel,
  topics: Array<{ id: string; name: string; category_id?: string | null }>,
): string | null {
  const allowed = topics.filter((t) => trackAllowsTopic(level.track, t.category_id))
  const pool = allowed.length ? allowed : topics
  const lt = levelTestOf(level)
  const needles = [level.title, ...level.topicMatch]
  let best: { id: string; score: number; order: number } | null = null
  for (const [needleIndex, needle] of needles.entries()) {
    const needleWordList = topicWords(needle)
    if (!needleWordList.length) continue
    for (const topic of pool) {
      const score = scoreTopicCandidate(
        topic.name,
        topicWords(topic.name),
        needle,
        needleWordList,
        needleIndex === 0,
        lt,
        categoryTestOf(topic.category_id),
      )
      if (score == null) continue
      const order = needleIndex * 10 - Math.min(30, needle.length)
      if (!best || score > best.score || (score === best.score && order < best.order)) {
        best = { id: topic.id, score, order }
      }
    }
  }
  // Below this, matches are single generic words ('and', 'per') — jumble territory.
  if (!best || best.score < 700) return null
  return best.id
}
