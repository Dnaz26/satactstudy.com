/**
 * Enhanced ACT scaled scoring.
 *
 * HONESTY CONTRACT (do not weaken):
 * - Real ACT scale tables are form-specific equating built from field-test
 *   data. This repo has no empirical calibration sample
 *   (exam_calibration_reports is empty), so every value here is an ESTIMATE.
 * - Scales are computed over ADMINISTERED totals (English 50, Math 45,
 *   Reading 36, Science 40), not operational counts, because field-test
 *   slots are mixed invisibly and cannot be excluded without calibration.
 * - The core composite is the rounded average of English, Math, and Reading
 *   ONLY. Science is reported separately and never enters the composite.
 * - STEM = rounded mean of Math and Science, per ACT's published definition
 *   (average of the two section scores, halves up). No ELA score is reported
 *   (it requires the Writing test, which this product does not offer).
 * - Tables are versioned per form. When calibration exists, add a new table
 *   version here; never silently mutate a published table.
 */

export type ActSection = 'english' | 'math' | 'reading' | 'science'
export type ActCoreSection = 'english' | 'math' | 'reading'

/** Administered items per section on the enhanced ACT. */
export const ACT_ADMINISTERED_COUNTS: Record<ActSection, number> = {
  english: 50,
  math: 45,
  reading: 36,
  science: 40,
};

/** Operational (scored) items per section; field-test remainder is unscored. */
export const ACT_SCORED_COUNTS: Record<ActSection, number> = {
  english: 40,
  math: 41,
  reading: 27,
  science: 34,
};

export const ACT_FIELD_TEST_COUNTS: Record<ActSection, number> = {
  english: 10,
  math: 4,
  reading: 9,
  science: 6,
};

function buildTable(max: number): number[] {
  const table: number[] = []
  for (let raw = 0; raw <= max; raw++) {
    if (raw <= 0) {
      table.push(1)
      continue
    }
    const linear = 1 + (35 * raw) / max
    const floored = raw < max * 0.2 ? linear + (max * 0.2 - raw) * 0.08 : linear
    table.push(Math.max(1, Math.min(36, Math.round(floored))))
  }
  return table
}

export type ActFormVersion = 'act-flagship-v1-estimate'

/** Form-versioned conversion tables. Values are estimates, not equating. */
export const ACT_SCALES: Record<ActFormVersion, Record<ActSection, number[]>> = {
  'act-flagship-v1-estimate': {
    english: buildTable(ACT_ADMINISTERED_COUNTS.english),
    math: buildTable(ACT_ADMINISTERED_COUNTS.math),
    reading: buildTable(ACT_ADMINISTERED_COUNTS.reading),
    science: buildTable(ACT_ADMINISTERED_COUNTS.science),
  },
}

/** Raw correct -> 1-36 scaled estimate for one section. */
export function actScaledScore(
  section: ActSection,
  correct: number,
  form: ActFormVersion = 'act-flagship-v1-estimate',
): number {
  const table = ACT_SCALES[form][section]
  const clamped = Math.max(0, Math.min(table.length - 1, Math.round(correct)))
  return table[clamped] ?? 1
}

/**
 * Enhanced core composite: rounded average of English, Math, Reading.
 * Science MUST NOT enter this average.
 */
export function actComposite(scores: Record<ActCoreSection, number>): number {
  const mean = (scores.english + scores.math + scores.reading) / 3
  return Math.max(1, Math.min(36, Math.round(mean)))
}

/** STEM score per ACT's definition: rounded mean of Math and Science. */
export function actStemScore(math: number, science: number): number {
  return Math.max(1, Math.min(36, Math.round((math + science) / 2)))
}

export function actScoreSummary(
  correct: Record<ActSection, number>,
  form: ActFormVersion = 'act-flagship-v1-estimate',
): {
  scaled: Record<ActSection, number>
  composite: number
  stem: number
} {
  const scaled: Record<ActSection, number> = {
    english: actScaledScore('english', correct.english, form),
    math: actScaledScore('math', correct.math, form),
    reading: actScaledScore('reading', correct.reading, form),
    science: actScaledScore('science', correct.science, form),
  }
  return {
    scaled,
    composite: actComposite(scaled),
    stem: actStemScore(scaled.math, scaled.science),
  }
}
