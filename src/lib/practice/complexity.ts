export type ComplexityInput = {
  question_text?: string | null
  choice_a?: string | null
  choice_b?: string | null
  choice_c?: string | null
  choice_d?: string | null
  choice_e?: string | null
  difficulty_score?: number | null
  passage_content?: string | null
  lessonTitleWords?: string[]
  exam_name?: string | null
}

const WORDING_STOP = new Set(['and', 'the', 'for', 'with', 'from', 'that', 'this', 'are', 'you', 'your', 'what', 'which', 'how'])

export function lessonTitleWords(title: string): string[] {
  return (title.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => w.length > 2 && !WORDING_STOP.has(w))
}

/**
 * Real complexity rank for "hardest-first" selection. Bank difficulty labels
 * top out on repetitive templates, so this scores the bank score plus
 * reasoning density (operations + multi-step keywords), stem length, and
 * passage load. A small lesson-wording bonus keeps stray misclassified
 * items sunk.
 */
export function questionComplexity(q: ComplexityInput): number {
  const text = `${q.question_text ?? ''} ${q.choice_a ?? ''} ${q.choice_b ?? ''} ${q.choice_c ?? ''} ${q.choice_d ?? ''} ${q.choice_e ?? ''} ${q.passage_content ?? ''}`
  const ops = (text.match(/[=<>+−*/^×÷]|\\frac/g) ?? []).length
    + (text.match(/\b(if|given|except|not|which|compare|because|however|therefore|system|function|claim|evidence|infer|when|expression|equivalent|neither|both|all|none)\b/gi) ?? []).length
  const base = Number(q.difficulty_score ?? 0) * 0.55
  const lengthScore = Math.min(0.25, text.length / 1200)
  const reasoningScore = Math.min(0.2, ops * 0.025)
  const passageBonus = (q.passage_content ?? '').length > 80 ? 0.05 : 0
  const eliteBonus = /elite hard/i.test(q.exam_name ?? '') ? 0.28 : 0
  const lower = (q.question_text ?? '').toLowerCase()
  let wording = 0
  for (const w of q.lessonTitleWords ?? []) if (lower.includes(w)) wording += 1
  return base + lengthScore + reasoningScore + passageBonus + eliteBonus + Math.min(0.15, wording * 0.05)
}

/** Template signature: same drills with different numbers collapse together. */
export function templateSignature(text: string): string {
  return text
    .toLowerCase()
    .replace(/\\[a-z]+/g, '')
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[^a-z#+=\-*/^<>%()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * One-step plugs are below the product floor. The floor is a two-constraint
 * setup, such as two tangent readings used to find a height. These frames are
 * the old one-step bank and must not be served as challenge items.
 */
export function belowProductFloor(text: string): boolean {
  const stem = text.replace(/^the [a-z]+ [^.]{8,180}? using the [^.]{3,80}?\.\s*/i, '')
  return [
    /right triangle has legs \d+ and \d+/i,
    /what is the median/i,
    /cut in half at the end of each interval/i,
    /miles per hour\. how many miles/i,
    /model predicts y\s*=/i,
    /planner sets /i,
    /circle has center/i,
    /quadratic has roots/i,
    /two counts satisfy/i,
    /rule sends t to/i,
    /similar floors/i,
    /line graph records \d+ units/i,
    /review table lists group/i,
    /unordered list is/i,
    /ladder leans against a wall/i,
    /kite string is \d+ meters long and makes a 30/i,
    /wheelchair ramp rises/i,
    /cable runs in a straight line from/i,
    /what value of .?x.? satisfies \d/i,
    /opposite\s*=\s*\d+ and hypotenuse\s*=\s*\d+/i,
    /planner at the /i,
    /^setting \d/i,
    /practice \d+\. a planner/i,
    /together with the field sketch/i,
    /another patch would buy only a short delay/i,
    /same-side interior pair measures/i,
    /stack of river maps ____ moved/i,
    /what is the value of f\(f\(0\)\)/i,
    /what is the value of g\(g\(1\)\)/i,
    /each acute angle/i,
    /neither plot has a count/i,
    /after a warm week/i,
  ].some((pattern) => pattern.test(stem) || pattern.test(text))
}

/** A conservative gate for challenge modes; labels alone are not evidence. */
export function isChallengeQuestion(q: ComplexityInput & {
  difficulty?: string | null
  section_name?: string | null
  test_type?: string | null
  correct_answer?: string | null
  official_explanation?: string | null
  ai_explanation?: string | null
  question_type?: string | null
  exam_name?: string | null
}): boolean {
  const stem = (q.question_text ?? '').trim()
  if (q.difficulty?.toLowerCase() !== 'hard' || Number(q.difficulty_score ?? 0) < 0.72) return false
  if (belowProductFloor(stem)) return false
  if (stem.length < 42 || !q.correct_answer || !(q.official_explanation || q.ai_explanation)) return false
  if (/^skill set\s+\d+\.|^topic fill\s+\d+\.|^what is \d+% of |^what value of .?x.? satisfies|^if .?g\(x\).?=.{0,30}what is .?g\(/i.test(stem)) return false
  if (/^StudentQuest (PDF-skill|May-2023-skill-map|expanded|original)(?: original)? bank$/i.test(q.exam_name ?? '')) return false
  if (q.exam_name === 'ACT Flagship v1' && q.section_name === 'Math') return false

  const choices = [q.choice_a, q.choice_b, q.choice_c, q.choice_d].filter((c): c is string => Boolean(c?.trim()))
  const produced = q.question_type === 'spr' || q.question_type === 'student_produced_response'
  if (!produced && (choices.length !== 4 || new Set(choices.map((c) => c.trim().toLowerCase())).size !== 4)) return false
  if (choices.length === 4 && !['A', 'B', 'C', 'D'].includes(q.correct_answer.toUpperCase())) return false

  if (q.section_name === 'Reading' && q.test_type === 'ACT' && (q.passage_content ?? '').split(/\s+/).length < 180) return false
  if (q.section_name === 'English' && q.test_type === 'ACT' && (q.passage_content ?? '').split(/\s+/).length < 120) return false
  if (q.section_name === 'Reading and Writing' && !q.passage_content && stem.length < 100) return false
  if (q.section_name === 'Math') {
    const mathSignals = (stem.match(/[=<>+−*/^×÷]|\\frac|\b(if|given|model|parameter|function|equivalent|ratio|rate|change|intersection)\b/gi) ?? []).length
    if (stem.length < 95 && mathSignals < 4) return false
  }
  return true
}

/** Hardest-first pick with template duplicates capped for variety. */
export function pickHardest<T extends ComplexityInput>(items: T[], count: number, maxPerTemplate = 3): T[] {
  const ranked = [...items].sort((a, b) => questionComplexity(b) - questionComplexity(a))
  const seen = new Map<string, number>()
  const out: T[] = []
  for (const item of ranked) {
    const sig = templateSignature(item.question_text ?? '')
    const used = seen.get(sig) ?? 0
    if (used >= maxPerTemplate) continue
    seen.set(sig, used + 1)
    out.push(item)
    if (out.length >= count) break
  }
  return out
}
