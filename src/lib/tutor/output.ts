import { parseAgentActions } from '@/lib/desmos/actions'
import { TUTOR_STRATEGIES, type TutorOutput, type TutorStrategy } from './types'

const FALLBACK_MESSAGE = "Let's slow down and look at this together. What part of the question feels unclear first?"

function asStrategy(value: unknown): TutorStrategy {
  return TUTOR_STRATEGIES.includes(value as TutorStrategy) ? (value as TutorStrategy) : 'step_by_step'
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
}

export function parseTutorOutput(raw: string): TutorOutput {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced?.[1]?.trim() ?? trimmed

  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>
    const message = typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : FALLBACK_MESSAGE

    return {
      message,
      strategy: asStrategy(parsed.strategy),
      misconception: typeof parsed.misconception === 'string' ? parsed.misconception : null,
      confidence: asNumber(parsed.confidence, 0.5),
      understanding_check: typeof parsed.understanding_check === 'string' ? parsed.understanding_check : null,
      desmosActions: parseAgentActions(parsed.desmosActions ?? parsed.desmos_actions),
      next_action: parsed.next_action === 'continue' || parsed.next_action === 'new_practice'
        ? parsed.next_action
        : 'wait_for_student',
      related_question_id: typeof parsed.related_question_id === 'string' ? parsed.related_question_id : null,
    }
  } catch {
    return {
      message: trimmed && !trimmed.startsWith('{') ? trimmed : FALLBACK_MESSAGE,
      strategy: 'direct',
      misconception: null,
      confidence: 0.4,
      understanding_check: null,
      desmosActions: [],
      next_action: 'wait_for_student',
      related_question_id: null,
    }
  }
}

export function formatTutorSteps(text: string): string[] | null {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const numbered = lines
    .filter((line) => /^\d+[\.\)\:]\s+/.test(line))
    .map((line) => line.replace(/^\d+[\.\)\:]\s+/, '').trim())
    .filter(Boolean)
  if (numbered.length >= 2) return numbered
  const shortLines = lines.length >= 2 && lines.length <= 6 && lines.every((line) => line.length <= 160)
  if (shortLines) return lines
  return null
}

export function studentSafeError(): TutorOutput {
  return {
    message: "I hit a snag just now. You can keep working the question, and I'll try again whenever you're ready.",
    strategy: 'direct',
    misconception: null,
    confidence: 0,
    understanding_check: null,
    desmosActions: [],
    next_action: 'wait_for_student',
    related_question_id: null,
  }
}
