import { SCORE_CONFIG } from './constants'

export interface UserPerformanceData {
  test_type: 'SAT' | 'ACT'
  math_attempts: AttemptSummary[]
  reading_writing_attempts: AttemptSummary[]
  /** Original projected / baseline score (onboarding or first projection). */
  baseline_score?: number | null
  /** Practice exam totals (SAT 400–1600 or ACT 1–36). */
  practice_test_scores?: number[]
  /** 0–100 average tutoring / topic mastery. */
  tutoring_mastery?: number | null
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
  growth_rate_percent: number | null
}

/** Growth rate = (new − original) / original × 100. */
export function growthRatePercent(original: number, current: number): number | null {
  if (!Number.isFinite(original) || !Number.isFinite(current) || original === 0) return null
  return Number((((current - original) / original) * 100).toFixed(1))
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

function averageTimeSeconds(attempts: AttemptSummary[]): number {
  const timed = attempts.filter((a) => a.time_seconds > 0)
  if (!timed.length) return 0
  return timed.reduce((sum, a) => sum + a.time_seconds, 0) / timed.length
}

function wrongRate(attempts: AttemptSummary[]): number {
  if (!attempts.length) return 0.5
  const wrong = attempts.filter((a) => !a.is_correct).length
  return wrong / attempts.length
}

/**
 * Convert timing into a 0–1 quality factor.
 * Near the target pace is best; very slow or suspiciously fast both hurt.
 */
function timeFactor(avgSeconds: number, targetSeconds: number): number {
  if (avgSeconds <= 0) return 0.72
  const ratio = avgSeconds / Math.max(1, targetSeconds)
  if (ratio < 0.35) return 0.78
  if (ratio <= 1.05) return 1
  if (ratio <= 1.4) return 0.9
  if (ratio <= 1.9) return 0.78
  return 0.62
}

function wrongFactor(rate: number): number {
  return Math.max(0.25, 1 - rate * 0.95)
}

function practiceExamAccuracy(scores: number[] | undefined, testType: 'SAT' | 'ACT'): number | null {
  if (!scores?.length) return null
  const latest = scores.slice(-3)
  const avg = latest.reduce((sum, n) => sum + n, 0) / latest.length
  if (testType === 'SAT') {
    return Math.min(1, Math.max(0, (avg - SCORE_CONFIG.sat_min) / (SCORE_CONFIG.sat_max - SCORE_CONFIG.sat_min)))
  }
  return Math.min(1, Math.max(0, (avg - SCORE_CONFIG.act_min) / (SCORE_CONFIG.act_max - SCORE_CONFIG.act_min)))
}

/**
 * Blend accuracy with avg time/question, wrong rate, tutoring mastery, and practice exams.
 */
function blendedSkill(
  attempts: AttemptSummary[],
  targetSeconds: number,
  tutoringMastery: number | null | undefined,
  practiceScores: number[] | undefined,
  testType: 'SAT' | 'ACT',
): { skill: number; attempts: number } {
  const acc = weightedAccuracy(attempts)
  const avgTime = averageTimeSeconds(attempts)
  const wrongs = wrongRate(attempts)
  const timing = timeFactor(avgTime, targetSeconds)
  const accuracySignal = acc * timing * wrongFactor(wrongs)

  const mastery = tutoringMastery != null && tutoringMastery >= 0
    ? Math.min(1, Math.max(0, tutoringMastery / 100))
    : null
  const exam = practiceExamAccuracy(practiceScores, testType)

  let skill = accuracySignal
  let weight = 1
  if (mastery != null) {
    skill = skill * 0.55 + mastery * 0.25
    weight = 0.8
    // remaining 0.2 reserved for exam if present
  }
  if (exam != null) {
    const examWeight = mastery != null ? 0.2 : 0.3
    const baseWeight = 1 - examWeight
    skill = accuracySignal * (mastery != null ? 0.55 : baseWeight)
      + (mastery ?? 0) * (mastery != null ? 0.25 : 0)
      + exam * examWeight
  } else if (mastery != null) {
    skill = accuracySignal * 0.7 + mastery * 0.3
  }

  void weight
  return { skill: Math.min(1, Math.max(0, skill)), attempts: attempts.length }
}

function mapToSATSection(skill: number, attempts: number): number {
  const confidence = Math.min(1, attempts / 30)
  const blended = confidence * skill + (1 - confidence) * 0.5

  const { sat_section_min, sat_section_max } = SCORE_CONFIG
  const range = sat_section_max - sat_section_min
  const raw = sat_section_min + blended * range

  return Math.round(raw / 10) * 10
}

function mapToACT(mathSkill: number, rwSkill: number, attempts: number): number {
  const confidence = Math.min(1, attempts / 30)
  const overall =
    confidence * (mathSkill * 0.5 + rwSkill * 0.5) + (1 - confidence) * 0.5

  const { act_min, act_max } = SCORE_CONFIG
  const raw = act_min + overall * (act_max - act_min)
  return Math.round(raw)
}

function withGrowth(
  prediction: Omit<ScorePrediction, 'growth_rate_percent'>,
  baseline: number | null | undefined,
): ScorePrediction {
  return {
    ...prediction,
    growth_rate_percent: baseline != null && baseline > 0
      ? growthRatePercent(baseline, prediction.predicted_total)
      : null,
  }
}

export function predictSATScore(data: UserPerformanceData): ScorePrediction {
  const math = blendedSkill(
    data.math_attempts,
    90,
    data.tutoring_mastery,
    data.practice_test_scores,
    'SAT',
  )
  const rw = blendedSkill(
    data.reading_writing_attempts,
    70,
    data.tutoring_mastery,
    data.practice_test_scores,
    'SAT',
  )
  const totalAttempts = math.attempts + rw.attempts

  let mathSection = mapToSATSection(math.skill, math.attempts)
  let rwSection = mapToSATSection(rw.skill, rw.attempts)

  if (data.baseline_score && data.baseline_score > 0 && totalAttempts < 20) {
    const baselineWeight = Math.max(0, 1 - totalAttempts / 20)
    const baselineMath = data.baseline_score / 2
    const baselineRW = data.baseline_score / 2
    mathSection = Math.round(mathSection * (1 - baselineWeight) + baselineMath * baselineWeight)
    rwSection = Math.round(rwSection * (1 - baselineWeight) + baselineRW * baselineWeight)
  }

  // Soft-pull toward recent practice exam averages when available.
  if (data.practice_test_scores?.length) {
    const examAvg = data.practice_test_scores.slice(-3).reduce((s, n) => s + n, 0)
      / Math.min(3, data.practice_test_scores.length)
    const pull = Math.min(0.35, 0.12 + data.practice_test_scores.length * 0.05)
    const blendedTotal = Math.round(
      (mathSection + rwSection) * (1 - pull) + examAvg * pull,
    )
    const half = Math.round(blendedTotal / 2 / 10) * 10
    mathSection = half
    rwSection = blendedTotal - half
  }

  const predicted_total = mathSection + rwSection
  const confidence = Math.min(1, totalAttempts / 50 + (data.practice_test_scores?.length ? 0.15 : 0))

  const margin = Math.round((1 - confidence) * 100)
  const score_low = Math.max(SCORE_CONFIG.sat_min, predicted_total - margin)
  const score_high = Math.min(SCORE_CONFIG.sat_max, predicted_total + margin)

  const ovr_score = Math.round(
    ((predicted_total - SCORE_CONFIG.sat_min) /
      (SCORE_CONFIG.sat_max - SCORE_CONFIG.sat_min)) *
      100,
  )

  return withGrowth(
    {
      predicted_total,
      predicted_math: mathSection,
      predicted_reading_writing: rwSection,
      score_low,
      score_high,
      confidence: Math.round(confidence * 100) / 100,
      ovr_score,
    },
    data.baseline_score,
  )
}

export function predictACTScore(data: UserPerformanceData): ScorePrediction {
  const math = blendedSkill(
    data.math_attempts,
    60,
    data.tutoring_mastery,
    data.practice_test_scores,
    'ACT',
  )
  const rw = blendedSkill(
    data.reading_writing_attempts,
    50,
    data.tutoring_mastery,
    data.practice_test_scores,
    'ACT',
  )
  const totalAttempts = math.attempts + rw.attempts

  let predictedTotal = mapToACT(math.skill, rw.skill, totalAttempts)

  if (data.baseline_score && data.baseline_score > 0 && totalAttempts < 20) {
    const baselineWeight = Math.max(0, 1 - totalAttempts / 20)
    predictedTotal = Math.round(
      predictedTotal * (1 - baselineWeight) + data.baseline_score * baselineWeight,
    )
  }

  if (data.practice_test_scores?.length) {
    const examAvg = data.practice_test_scores.slice(-3).reduce((s, n) => s + n, 0)
      / Math.min(3, data.practice_test_scores.length)
    const pull = Math.min(0.4, 0.15 + data.practice_test_scores.length * 0.05)
    predictedTotal = Math.round(predictedTotal * (1 - pull) + examAvg * pull)
  }

  const confidence = Math.min(1, totalAttempts / 50 + (data.practice_test_scores?.length ? 0.15 : 0))
  const margin = Math.round((1 - confidence) * 4)

  const score_low = Math.max(SCORE_CONFIG.act_min, predictedTotal - margin)
  const score_high = Math.min(SCORE_CONFIG.act_max, predictedTotal + margin)

  const ovr_score = Math.round(
    ((predictedTotal - SCORE_CONFIG.act_min) /
      (SCORE_CONFIG.act_max - SCORE_CONFIG.act_min)) *
      100,
  )

  return withGrowth(
    {
      predicted_total: predictedTotal,
      predicted_math: null,
      predicted_reading_writing: null,
      score_low,
      score_high,
      confidence: Math.round(confidence * 100) / 100,
      ovr_score,
    },
    data.baseline_score,
  )
}
