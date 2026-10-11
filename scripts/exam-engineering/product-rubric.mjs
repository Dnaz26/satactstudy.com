/** Editorial structural rubric for bank reclassification.
 * Each dimension is 0, 1, or 2. This is not a student-performance measure
 * and it is not a literal multiple of official-exam difficulty. */

export const PRODUCT_DIMENSIONS = [
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

export function productBand(total) {
  if (total >= 15) return 'elite-hard'
  if (total >= 12) return 'hard'
  if (total >= 9) return 'medium'
  if (total >= 6) return 'easy'
  return 'foundation'
}

export function routingScore(total) {
  const band = productBand(total)
  if (band === 'foundation') return Math.round((0.08 + total * 0.03) * 100) / 100
  if (band === 'easy') return Math.round((0.32 + (total - 6) * 0.04) * 100) / 100
  if (band === 'medium') return Math.round((0.55 + (total - 9) * 0.07) * 100) / 100
  if (band === 'hard') return Math.round((0.86 + (total - 12) * 0.03) * 100) / 100
  return Math.round((0.95 + (total - 15) * 0.01) * 100) / 100
}

function clampDimension(value) {
  return value <= 0 ? 0 : value >= 2 ? 2 : 1
}

function words(text) {
  return (text.match(/[A-Za-z0-9']+/g) ?? []).length
}

function choiceSimilarity(choices) {
  const cleaned = choices.map((choice) => choice.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).filter(Boolean)
  if (cleaned.length < 2) return 0
  let close = 0
  for (let i = 0; i < cleaned.length; i += 1) {
    for (let j = i + 1; j < cleaned.length; j += 1) {
      const a = new Set(cleaned[i].split(' ').filter((part) => part.length > 2))
      const b = new Set(cleaned[j].split(' ').filter((part) => part.length > 2))
      if (!a.size || !b.size) continue
      let shared = 0
      for (const token of a) if (b.has(token)) shared += 1
      const overlap = shared / Math.min(a.size, b.size)
      if (overlap >= 0.6) close += 1
    }
  }
  return close
}

export function templateSignature(text) {
  return text
    .toLowerCase()
    .replace(/\\[a-z]+/g, '')
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[^a-z#+=\-*/^<>%()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const ONE_STEP = [
  /what is the (median|mean|mode|greater solution|value of [a-z])/i,
  /which expression equals [a-z]\(/i,
  /what is the solution for/i,
  /what is \d+\s*% of/i,
  /both are red/i,
  /what is the new mean/i,
]

const TEMPLATE_FRAME = [
  /which choice punctuates the report from/i,
  /study note \d+/i,
  /^passage \d+:/i,
  /which statement follows\?$/i,
  /skill set\s+\d+/i,
  /topic fill\s+\d+/i,
]

export function scoreBankQuestion(input) {
  const stem = (input.questionText ?? '').trim()
  const passage = (input.passage ?? '').trim()
  const explanation = (input.explanation ?? '').trim()
  const choices = (input.choices ?? []).map((choice) => (choice ?? '').trim()).filter(Boolean)
  const reasons = []
  const blob = `${stem}\n${passage}\n${explanation}`
  const stemWords = words(stem)
  const passageWords = words(passage)
  const equations = (stem.match(/=/g) ?? []).length
  const template = TEMPLATE_FRAME.some((pattern) => pattern.test(stem))
  const oneStep = ONE_STEP.some((pattern) => pattern.test(stem)) || (equations <= 1 && stemWords < 28 && passageWords < 20)

  let steps = 0
  const stageMarks = (blob.match(/\b(then|therefore|after|subtract|scale|remaining|unless|but)\b/gi) ?? []).length
  if (equations >= 2 || stageMarks >= 2 || (stemWords > 45 && (stem.match(/\b(and|after|but|unless)\b/gi) ?? []).length >= 2)) steps = 2
  if (/same base|complete the square|for every pair|after minute|nothing leaves|throws out|in terms of/i.test(blob)) steps = Math.max(steps, 2)
  else if (equations >= 1 || stageMarks >= 1 || stemWords > 22) steps = 1
  if (/similar/i.test(stem) && /area|trapezoid/i.test(stem)) steps = 2
  if (/mean/i.test(stem) && /median/i.test(stem)) steps = 2
  if (template) {
    steps = Math.min(steps, 1)
    reasons.push('Repeated surface frame.')
  }
  if (oneStep && steps < 2) reasons.push('One main operation.')
  if (/two planning equations|distributing every grouped term|greater solution of the equation/i.test(stem)) {
    steps = 2
    reasons.push('Multi-step algebra is present, but it is a repeated calculation frame.')
  }

  let abstraction = 0
  if (/\b(in terms of|for all|must be true|parameter|constant|expression|which of the following|variable)\b/i.test(blob) || /[a-z]\([^)]*\)/i.test(stem)) abstraction = 1
  if (/\b(in terms of|parameter|for every|which must be true)\b/i.test(stem) && /[a-z]\s*[\^+\-*/=]/i.test(stem)) abstraction = 2
  if (template) abstraction = Math.min(abstraction, 1)

  let hiddenSetup = 0
  if (/\b(except|must not|constraint|cannot|least|greatest|which statement|which conclusion|trapezoid|largest)\b/i.test(stem)) hiddenSetup = 1
  if ((stem.match(/\b(and|but|after|unless|except)\b/gi) ?? []).length >= 2 && stemWords > 35) hiddenSetup = 2
  if (template) hiddenSetup = Math.min(hiddenSetup, 1)

  const conceptLexicon = ['ratio', 'percent', 'probability', 'mean', 'median', 'function', 'system', 'triangle', 'circle', 'evidence', 'punctuation', 'rate', 'equation', 'gallon', 'minute', 'exponent', 'radius']
  const conceptHits = conceptLexicon.filter((word) => new RegExp(`\\b${word}`, 'i').test(blob)).length
  let conceptMixing = conceptHits >= 2 ? 2 : conceptHits === 1 && stemWords > 30 ? 1 : 0
  if (template) conceptMixing = Math.min(conceptMixing, 1)

  let graphInference = 0
  if (input.graphic || /\b(table|graph|scatter|diagram|figure|chart)\b/i.test(blob)) graphInference = 1
  if (/\b(which (claim|statement|conclusion)|trend|not supported)\b/i.test(stem) && graphInference) graphInference = 2

  let passageComplexity = 0
  if (passageWords >= 40 || stemWords >= 70) passageComplexity = 1
  if (passageWords >= 140 || /memo a|memo b|passage 1|passage 2/i.test(blob)) passageComplexity = 2
  if (template && passageWords < 80) passageComplexity = Math.min(passageComplexity, 1)

  const closePairs = choiceSimilarity(choices)
  const numericChoices = choices.map((choice) => Number(choice.replace(/[$,]/g, ''))).filter((value) => Number.isFinite(value))
  const numericSpread = numericChoices.length >= 3 ? Math.max(...numericChoices) - Math.min(...numericChoices) : Infinity
  const numericClose = numericChoices.length >= 3 && numericSpread <= Math.max(4, Math.abs(numericChoices[0] ?? 0))
  let choiceCloseness = closePairs >= 2 ? 2 : closePairs === 1 || numericClose ? 1 : 0
  if (choices.length === 4 && new Set(choices.map((choice) => choice.toLowerCase())).size < 4) {
    choiceCloseness = 0
    reasons.push('Repeated answer choice.')
  }

  const rationaleCount = Object.keys(input.rationales ?? {}).length
  let distractorRealism = rationaleCount >= 4 || choices.length === 4 ? 1 : 0
  if (rationaleCount >= 4 && choiceCloseness >= 1 && !template) distractorRealism = 2

  let timePressure = 0
  if (stemWords > 35 || (input.estimatedSeconds ?? 0) >= 60) timePressure = 1
  if (stemWords > 55 || equations >= 2 || steps >= 2) timePressure = 2
  if (template) timePressure = Math.min(timePressure, 1)
  if (oneStep) timePressure = Math.min(timePressure, 1)

  const scores = {
    steps: clampDimension(steps),
    abstraction: clampDimension(abstraction),
    hiddenSetup: clampDimension(hiddenSetup),
    conceptMixing: clampDimension(conceptMixing),
    graphInference: clampDimension(graphInference),
    passageComplexity: clampDimension(passageComplexity),
    choiceCloseness: clampDimension(choiceCloseness),
    distractorRealism: clampDimension(distractorRealism),
    timePressure: clampDimension(timePressure),
  }
  let total = PRODUCT_DIMENSIONS.reduce((sum, key) => sum + scores[key], 0)
  if (scores.steps === 0) total = Math.min(total, 8)
  if (scores.steps < 2 && total > 11) {
    total = 11
    reasons.push('Fewer than two reasoning stages, so the item cannot stay Hard.')
  }
  return {
    scores,
    total,
    band: productBand(total),
    oneStep: scores.steps === 0,
    template,
    reasons,
  }
}

export function reclassifyLabel(currentDifficulty, scored) {
  const current = (currentDifficulty ?? 'medium').toLowerCase()
  if (current === 'medium') {
    if (scored.total >= 6) {
      return { difficulty: 'Easy', band: 'easy', reason: 'Former Medium item scored at least 6, so it becomes the new Easy floor.' }
    }
    return { difficulty: 'Easy', band: 'foundation', reason: 'Former Medium item scored below 6, so it is Foundation and is labeled Easy for tutoring.' }
  }
  if (current === 'hard' || current === 'elite hard' || current === 'elite-hard') {
    if (scored.scores.steps < 2 || scored.total < 12) {
      if (scored.total >= 9) return { difficulty: 'Medium', band: 'medium', reason: 'Former Hard item scored 9–11, or it lacked two reasoning stages.' }
      if (scored.total >= 6) return { difficulty: 'Easy', band: 'easy', reason: 'Former Hard item scored in the Easy band.' }
      return { difficulty: 'Easy', band: 'foundation', reason: 'Former Hard item scored in the Foundation band.' }
    }
    if (scored.total >= 15) return { difficulty: 'Hard', band: 'elite-hard', reason: 'Rubric total stays in the Elite Hard band. The stored label remains Hard so existing filters keep working.' }
    return { difficulty: 'Hard', band: 'hard', reason: 'Rubric total stays in the Hard band.' }
  }
  if (scored.total <= 5) return { difficulty: 'Easy', band: 'foundation', reason: 'Existing Easy item scores as Foundation.' }
  return { difficulty: 'Easy', band: 'easy', reason: 'Existing Easy item stays Easy. The audit does not promote items.' }
}
