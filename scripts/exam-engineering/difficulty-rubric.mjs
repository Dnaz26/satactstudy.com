/** Editorial difficulty rubric. Each dimension is 0, 1, or 2. The total is out of 18. */
export const RUBRIC_DIMENSIONS = [
  'steps',
  'abstraction',
  'hiddenSetup',
  'conceptMixing',
  'graphInference',
  'passageComplexity',
  'choiceCloseness',
  'distractorRealism',
  'timePressure',
]

export function rubricTotal(scores) {
  let total = 0
  for (const dimension of RUBRIC_DIMENSIONS) {
    const value = scores?.[dimension]
    if (value !== 0 && value !== 1 && value !== 2) {
      throw new Error(`Rubric dimension ${dimension} must be 0, 1, or 2`)
    }
    total += value
  }
  if (total < 0 || total > 18) throw new Error(`Rubric total ${total} is outside 0-18`)
  return total
}

export function rubricBand(total) {
  if (total >= 15) return 'elite-hard'
  if (total >= 12) return 'true-hard'
  if (total >= 8) return 'medium'
  return 'easy'
}
