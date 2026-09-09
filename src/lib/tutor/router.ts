import type { DeepSeekModelKind } from '@/lib/ai'
import type { TutorTrigger } from './types'

export type NovaModelTier = 'fast' | 'standard' | 'advanced'

export interface NovaRouteDecision {
  tier: NovaModelTier
  model: DeepSeekModelKind
  speed: 'interactive' | 'background'
  maxTokens: number
  difficulty: number
  reason: string
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Task difficulty /100 → cheapest capable model.
 * Interactive streams stay on flash/vision for latency; non-stream hard work can escalate to pro.
 */
export function scoreTutorDifficulty(input: {
  trigger?: TutorTrigger
  hasImage?: boolean
  submitted?: boolean
  isCorrect?: boolean
  questionTextLength?: number
  masteryOverall?: number | null
  stream?: boolean
}): number {
  let score = 18

  switch (input.trigger) {
    case 'wrong_answer':
      score += 28
      break
    case 'explain':
      score += 22
      break
    case 'help':
      score += 18
      break
    case 'correct_answer':
      score += 8
      break
    case 'hint':
      score += 10
      break
    case 'chat':
    default:
      score += 6
      break
  }

  if (input.isCorrect === false) score += 12
  if (input.submitted && input.isCorrect === false) score += 6
  if ((input.questionTextLength ?? 0) > 500) score += 10
  if ((input.questionTextLength ?? 0) > 900) score += 8
  if (input.masteryOverall != null && input.masteryOverall < 40) score += 12
  if (input.masteryOverall != null && input.masteryOverall < 25) score += 8
  if (input.hasImage) score += 15
  if (input.stream) score -= 8

  return clamp(Math.round(score), 0, 100)
}

export function routeNovaModel(input: {
  trigger?: TutorTrigger
  hasImage?: boolean
  submitted?: boolean
  isCorrect?: boolean
  questionTextLength?: number
  masteryOverall?: number | null
  stream?: boolean
  previousFailures?: number
}): NovaRouteDecision {
  let difficulty = scoreTutorDifficulty(input)
  if ((input.previousFailures ?? 0) >= 2) difficulty = clamp(difficulty + 25, 0, 100)

  if (input.hasImage) {
    return {
      tier: difficulty >= 71 ? 'advanced' : 'standard',
      model: 'vision',
      speed: 'interactive',
      maxTokens: difficulty >= 50 ? 520 : 420,
      difficulty,
      reason: 'Image attached — vision model required',
    }
  }

  // Interactive chat: keep Tier-1 flash for latency (target ~70-80% of traffic).
  if (input.stream !== false) {
    const escalated = difficulty >= 71
    return {
      tier: escalated ? 'standard' : 'fast',
      model: 'flash',
      speed: 'interactive',
      maxTokens: escalated ? 560 : difficulty >= 40 ? 460 : 380,
      difficulty,
      reason: escalated
        ? 'Hard tutoring task — flash with larger budget (interactive)'
        : 'Simple/moderate tutoring — fast model',
    }
  }

  // Non-stream: allow Tier-2/3 escalation on hard work.
  if (difficulty >= 71) {
    return {
      tier: 'advanced',
      model: 'pro',
      speed: 'background',
      maxTokens: 700,
      difficulty,
      reason: 'Difficult reasoning / verification — advanced model',
    }
  }
  if (difficulty >= 31) {
    return {
      tier: 'standard',
      model: 'pro',
      speed: 'background',
      maxTokens: 560,
      difficulty,
      reason: 'Moderate personalized teaching — standard model',
    }
  }
  return {
    tier: 'fast',
    model: 'flash',
    speed: 'interactive',
    maxTokens: 380,
    difficulty,
    reason: 'Easy conversation / short explanation — fast model',
  }
}
