import type { Message } from '@/lib/ai'
import { classifyDesmosQuestion } from '@/lib/desmos/strategies'
import { getRecentMisconceptions } from './memory'
import { getRecentAttempts, getStudentMastery, getStudentProfileSnapshot } from './tools'
import { DEFAULT_TUTOR_PREFERENCES, type TutorPreferences, type TutorRequestContext, type TutorTrigger } from './types'

export interface TutorBuiltContext {
  trigger: TutorTrigger
  preferences: TutorPreferences
  compactPrompt: string
  masteryOverall: number | null
  toolsUsed: string[]
  studentMemoryLine: string | null
}

function clip(value: string | null | undefined, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export function buildFastTutorContext(
  userId: string,
  request: TutorRequestContext,
  preferences: TutorPreferences = { ...DEFAULT_TUTOR_PREFERENCES, user_id: userId },
  extras?: {
    masteryOverall?: number | null
    memoryBits?: string[]
    toolsUsed?: string[]
  },
): TutorBuiltContext {
  const trigger = request.trigger ?? 'chat'
  const classification = classifyDesmosQuestion({
    questionText: request.questionText,
    topicName: request.topicName,
    sectionName: request.sectionName,
    submitted: request.submitted,
  })
  const choices = (request.choices ?? []).slice(0, 5).map((c) => `${c.key}) ${clip(c.text, 48)}`).join(' · ')
  const memoryBits = extras?.memoryBits ?? []

  const compactPrompt = [
    `Trigger: ${trigger}`,
    request.topicName ? `Topic: ${request.topicName}` : '',
    request.questionText ? `Q: ${clip(request.questionText, 360)}` : '',
    choices ? `Choices: ${choices}` : '',
    request.selectedAnswer ? `Student: ${request.selectedAnswer}` : '',
    request.submitted && request.correctAnswer ? `Canonical: ${request.correctAnswer}` : '',
    extras?.masteryOverall != null ? `Mastery: ${Math.round(extras.masteryOverall)}/100` : '',
    memoryBits.length ? `Memory: ${memoryBits.join(' · ')}` : '',
    trigger === 'wrong_answer' || request.isCorrect === false
      ? 'Task: 4 easy numbered steps. Grade-6 words. One idea per step. No LaTeX. Fix the mistake pattern.'
      : request.submitted && request.officialExplanation
        ? `Note: ${clip(request.officialExplanation, 180)}`
        : '',
    request.desmosAvailable ? `Desmos: ${classification.mode}` : '',
    trigger === 'wrong_answer' || request.isCorrect === false
      ? 'Style: easy short steps'
      : `Style: ${preferences.methods.join('/')} · ${preferences.explanation_level} · ${preferences.pacing}${preferences.custom_interest ? ` · ${preferences.custom_interest}` : ''}`,
    'Goal: raise score efficiently with real understanding. Next action after teaching.',
  ].filter(Boolean).join('\n')

  return {
    trigger,
    preferences,
    compactPrompt,
    masteryOverall: extras?.masteryOverall ?? null,
    toolsUsed: extras?.toolsUsed ?? [],
    studentMemoryLine: memoryBits.length
      ? `Relevant student memory: ${memoryBits.join('; ')}.`
      : null,
  }
}

/**
 * Enrich with mastery, recent mistakes, misconceptions, and profile goals.
 * Failures are ignored so tutoring never blocks on memory tools.
 */
export async function buildEnrichedTutorContext(
  userId: string,
  request: TutorRequestContext,
  preferences: TutorPreferences,
): Promise<TutorBuiltContext> {
  const toolsUsed: string[] = []
  const memoryBits: string[] = []
  let masteryOverall: number | null = null

  const [mastery, attempts, misconceptions, profile] = await Promise.all([
    getStudentMastery(userId, request.topicId).catch(() => null),
    getRecentAttempts(userId, request.topicId).catch(() => []),
    getRecentMisconceptions(userId, request.topicId).catch(() => []),
    getStudentProfileSnapshot(userId).catch(() => null),
  ])

  if (mastery) {
    toolsUsed.push('get_student_mastery')
    masteryOverall = Number(mastery.overall_mastery ?? 0)
    const accuracy = mastery.total_attempts
      ? Math.round((Number(mastery.correct_attempts ?? 0) / Number(mastery.total_attempts)) * 100)
      : null
    memoryBits.push(
      `topic mastery ${Math.round(masteryOverall)}${accuracy != null ? `, accuracy ${accuracy}%` : ''} over ${mastery.total_attempts ?? 0} attempts`,
    )
  }

  if (attempts.length) {
    toolsUsed.push('get_recent_attempts')
    const wrong = attempts.filter((a) => a.correct === false).length
    const types = attempts
      .map((a) => a.mistake_type)
      .filter((t): t is string => Boolean(t))
      .slice(0, 3)
    memoryBits.push(`last ${attempts.length} attempts: ${wrong} misses${types.length ? ` (${types.join(', ')})` : ''}`)
  }

  if (misconceptions.length) {
    toolsUsed.push('get_recent_misconceptions')
    memoryBits.push(
      `patterns: ${misconceptions
        .slice(0, 3)
        .map((m) => `${m.category}${m.occurrences > 1 ? `×${m.occurrences}` : ''}`)
        .join(', ')}`,
    )
  }

  if (profile) {
    toolsUsed.push('get_student_profile')
    const bits = [
      profile.test_type ? `${profile.test_type} track` : null,
      profile.target_score != null ? `target ${profile.target_score}` : null,
      profile.current_score != null ? `current ~${profile.current_score}` : null,
      profile.custom_interest ? `likes ${clip(profile.custom_interest, 40)}` : null,
    ].filter(Boolean)
    if (bits.length) memoryBits.push(bits.join(', '))
  }

  if (preferences.custom_interest && !memoryBits.some((b) => b.includes(preferences.custom_interest!))) {
    memoryBits.push(`prefers ${clip(preferences.custom_interest, 40)} examples`)
  }

  return buildFastTutorContext(userId, request, preferences, {
    masteryOverall,
    memoryBits: memoryBits.slice(0, 5),
    toolsUsed,
  })
}

export function recentConversation(messages: Message[]): Message[] {
  return messages.filter((m) => m.role !== 'system').slice(-4)
}
