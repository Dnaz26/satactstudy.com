import type { GuidedLesson } from './lesson-flow'
import type { StudyProblem, StudyRank } from './types'

export type ExplanationGrade = {
  score: number
  passed: boolean
  feedback: string
  missed: string[]
  liveExample: string
}

export type CreatedQuestionGrade = {
  score: number
  passed: boolean
  saveWorthy: boolean
  feedback: string
  strengths: string[]
  gaps: string[]
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function overlapScore(answer: string, targets: string[]): number {
  const answerTokens = new Set(tokenize(answer))
  if (!answerTokens.size) return 0
  const targetTokens = new Set(targets.flatMap(tokenize))
  if (!targetTokens.size) return 40
  let hit = 0
  for (const token of answerTokens) {
    if (targetTokens.has(token)) hit += 1
  }
  const coverage = hit / Math.max(1, Math.min(answerTokens.size, 18))
  const breadth = hit / Math.max(1, Math.min(targetTokens.size, 24))
  return Math.round(Math.min(100, coverage * 70 + breadth * 40))
}

export function gradeExplanationLocally(
  answer: string,
  lesson: GuidedLesson,
): ExplanationGrade {
  const targets = [
    lesson.whatItIs,
    lesson.breakdown,
    ...lesson.examples.yes.map((item) => item.why),
    lesson.title,
  ]
  const raw = overlapScore(answer, targets)
  const lengthBonus = answer.trim().length >= 40 ? 8 : answer.trim().length >= 20 ? 4 : 0
  const hasNegation = /not|never|no fraction|no decimal|except|without/i.test(answer)
  const mentionsTopic = answer.toLowerCase().includes(lesson.title.toLowerCase().split(' ')[0] ?? '')
  const score = Math.max(0, Math.min(100, raw + lengthBonus + (hasNegation ? 4 : 0) + (mentionsTopic ? 5 : 0)))

  const missed: string[] = []
  const keyBits = lesson.whatItIs.split(/[.—]/).map((s) => s.trim()).filter((s) => s.length > 12).slice(0, 3)
  for (const bit of keyBits) {
    const words = tokenize(bit).slice(0, 4)
    if (words.length && !words.every((w) => answer.toLowerCase().includes(w))) {
      missed.push(bit)
    }
  }

  const live = lesson.examples.yes[0]
  const liveExample = live
    ? `${live.label} — ${live.why}`
    : lesson.translateExample

  if (score >= 85) {
    return {
      score,
      passed: true,
      feedback: 'Strong — you covered the core idea in your own words.',
      missed: [],
      liveExample,
    }
  }

  return {
    score,
    passed: false,
    feedback: missed[0]
      ? `You were close, but you left out something important: ${missed[0]}`
      : `Add the key rule for ${lesson.title} in plain words, then give one tiny example.`,
    missed: missed.slice(0, 2),
    liveExample,
  }
}

export function gradeBuildTranslationLocally(
  answer: string,
  lesson: GuidedLesson,
): ExplanationGrade {
  const targets = [
    lesson.translateExample,
    lesson.whatItIs,
    lesson.breakdown,
    lesson.irlExample,
    lesson.title,
  ]
  const raw = overlapScore(answer, targets)
  const lengthBonus = answer.trim().length >= 30 ? 10 : answer.trim().length >= 12 ? 5 : 0
  const mentionsExample = tokenize(lesson.translateExample).some((w) => answer.toLowerCase().includes(w))
  const score = Math.max(0, Math.min(100, raw + lengthBonus + (mentionsExample ? 8 : 0)))
  const liveExample = lesson.translateExample

  if (score >= 70) {
    return {
      score,
      passed: true,
      feedback: 'Nice translation — you named the parts and what to analyze.',
      missed: [],
      liveExample,
    }
  }

  return {
    score,
    passed: false,
    feedback: `Say what “${lesson.translateExample}” means in plain words, then name the first thing you would check.`,
    missed: ['Name each part of the built example and what you would analyze first.'],
    liveExample,
  }
}

export function gradeCreatedQuestionLocally(input: {
  lesson: GuidedLesson
  prompt: string
  choices: Array<{ key: string; text: string }>
  answer: string
  explanation?: string
}): CreatedQuestionGrade {
  const { lesson, prompt, choices, answer, explanation } = input
  const strengths: string[] = []
  const gaps: string[] = []
  let score = 40

  if (prompt.trim().length >= 20) {
    score += 15
    strengths.push('Clear prompt length')
  } else {
    gaps.push('Prompt is too short for a real SAT/ACT item')
  }

  const filled = choices.filter((c) => c.text.trim().length > 0)
  if (filled.length >= 4) {
    score += 15
    strengths.push('Four answer choices')
  } else {
    gaps.push('Need four distinct choices')
  }

  const unique = new Set(filled.map((c) => c.text.trim().toLowerCase()))
  if (unique.size >= 4) {
    score += 10
    strengths.push('Distinct choices')
  } else {
    gaps.push('Choices look too similar or blank')
  }

  if (choices.some((c) => c.key === answer && c.text.trim())) {
    score += 10
    strengths.push('Marked correct choice')
  } else {
    gaps.push('Correct answer key is missing')
  }

  const topicHit = overlapScore(`${prompt} ${explanation ?? ''}`, [
    lesson.title,
    lesson.whatItIs,
    ...lesson.examples.yes.map((e) => e.label),
  ])
  score += Math.round(topicHit * 0.2)
  if (topicHit >= 40) strengths.push('On-topic for this skill')
  else gaps.push('Does not clearly target this topic')

  if ((explanation ?? '').trim().length >= 12) {
    score += 5
    strengths.push('Has an explanation')
  }

  score = Math.max(0, Math.min(100, score))
  return {
    score,
    passed: score >= 85,
    saveWorthy: score >= 95,
    feedback: score >= 95
      ? 'Test-ready — this is strong enough to save as a bank example.'
      : score >= 85
        ? 'Good practice item. Tighten wording or distractors to hit 95+ for the bank.'
        : `Needs work: ${gaps[0] ?? 'make it closer to a real SAT/ACT question.'}`,
    strengths,
    gaps,
  }
}

export function pickPracticeQuestion(
  pool: StudyProblem[],
  difficulty: StudyRank,
  usedPrompts: Set<string>,
): StudyProblem | null {
  const ranked = pool.filter((item) => (item.difficulty ?? 'easy') === difficulty)
  const fresh = ranked.find((item) => !usedPrompts.has(item.prompt))
    ?? pool.find((item) => !usedPrompts.has(item.prompt) && (item.difficulty ?? 'easy') === difficulty)
  if (fresh) return fresh
  const anyFresh = pool.find((item) => !usedPrompts.has(item.prompt))
  return anyFresh ?? ranked[0] ?? pool[0] ?? null
}
