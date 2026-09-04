import type { Message } from '@/lib/ai'
import { classifyDesmosQuestion } from '@/lib/desmos/strategies'
import { DEFAULT_TUTOR_PREFERENCES, type TutorPreferences, type TutorRequestContext, type TutorTrigger } from './types'

export interface TutorBuiltContext {
  trigger: TutorTrigger
  preferences: TutorPreferences
  compactPrompt: string
}

function clip(value: string | null | undefined, max: number): string {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}…` : value
}

export function buildFastTutorContext(
  userId: string,
  request: TutorRequestContext,
  preferences: TutorPreferences = { ...DEFAULT_TUTOR_PREFERENCES, user_id: userId }
): TutorBuiltContext {
  const trigger = request.trigger ?? 'chat'
  const classification = classifyDesmosQuestion({
    questionText: request.questionText,
    topicName: request.topicName,
    sectionName: request.sectionName,
    submitted: request.submitted,
  })
  const choices = (request.choices ?? []).slice(0, 5).map((c) => `${c.key}) ${clip(c.text, 48)}`).join(' · ')

  const compactPrompt = [
    `Trigger: ${trigger}`,
    request.topicName ? `Topic: ${request.topicName}` : '',
    request.questionText ? `Q: ${clip(request.questionText, 360)}` : '',
    choices ? `Choices: ${choices}` : '',
    request.selectedAnswer ? `Student: ${request.selectedAnswer}` : '',
    request.submitted && request.correctAnswer ? `Canonical: ${request.correctAnswer}` : '',
    trigger === 'wrong_answer' || request.isCorrect === false
      ? 'Task: 4 easy numbered steps. Grade-6 words. One idea per step. No LaTeX.'
      : request.submitted && request.officialExplanation
        ? `Note: ${clip(request.officialExplanation, 180)}`
        : '',
    request.desmosAvailable ? `Desmos: ${classification.mode}` : '',
    trigger === 'wrong_answer' || request.isCorrect === false
      ? 'Style: easy short steps'
      : `Style: ${preferences.methods.join('/')} · ${preferences.explanation_level} · ${preferences.pacing}${preferences.custom_interest ? ` · ${preferences.custom_interest}` : ''}`,
  ].filter(Boolean).join('\n')

  return { trigger, preferences, compactPrompt }
}

export function recentConversation(messages: Message[]): Message[] {
  return messages.filter((m) => m.role !== 'system').slice(-4)
}
