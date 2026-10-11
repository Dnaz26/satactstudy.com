/**
 * Digital SAT section-score estimate.
 *
 * This is not College Board equating. Official scales are form-specific and
 * unpublished. An easier Module 2 cannot reach the same section ceiling as a
 * harder Module 2. A middle Module 2 sits between those ceilings.
 */

export const SAT_SECTION_FLOOR = 200
export const SAT_EASIER_CEILING = 650
export const SAT_MEDIUM_CEILING = 720
export const SAT_HARDER_CEILING = 800

export type SatModule2Path = 'easier' | 'medium' | 'harder'

/**
 * Module 1 performance picks Module 2.
 * Below 45% is the easier set, 70% or more is the harder set, and the
 * middle band stays in the middle. Same rule for Reading and Writing and Math.
 */
export function routeSatModule2(module1Correct: number, module1Count: number): SatModule2Path {
  if (!Number.isInteger(module1Count) || module1Count <= 0) throw new Error('Module 1 must contain questions')
  if (!Number.isInteger(module1Correct) || module1Correct < 0 || module1Correct > module1Count) {
    throw new Error('Module 1 score is out of range')
  }
  const ratio = module1Correct / module1Count
  if (ratio >= 0.7) return 'harder'
  if (ratio < 0.45) return 'easier'
  return 'medium'
}

export function routeSatMathModule2(module1Correct: number, module1Count = 22): SatModule2Path {
  return routeSatModule2(module1Correct, module1Count)
}

export function module2ScoreBand(path: SatModule2Path): { min: number; max: number } {
  if (path === 'harder') return { min: 0.85, max: 1 }
  if (path === 'easier') return { min: 0, max: 0.45 }
  return { min: 0.5, max: 0.79 }
}

export type Module2Candidate = { id: string; topic_name: string | null; difficulty_score: number }

/** Spread Module 2 across topics instead of taking one skill 27 times. */
export function pickModule2Questions(pool: Module2Candidate[], count: number, used: ReadonlySet<string>): string[] {
  const byTopic = new Map<string, Module2Candidate[]>()
  const available = pool.filter((question) => !used.has(question.id))
  available.sort((a, b) => a.id.localeCompare(b.id))
  for (const question of available) {
    const topic = question.topic_name || 'General'
    const bucket = byTopic.get(topic) ?? []
    bucket.push(question)
    byTopic.set(topic, bucket)
  }
  const topics = [...byTopic.keys()].sort()
  const picked: string[] = []
  let guard = 0
  while (picked.length < count && guard < count * Math.max(1, topics.length)) {
    let progressed = false
    for (const topic of topics) {
      const next = byTopic.get(topic)?.shift()
      if (!next) continue
      picked.push(next.id)
      progressed = true
      if (picked.length === count) break
    }
    if (!progressed) break
    guard += 1
  }
  return picked
}

function roundToTen(value: number, floor: number, ceiling: number): number {
  const rounded = Math.round(value / 10) * 10
  return Math.max(floor, Math.min(ceiling, rounded))
}

function ceilingFor(path: SatModule2Path): number {
  if (path === 'harder') return SAT_HARDER_CEILING
  if (path === 'medium') return SAT_MEDIUM_CEILING
  return SAT_EASIER_CEILING
}

function weightFor(path: SatModule2Path): number {
  if (path === 'harder') return 1.35
  if (path === 'medium') return 1.05
  return 0.85
}

export function estimateSatMathScore(input: {
  module1Correct: number
  module1Count: number
  module2Correct: number
  module2Count: number
  path: SatModule2Path
}): { score: number; ceiling: number; officialEquating: false } {
  const ceiling = ceilingFor(input.path)
  const module2Weight = weightFor(input.path)
  const weighted = input.module1Correct + input.module2Correct * module2Weight
  const max = input.module1Count + input.module2Count * module2Weight
  const fraction = max <= 0 ? 0 : Math.max(0, Math.min(1, weighted / max))
  const score = roundToTen(SAT_SECTION_FLOOR + (ceiling - SAT_SECTION_FLOOR) * fraction, SAT_SECTION_FLOOR, ceiling)
  return { score, ceiling, officialEquating: false }
}

/** Section raw only. Used when the completion payload has no module split. */
export function estimateSatMathFromRaw(
  correct: number,
  total: number,
  path: SatModule2Path,
): { score: number; ceiling: number; officialEquating: false } {
  const ceiling = ceilingFor(path)
  const fraction = total <= 0 ? 0 : Math.max(0, Math.min(1, correct / total))
  const score = roundToTen(SAT_SECTION_FLOOR + (ceiling - SAT_SECTION_FLOOR) * fraction, SAT_SECTION_FLOOR, ceiling)
  return { score, ceiling, officialEquating: false }
}

/** Reading and Writing section total. Module 2 difficulty is chosen separately and is not an official scale. */
export function estimateUnroutedSatSection(
  correct: number,
  total: number,
): { score: number; ceiling: number; routed: false; officialEquating: false } {
  const fraction = total <= 0 ? 0 : Math.max(0, Math.min(1, correct / total))
  const score = roundToTen(SAT_SECTION_FLOOR + (SAT_HARDER_CEILING - SAT_SECTION_FLOOR) * fraction, SAT_SECTION_FLOOR, SAT_HARDER_CEILING)
  return { score, ceiling: SAT_HARDER_CEILING, routed: false, officialEquating: false }
}
