export type StudyTrack = 'math' | 'english'

export type StudyRank = 'easy' | 'medium' | 'hard'

export type StudyProblem = {
  prompt: string
  choices: Array<{ key: string; text: string }>
  answer: string
  explain: string
  difficulty?: StudyRank
}

export const STUDY_RANKS: StudyRank[] = ['easy', 'medium', 'hard']

export function tagDifficulties(problems: StudyProblem[], count = 2): StudyProblem[] {
  const order: Record<StudyRank, number> = { easy: 0, medium: 1, hard: 2 }
  const tagged = problems.map((item, index) => {
    const rank = item.difficulty === 'easy' || item.difficulty === 'medium' || item.difficulty === 'hard'
      ? item.difficulty
      : STUDY_RANKS[Math.min(index, STUDY_RANKS.length - 1)]
    return { ...item, difficulty: rank }
  })
  return [...tagged]
    .sort((a, b) => order[a.difficulty ?? 'easy'] - order[b.difficulty ?? 'easy'])
    .slice(0, Math.max(1, count))
}

/**
 * Which test(s) a lesson serves. Content lessons use sat | act | both.
 * Test-taking lessons use the *_strategy variants and never count as
 * academic topics for coverage math.
 */
export type LessonScope =
  | 'sat'
  | 'act'
  | 'both'
  | 'sat_strategy'
  | 'act_strategy'
  | 'both_strategy'

/** Official-scope honesty tag: directly tested vs supporting skill vs strategy. */
export type LessonTested = 'direct' | 'prereq' | 'strategy'

export type StudyLevel = {
  index: number
  track: StudyTrack
  category: string
  /** Finer grouping inside a category, e.g. 'Number systems', 'Linear equations'. */
  subcategory: string
  title: string
  topicMatch: string[]
  example: string
  /** Concepts taught (doubles as the stored concept list). */
  teach: string[]
  /** Common mistakes + tricks (doubles as the stored mistake list). */
  tricks: string[]
  /** Worked examples + practice skills (problems carry explanations). */
  problems: StudyProblem[]
  scope: LessonScope
  tested: LessonTested
  /** SAT relevance (true when scope is sat/both or any strategy incl. SAT). */
  sat: boolean
  /** ACT relevance (true when scope is act/both or any strategy incl. ACT). */
  act: boolean
  /** Prerequisite lesson indices (same track) to learn first. */
  prereqs: number[]
  /** Learning objectives for the lesson. */
  objectives: string[]
  /** Relative difficulty of the lesson itself. */
  difficulty: StudyRank
}

export type LevelMeta = {
  subcategory?: string
  scope?: LessonScope
  tested?: LessonTested
  prereqs?: number[]
  objectives?: string[]
  difficulty?: StudyRank
}

export function makeProblem(
  prompt: string,
  answer: string,
  choices: [string, string, string, string],
  explain: string,
): StudyProblem {
  const keys = ['A', 'B', 'C', 'D'] as const
  return {
    prompt,
    answer,
    explain,
    choices: keys.map((key, i) => ({ key, text: choices[i] })),
  }
}

export function makeLevel(
  index: number,
  track: StudyTrack,
  category: string,
  title: string,
  topicMatch: string[],
  example: string,
  teach: string[],
  tricks: string[],
  problems: StudyProblem[],
  meta?: LevelMeta,
): StudyLevel {
  const scope = meta?.scope ?? 'both'
  return {
    index,
    track,
    category,
    subcategory: meta?.subcategory ?? '',
    title,
    topicMatch,
    example,
    teach,
    tricks,
    problems: tagDifficulties(problems, Math.max(problems.length, 3)),
    scope,
    tested: meta?.tested ?? (scope.endsWith('_strategy') ? 'strategy' : 'direct'),
    sat: scope === 'sat' || scope === 'both' || scope === 'sat_strategy' || scope === 'both_strategy',
    act: scope === 'act' || scope === 'both' || scope === 'act_strategy' || scope === 'both_strategy',
    prereqs: meta?.prereqs ?? [],
    objectives: meta?.objectives ?? [],
    difficulty: meta?.difficulty ?? 'medium',
  }
}
