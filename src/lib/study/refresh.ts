import { MATH_LEVELS, ENGLISH_LEVELS, type StudyLevel } from './levels'
export type RefreshBucket = 'math' | 'english' | 'reading' | 'science'
export function refreshBucket(level: StudyLevel): RefreshBucket {
  if (level.track === 'math') return 'math'
  if (/science/i.test(level.category) || /^ACT Science/i.test(level.title)) return 'science'
  return /reading/i.test(level.category) ? 'reading' : 'english'
}
export const REFRESH_TOPICS = [...MATH_LEVELS, ...ENGLISH_LEVELS].map(level => ({
  level, bucket: refreshBucket(level), href: `/refresh/${level.track}/${level.index}`,
}))
/** Use the authored pool once; never repeat questions to inflate the count. */
export function refreshProblems(level: StudyLevel) {
  const seen = new Set<string>()
  return level.problems.filter(problem => {
    const key = JSON.stringify([problem.prompt.trim(), problem.choices])
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
