import { SCORE_CONFIG } from './constants'

export interface UserPerformanceData {
  test_type: 'SAT' | 'ACT'
  math_attempts: AttemptSummary[]
  reading_writing_attempts: AttemptSummary[]
  baseline_score?: number | null
  practice_test_scores?: number[]
}

interface AttemptSummary {
  is_correct: boolean
  difficulty: 'easy' | 'medium' | 'hard'
  time_seconds: number
}

export interface ScorePrediction {
  predicted_total: number
  predicted_math: number | null
  predicted_reading_writing: number | null
  score_low: number
  score_high: number
  confidence: number
  ovr_score: number
}

function weightedAccuracy(attempts: AttemptSummary[]): number {
  if (attempts.length === 0) return 0.5

  const weights = { easy: 0.75, medium: 1.0, hard: 1.25 }
  let weightedCorrect = 0
  let weightedTotal = 0

  for (const a of attempts) {
    const w = weights[a.difficulty]
    weightedTotal += w
    if (a.is_correct) weightedCorrect += w
  }

  return weightedTotal > 0 ? weightedCorrect / weightedTotal : 0.5
}

function mapToSATSection(accuracy: number, attempts: number): number {
  const confidence = Math.min(1, attempts / 30)
  const blendedAccuracy = confidence * accuracy + (1 - confidence) * 0.5

  const { sat_section_min, sat_section_max } = SCORE_CONFIG
  const range = sat_section_max - sat_section_min
  const raw = sat_section_min + blendedAccuracy * range

  return Math.round(raw / 10) * 10
}

function mapToACT(mathAccuracy: number, rwAccuracy: number, attempts: number): number {
  const confidence = Math.min(1, attempts / 30)
  const overallAcc =
    confidence * (mathAccuracy * 0.5 + rwAccuracy * 0.5) + (1 - confidence) * 0.5

  const { act_min, act_max } = SCORE_CONFIG
  const raw = act_min + overallAcc * (act_max - act_min)
  return Math.round(raw)
}

export function predictSATScore(data: UserPerformanceData): ScorePrediction {
  const mathAcc = weightedAccuracy(data.math_attempts)
  const rwAcc = weightedAccuracy(data.reading_writing_attempts)
  const totalAttempts =
    data.math_attempts.length + data.reading_writing_attempts.length

  let mathSection = mapToSATSection(mathAcc, data.math_attempts.length)
  let rwSection = mapToSATSection(rwAcc, data.reading_writing_attempts.length)

  if (data.baseline_score && data.baseline_score > 0 && totalAttempts < 20) {
    const baselineWeight = Math.max(0, 1 - totalAttempts / 20)
    const baselineMath = data.baseline_score / 2
    const baselineRW = data.baseline_score / 2
    mathSection = Math.round(mathSection * (1 - baselineWeight) + baselineMath * baselineWeight)
    rwSection = Math.round(rwSection * (1 - baselineWeight) + baselineRW * baselineWeight)
  }

  const predicted_total = mathSection + rwSection
  const confidence = Math.min(1, totalAttempts / 50)

  const margin = Math.round((1 - confidence) * 100)
  const score_low = Math.max(SCORE_CONFIG.sat_min, predicted_total - margin)
  const score_high = Math.min(SCORE_CONFIG.sat_max, predicted_total + margin)

  const ovr_score = Math.round(
    ((predicted_total - SCORE_CONFIG.sat_min) /
      (SCORE_CONFIG.sat_max - SCORE_CONFIG.sat_min)) *
      100
  )

  return {
    predicted_total,
    predicted_math: mathSection,
    predicted_reading_writing: rwSection,
    score_low,
    score_high,
    confidence: Math.round(confidence * 100) / 100,
    ovr_score,
  }
}

export function predictACTScore(data: UserPerformanceData): ScorePrediction {
  const mathAcc = weightedAccuracy(data.math_attempts)
  const rwAcc = weightedAccuracy(data.reading_writing_attempts)
  const totalAttempts =
    data.math_attempts.length + data.reading_writing_attempts.length

  let predictedTotal = mapToACT(mathAcc, rwAcc, totalAttempts)

  if (data.baseline_score && data.baseline_score > 0 && totalAttempts < 20) {
    const baselineWeight = Math.max(0, 1 - totalAttempts / 20)
    predictedTotal = Math.round(
      predictedTotal * (1 - baselineWeight) + data.baseline_score * baselineWeight
    )
  }

  const confidence = Math.min(1, totalAttempts / 50)
  const margin = Math.round((1 - confidence) * 4)

  const score_low = Math.max(SCORE_CONFIG.act_min, predictedTotal - margin)
  const score_high = Math.min(SCORE_CONFIG.act_max, predictedTotal + margin)

  const ovr_score = Math.round(
    ((predictedTotal - SCORE_CONFIG.act_min) /
      (SCORE_CONFIG.act_max - SCORE_CONFIG.act_min)) *
      100
  )

  return {
    predicted_total: predictedTotal,
    predicted_math: null,
    predicted_reading_writing: null,
    score_low,
    score_high,
    confidence: Math.round(confidence * 100) / 100,
    ovr_score,
  }
}
