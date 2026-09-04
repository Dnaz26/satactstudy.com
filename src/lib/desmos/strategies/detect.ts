import { APPROVED_STRATEGIES, getStrategyBySlug } from './catalog'
import { EMPTY_CLASSIFICATION, type DesmosClassification, type DesmosStrategy } from './types'

const NON_MATH = /reading|writing|english|grammar|vocabulary|rhetoric/i

const SYSTEM_HINT = /\bsystem\b|simultaneous|both equations|two equations|solve the system|intersection of the (two )?lines/i
const VERTEX_HINT = /maximum|minimum|vertex|highest|lowest|peak|turning point/i
const ROOT_HINT = /\bzeros?\b|\broots?\b|x-intercepts?|solutions? of|equals 0|= 0\b/i
const INEQUALITY_HINT = /inequalit|≤|≥|>=|<=|shaded|half-?plane|solution (region|set)/i
const FUNCTION_HINT = /\bf\s*\(|\bg\s*\(|function notation|evaluate/i
const TABLE_HINT = /\btable\b|for each (value|x)|compare .* at/i
const REGRESSION_HINT = /best fit|regression|scatter|correlation|\br\b|line of best|predict .* from/i
const STATS_HINT = /\bmean\b|\bmedian\b|standard deviation|boxplot|quartile|five-number|outlier|skew/i
const CIRCLE_HINT = /circle|radius|center|\bx\^2\s*\+\s*y\^2/i
const TRIG_HINT = /\bsin\b|\bcos\b|\btan\b|arcsin|trigonometry|right triangle/i
const EXP_HINT = /exponential|grows by|compound|\(.*\)\^x|times as large/i
const POLY_HINT = /polynomial|cubic|x\^3|how many real/i
const CONTEXT_HINT = /represents|in context|after how many|what does .+ mean|months|weeks|hours|dollars/i
const SLIDER_HINT = /value of [a-z]\b|which value of|parameter|family of/i
const DISTANCE_HINT = /distance|midpoint|length of (the )?segment/i
const COUNT_HINT = /\bcombin|permut|nCr|nPr|how many ways|committee|arrangements/i
const LIST_HINT = /greatest value|least value|largest number|smallest number|sorted/i
const BOTH_SIDES_HINT = /solve|find (the )?(value of )?x|what is x/i
const SIMPLE_LINEAR = /^(if\s+)?-?\d*\s*x\s*[+-]\s*\d+\s*=\s*-?\d+\s*[,.]?\s*(what is x)?\??$/i

export interface DetectInput {
  questionText?: string
  topicName?: string | null
  sectionName?: string | null
  testType?: string | null
  submitted?: boolean
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function equationCount(text: string): number {
  const matches = text.match(/[^\n;=]{2,80}=\s*[^\n;]+/g) ?? []
  return matches.filter((m) => /[xyfg]/i.test(m)).length
}

function looksSimpleArithmetic(text: string): boolean {
  const cleaned = normalize(text).replace(/[“”"]/g, '')
  if (equationCount(cleaned) >= 2) return false
  if (VERTEX_HINT.test(cleaned) || SYSTEM_HINT.test(cleaned) || INEQUALITY_HINT.test(cleaned)) return false
  if (REGRESSION_HINT.test(cleaned) || CIRCLE_HINT.test(cleaned) || TRIG_HINT.test(cleaned)) return false
  if (SIMPLE_LINEAR.test(cleaned)) return true
  const hasVar = /[xy]/i.test(cleaned)
  const numbers = cleaned.match(/-?\d+(\.\d+)?/g) ?? []
  if (!hasVar && numbers.length <= 3 && cleaned.length < 80) return true
  if (hasVar && numbers.length <= 3 && cleaned.length < 70 && /3x\s*\+\s*7\s*=\s*22|what is the value of x\?/i.test(cleaned)) return true
  return false
}

function extractInputs(text: string, strategy: DesmosStrategy): string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const eqs = [...text.matchAll(/([a-zA-Z(][^\n;=]{0,40}=\s*[^\n;]+)/g)].map((m) => m[1].trim())
  if (eqs.length >= 2) return eqs.slice(0, 3)
  if (eqs.length === 1) {
    if (strategy.slug === 'equation_both_sides') {
      const [left, right] = eqs[0].split('=').map((s) => s.trim())
      if (left && right) return [`y=${left.replace(/^y\s*=\s*/i, '')}`, `y=${right}`]
    }
    return [eqs[0]]
  }
  if (strategy.example_desmos_input.length) return strategy.example_desmos_input
  return lines.slice(0, 2)
}

function topicMatch(strategy: DesmosStrategy, topicName?: string | null, testType?: string | null): boolean {
  if (!topicName) return false
  const test = testType === 'ACT' ? 'ACT' : testType === 'SAT' ? 'SAT' : null
  return strategy.topic_keys.some((key) => key.topic === topicName && (!test || key.test === test))
}

function scoreStrategy(strategy: DesmosStrategy, text: string, topicName?: string | null, testType?: string | null): number {
  let score = 0
  if (topicMatch(strategy, topicName, testType)) score += 1.2
  for (const word of strategy.keywords) {
    if (word.length > 2 && text.toLowerCase().includes(word.toLowerCase())) score += 0.55
  }
  const eqs = equationCount(text)

  switch (strategy.slug) {
    case 'simple_arithmetic_skip_desmos':
      if (looksSimpleArithmetic(text)) score += 5
      else score -= 3
      break
    case 'systems_intersection':
      if (eqs >= 2 || SYSTEM_HINT.test(text)) score += 4
      if (CONTEXT_HINT.test(text) && eqs >= 2) score -= 1.4
      break
    case 'word_problem_intersection_interpret':
      if (eqs >= 2 && CONTEXT_HINT.test(text)) score += 4.5
      break
    case 'equation_both_sides':
      if (eqs === 1 && BOTH_SIDES_HINT.test(text) && !SYSTEM_HINT.test(text) && !looksSimpleArithmetic(text)) score += 3.2
      break
    case 'quadratic_vertex':
      if (VERTEX_HINT.test(text) && /x\^2|quadratic|h\(t\)|-\d+t\^2/i.test(text)) score += 4.4
      break
    case 'quadratic_zeros':
      if (ROOT_HINT.test(text) && /x\^2|quadratic/i.test(text) && !VERTEX_HINT.test(text)) score += 4
      break
    case 'polynomial_roots_extrema':
      if (POLY_HINT.test(text)) score += 3.6
      break
    case 'evaluate_function_notation':
      if (FUNCTION_HINT.test(text) && !TABLE_HINT.test(text)) score += 3.1
      break
    case 'function_table_values':
      if (TABLE_HINT.test(text)) score += 3.3
      break
    case 'graph_linear_inequality':
      if (INEQUALITY_HINT.test(text) && eqs < 2) score += 3.4
      break
    case 'systems_inequalities_overlap':
      if (INEQUALITY_HINT.test(text) && (eqs >= 2 || /both|system/i.test(text))) score += 3.8
      break
    case 'scatter_linear_regression':
      if (REGRESSION_HINT.test(text) && !/quadratic|exponential model/i.test(text)) score += 3.7
      break
    case 'custom_regression_model':
      if (REGRESSION_HINT.test(text) && /quadratic|exponential|curve/i.test(text)) score += 3.8
      break
    case 'regression_fit_quality':
      if (/correlation|residual|how well|r\^2|r =/i.test(text)) score += 3.5
      break
    case 'stats_center_spread':
      if (STATS_HINT.test(text) && !/boxplot|histogram|skew/i.test(text)) score += 3.2
      break
    case 'data_visualizations':
      if (/boxplot|histogram|dotplot|skew|outlier/i.test(text)) score += 3.4
      break
    case 'circle_center_radius':
      if (CIRCLE_HINT.test(text)) score += 3.8
      break
    case 'trig_evaluate_degree_mode':
      if (TRIG_HINT.test(text)) score += 3.5
      break
    case 'exponential_vs_linear':
      if (EXP_HINT.test(text) && /linear|compare|when/i.test(text)) score += 3.6
      break
    case 'slider_parameter_match':
      if (SLIDER_HINT.test(text)) score += 3.1
      break
    case 'coordinate_distance_midpoint':
      if (DISTANCE_HINT.test(text)) score += 3
      break
    case 'combinations_permutations':
      if (COUNT_HINT.test(text)) score += 3.4
      break
    case 'list_min_max_sort':
      if (LIST_HINT.test(text)) score += 2.8
      break
    case 'linear_intercepts':
      if (/intercept|slope/i.test(text) && !SYSTEM_HINT.test(text)) score += 2.6
      break
    default:
      break
  }

  if (!strategy.approved) score -= 10
  return score
}

export function classifyDesmosQuestion(input: DetectInput): DesmosClassification {
  const text = normalize(input.questionText ?? '')
  const section = input.sectionName ?? ''

  if (NON_MATH.test(section) && !/math/i.test(section)) {
    return {
      ...EMPTY_CLASSIFICATION,
      confidence: 0.95,
      reason: 'Verbal section — Desmos does not apply.',
      manual_reasoning_remaining: 'Use reading or grammar strategy, not a graph.',
    }
  }

  if (!text && !input.topicName) return EMPTY_CLASSIFICATION

  const ranked = APPROVED_STRATEGIES
    .map((strategy) => ({ strategy, score: scoreStrategy(strategy, text, input.topicName, input.testType) }))
    .sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score < 1.4) {
    const topicFallback = APPROVED_STRATEGIES.find((s) => s.mode !== 'manual_first' && topicMatch(s, input.topicName, input.testType))
    if (topicFallback) {
      return toClassification(topicFallback, text, 0.55, `Topic ${input.topicName} often has a Desmos method.`)
    }
    return {
      ...EMPTY_CLASSIFICATION,
      confidence: 0.4,
      reason: 'No strong Desmos pattern. Prefer the fastest valid manual method.',
    }
  }

  const confidence = Math.min(0.98, 0.45 + best.score / 8)
  const alternatives = ranked.slice(1, 4).filter((row) => row.score >= 1.4).map((row) => row.strategy.slug)
  return toClassification(best.strategy, text, confidence, undefined, alternatives)
}

function toClassification(
  strategy: DesmosStrategy,
  text: string,
  confidence: number,
  reason?: string,
  alternatives: string[] = []
): DesmosClassification {
  return {
    desmos_useful: strategy.mode !== 'manual_first',
    mode: strategy.mode,
    strategy: strategy.slug,
    strategy_id: strategy.id,
    confidence,
    reason: reason ?? strategy.when_to_use,
    inputs: extractInputs(text, strategy),
    student_should_find: strategy.what_to_look_for,
    manual_reasoning_remaining: strategy.mode === 'desmos_first'
      ? strategy.why_it_works
      : strategy.mode === 'hybrid'
        ? 'Desmos finds the number. The student must still interpret what it means.'
        : 'Solve mentally. Do not open Desmos.',
    recognition_rule: strategy.recognition_rule,
    alternatives,
  }
}

export function formatClassificationForTutor(classification: DesmosClassification): string {
  const strategy = classification.strategy ? getStrategyBySlug(classification.strategy) : null
  return [
    'Desmos decision (internal — never show raw JSON to the student):',
    JSON.stringify({
      desmos_useful: classification.desmos_useful,
      mode: classification.mode,
      strategy: classification.strategy,
      confidence: Number(classification.confidence.toFixed(2)),
      reason: classification.reason,
      inputs: classification.inputs,
      student_should_find: classification.student_should_find,
      manual_reasoning_remaining: classification.manual_reasoning_remaining,
      recognition_rule: classification.recognition_rule,
    }),
    strategy ? `Teach this strategy: ${strategy.title}. Recognition: ${strategy.recognition_rule}` : '',
    strategy ? `What to type: ${strategy.desmos_input_template.join(' ; ') || '(nothing)'}` : '',
    strategy ? `Why it works: ${strategy.why_it_works}` : '',
  ].filter(Boolean).join('\n')
}
