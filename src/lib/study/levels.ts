import { ENGLISH_LEVELS as ENGLISH_CORE } from './english-levels'
import { MATH_LEVELS as MATH_CORE } from './math-levels'
import { buildEnglishStrategyLevels, buildMathStrategyLevels } from './strategy-levels'
import type { LessonScope, LessonTested, StudyLevel, StudyTrack } from './types'

export type { StudyLevel, StudyProblem, StudyRank, StudyTrack, LessonScope, LessonTested, LevelMeta } from './types'
export { STUDY_RANKS, tagDifficulties, makeLevel, makeProblem } from './types'

const mathStart = Math.max(...MATH_CORE.map((level) => level.index)) + 1
const englishStart = Math.max(...ENGLISH_CORE.map((level) => level.index)) + 1

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
  0, 117, 13, 1, 14, 125, 16, 17, 2, 18, 19, 20, 12, 94, 95, 7, 122, 123, 93,
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

function orderMath(a: StudyLevel, b: StudyLevel): number {
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
  const rank = (ENGLISH_CATEGORY_RANK[a.category] ?? 50) - (ENGLISH_CATEGORY_RANK[b.category] ?? 50)
  if (rank !== 0) return rank
  return a.index - b.index
}

const MATH_ALL: StudyLevel[] = [...MATH_CORE, ...buildMathStrategyLevels(mathStart)].map(tagged)
const ENGLISH_ALL: StudyLevel[] = [...ENGLISH_CORE, ...buildEnglishStrategyLevels(englishStart)].map(tagged)

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
  const status = statuses.get(index)
  if (status === 'completed' || status === 'available') return true
  if (firstIndexInEachCategory(track).includes(index)) return true
  const prev = previousInCategory(track, index)
  return Boolean(prev && statuses.get(prev.index) === 'completed')
}

export function matchTopicId(level: StudyLevel, topics: Array<{ id: string; name: string }>): string | null {
  const hay = topics.map((topic) => ({ id: topic.id, name: topic.name.toLowerCase() }))
  for (const needle of level.topicMatch) {
    const hit = hay.find((topic) => topic.name.includes(needle.toLowerCase()))
    if (hit) return hit.id
  }
  return null
}
