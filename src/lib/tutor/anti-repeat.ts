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
  { id: 'checkDefinition', label: 'Multiple-choice check of the definition' },
  { id: 'breakdown', label: 'Worked example with each part highlighted + defined' },
  { id: 'checkMeaning', label: 'Multiple-choice check of what each part means' },
  { id: 'yesExamples', label: 'Correct examples + why they work' },
  { id: 'noExamples', label: 'Incorrect examples / traps + why they fail' },
  { id: 'identifyCorrect', label: '3 fresh correct-or-incorrect multiple-choice checks' },
  { id: 'miniExam', label: '3-question mini exam, easy to medium to hard, multi-step' },
  { id: 'create', label: 'Student creates an SAT/ACT question + analysis' },
] as const

export type ChatChecklistId = (typeof CHAT_CHECKLIST)[number]['id']

export function emptyChecklistProgress(): Record<ChatChecklistId, boolean> {
  return Object.fromEntries(CHAT_CHECKLIST.map((item) => [item.id, false])) as Record<ChatChecklistId, boolean>
}

export function inferChecklistProgress(
  assistantText: string,
  prior: Partial<Record<ChatChecklistId, boolean>> = {},
): Record<ChatChecklistId, boolean> {
  const t = normalizeTutorText(assistantText)
  const next: Record<ChatChecklistId, boolean> = {
    ...emptyChecklistProgress(),
    ...prior,
  }

  if (/\b(is|means|definition|in short|simply)\b/.test(t) && t.length < 320) next.definition = true
  if (/\b(multiple choice|which of the following|choose|option [a-d]|a\)|b\)|c\)|d\))\b/.test(t)) {
    // Generic MCQ signal — attribute to the earliest unchecked MCQ step.
    if (!next.checkDefinition) next.checkDefinition = true
    else if (next.checkMeaning && !next.identifyCorrect) next.identifyCorrect = true
  }
  if (/\b(what does|what do you think|which answer|test your understanding|quick check)\b/.test(t)) {
    if (!next.checkDefinition) next.checkDefinition = true
    else if (!next.checkMeaning) next.checkMeaning = true
  }
  if (/\b(part|breakdown|each part|highlight|notice|equation|problem|relates to|this means|because)\b/.test(t)) next.breakdown = true
  if (/\b(what does each|what does it mean|which part|everything involved)\b/.test(t)) next.checkMeaning = true
  if (/\b(correct|good example|this works|follows the rule|works because)\b/.test(t)) next.yesExamples = true
  if (/\b(incorrect|trap|not |fails|wrong because|common mistake)\b/.test(t)) next.noExamples = true
  if (/\b(correct or incorrect|is this correct|is this right|true or false|identify)\b/.test(t)) next.identifyCorrect = true
  if (/\b(mini exam|easy medium hard|easy .* medium .* hard|multi step|step 1 .* step 2|advanced)\b/.test(t)) next.miniExam = true
  if (/\b(create|write your own|build a question|your analysis|your own sat|your own act)\b/.test(t)) next.create = true

  return next
}
