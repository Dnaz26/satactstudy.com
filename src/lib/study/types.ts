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

export function tagDifficulties(problems: StudyProblem[]): StudyProblem[] {
  const order: Record<StudyRank, number> = { easy: 0, medium: 1, hard: 2 }
  const tagged = problems.map((item, index) => {
    const rank = item.difficulty === 'easy' || item.difficulty === 'medium' || item.difficulty === 'hard'
      ? item.difficulty
      : STUDY_RANKS[Math.min(index, 2)]
    return { ...item, difficulty: rank }
  })
  return [...tagged].sort((a, b) => order[a.difficulty ?? 'easy'] - order[b.difficulty ?? 'easy']).slice(0, 3)
}

export type StudyLevel = {
  index: number
  track: StudyTrack
  category: string
  title: string
  topicMatch: string[]
  example: string
  teach: string[]
  tricks: string[]
  problems: StudyProblem[]
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
): StudyLevel {
  return {
    index,
    track,
    category,
    title,
    topicMatch,
    example,
    teach,
    tricks,
    problems: tagDifficulties(problems),
  }
}
