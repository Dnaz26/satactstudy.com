import { MASTERY_CONFIG } from './constants'

export interface AttemptData {
  is_correct: boolean
  time_seconds: number
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
}

export interface TopicMasteryResult {
  knowledge_mastery: number
  speed_mastery: number
  overall_mastery: number
  total_attempts: number
  correct_attempts: number
  avg_time_seconds: number
  trend: 'improving' | 'stable' | 'declining' | 'neutral'
}

const {
  accuracy_weight,
  recent_accuracy_weight,
  difficulty_adjusted_weight,
  recent_window,
  confidence_divisor,
  easy_weight,
  medium_weight,
  hard_weight,
  knowledge_mastery_weight,
  speed_mastery_weight,
} = MASTERY_CONFIG

function getDifficultyWeight(difficulty: 'easy' | 'medium' | 'hard'): number {
  if (difficulty === 'easy') return easy_weight
  if (difficulty === 'hard') return hard_weight
  return medium_weight
}

export function calculateKnowledgeMastery(attempts: AttemptData[]): number {
  if (attempts.length === 0) return 0

  const total = attempts.length
  const correct = attempts.filter((a) => a.is_correct).length
  const accuracy = correct / total

  const recent = attempts.slice(-recent_window)
  const recentCorrect = recent.filter((a) => a.is_correct).length
  const recentAccuracy = recent.length > 0 ? recentCorrect / recent.length : accuracy

  let diffWeightedCorrect = 0
  let diffWeightedTotal = 0
  for (const a of attempts) {
    const w = getDifficultyWeight(a.difficulty)
    diffWeightedTotal += w
    if (a.is_correct) diffWeightedCorrect += w
  }
  const diffAdjustedAccuracy =
    diffWeightedTotal > 0 ? diffWeightedCorrect / diffWeightedTotal : accuracy

  const baseMastery =
    accuracy_weight * accuracy +
    recent_accuracy_weight * recentAccuracy +
    difficulty_adjusted_weight * diffAdjustedAccuracy

  const confidence = Math.min(1, total / confidence_divisor)
  const mastery = 100 * (confidence * baseMastery + (1 - confidence) * 0.5)

  return Math.round(Math.min(100, Math.max(0, mastery)))
}

export function calculateSpeedMastery(
  attempts: AttemptData[],
  targetTimeSeconds: number
): number {
  if (attempts.length === 0) return 0

  const avgTime =
    attempts.reduce((sum, a) => sum + a.time_seconds, 0) / attempts.length

  if (avgTime <= 0 || targetTimeSeconds <= 0) return 50

  const ratio = targetTimeSeconds / avgTime
  const rawSpeed = Math.min(1, ratio)

  const confidence = Math.min(1, attempts.length / confidence_divisor)
  const mastery = 100 * (confidence * rawSpeed + (1 - confidence) * 0.5)

  return Math.round(Math.min(100, Math.max(0, mastery)))
}

export function calculateOverallMastery(knowledge: number, speed: number): number {
  return Math.round(
    knowledge_mastery_weight * knowledge + speed_mastery_weight * speed
  )
}

export function getTrend(
  recentMastery: number,
  previousMastery: number
): 'improving' | 'stable' | 'declining' | 'neutral' {
  const delta = recentMastery - previousMastery
  if (delta > 5) return 'improving'
  if (delta < -5) return 'declining'
  if (Math.abs(delta) <= 5 && previousMastery > 0) return 'stable'
  return 'neutral'
}

export function calculateTopicMastery(
  attempts: AttemptData[],
  targetTimeSeconds: number,
  previousMastery?: number
): TopicMasteryResult {
  const knowledge = calculateKnowledgeMastery(attempts)
  const speed = calculateSpeedMastery(attempts, targetTimeSeconds)
  const overall = calculateOverallMastery(knowledge, speed)

  const total = attempts.length
  const correct = attempts.filter((a) => a.is_correct).length
  const avgTime =
    total > 0
      ? attempts.reduce((s, a) => s + a.time_seconds, 0) / total
      : 0

  const trend =
    previousMastery !== undefined
      ? getTrend(overall, previousMastery)
      : 'neutral'

  return {
    knowledge_mastery: knowledge,
    speed_mastery: speed,
    overall_mastery: overall,
    total_attempts: total,
    correct_attempts: correct,
    avg_time_seconds: Math.round(avgTime),
    trend,
  }
}
