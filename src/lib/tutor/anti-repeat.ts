/** Shared anti-repeat helpers for tutoring speech and chat. */

export function normalizeTutorText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`#>\-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(text: string): Set<string> {
  return new Set(
    normalizeTutorText(text)
      .split(' ')
      .filter((word) => word.length > 2),
  )
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let overlap = 0
  for (const word of a) {
    if (b.has(word)) overlap += 1
  }
  return overlap / (a.size + b.size - overlap)
}

/** True when two tutor lines are the same idea (exact, containment, or high overlap). */
export function isNearDuplicate(a: string, b: string): boolean {
  const na = normalizeTutorText(a)
  const nb = normalizeTutorText(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 18 && nb.length >= 18 && (na.includes(nb) || nb.includes(na))) return true
  const score = jaccard(tokens(a), tokens(b))
  if (score >= 0.72) return true
  if (Math.min(na.length, nb.length) < 48 && score >= 0.55) return true
  return false
}

export function dedupeAgainstHistory(text: string, history: string[]): string {
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (!sentences.length) return text.trim()

  const kept: string[] = []
  const local: string[] = []
  for (const sentence of sentences) {
    const against = [...history, ...local]
    if (against.some((prev) => isNearDuplicate(prev, sentence))) continue
    kept.push(sentence)
    local.push(sentence)
  }
  return kept.join(' ').trim() || text.trim()
}

/**
 * Internal agent checklist (never rendered as student UI).
 * Matches the 9-step tutoring framework.
 */
export const CHAT_CHECKLIST = [
  { id: 'definition', label: 'Definition (super simple)' },
  { id: 'irlExample', label: 'Real-world example' },
  { id: 'breakdown', label: 'Breakdown of every part' },
  { id: 'build', label: 'Build example for student to translate' },
  { id: 'yesExamples', label: 'Correct examples' },
  { id: 'noExamples', label: 'Incorrect examples' },
  { id: 'explainBack', label: 'Student explains in own words' },
  { id: 'practice', label: 'Five multiple-choice questions' },
  { id: 'create', label: 'Student creates a question + analysis' },
] as const

export type ChatChecklistId = (typeof CHAT_CHECKLIST)[number]['id']

export function inferChecklistProgress(
  assistantText: string,
  prior: Partial<Record<ChatChecklistId, boolean>> = {},
): Record<ChatChecklistId, boolean> {
  const t = normalizeTutorText(assistantText)
  const next: Record<ChatChecklistId, boolean> = {
    definition: Boolean(prior.definition),
    irlExample: Boolean(prior.irlExample),
    breakdown: Boolean(prior.breakdown),
    build: Boolean(prior.build),
    yesExamples: Boolean(prior.yesExamples),
    noExamples: Boolean(prior.noExamples),
    explainBack: Boolean(prior.explainBack),
    practice: Boolean(prior.practice),
    create: Boolean(prior.create),
  }

  if (/\b(is|means|definition|in short|simply)\b/.test(t) && t.length < 220) next.definition = true
  if (/\b(for example|real life|say i|let s say|imagine|suppose|sold|everyday)\b/.test(t)) next.irlExample = true
  if (/\b(part|breakdown|slope|each piece|analyze|look for|controls)\b/.test(t)) next.breakdown = true
  if (/\b(translate|built this|your turn to analyze|what does each)\b/.test(t)) next.build = true
  if (/\b(correct|good example|this works|follows the rule)\b/.test(t)) next.yesExamples = true
  if (/\b(incorrect|trap|not |fails|wrong because)\b/.test(t)) next.noExamples = true
  if (/\b(own words|explain back|tell me what|in your words)\b/.test(t)) next.explainBack = true
  if (/\b(practice|multiple choice|question 1|try this item)\b/.test(t)) next.practice = true
  if (/\b(create|write your own|build a question|your analysis)\b/.test(t)) next.create = true

  return next
}
