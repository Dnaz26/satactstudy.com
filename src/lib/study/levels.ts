import { ENGLISH_LEVELS } from './english-levels'
import { MATH_LEVELS } from './math-levels'
import type { StudyLevel, StudyTrack } from './types'

export type { StudyLevel, StudyProblem, StudyRank, StudyTrack } from './types'
export { STUDY_RANKS, tagDifficulties, makeLevel, makeProblem } from './types'
export { MATH_LEVELS } from './math-levels'
export { ENGLISH_LEVELS } from './english-levels'

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
