export function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$/g, '')
    .replace(/[^a-z0-9\s=+\-*/^().,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function questionFingerprint(input: {
  question_text: string
  choice_a?: string | null
  choice_b?: string | null
  choice_c?: string | null
  choice_d?: string | null
  choice_e?: string | null
  correct_answer?: string | null
}): string {
  const parts = [
    normalizeQuestionText(input.question_text),
    normalizeQuestionText(input.choice_a ?? ''),
    normalizeQuestionText(input.choice_b ?? ''),
    normalizeQuestionText(input.choice_c ?? ''),
    normalizeQuestionText(input.choice_d ?? ''),
    normalizeQuestionText(input.choice_e ?? ''),
    (input.correct_answer ?? '').trim().toUpperCase(),
  ]
  return parts.join('|')
}

export const RIGHTS_STATUS = ['owned', 'licensed', 'public_domain', 'authorized', 'reference_only', 'unknown'] as const
export type SourceRightsStatus = (typeof RIGHTS_STATUS)[number]

export function mayPublishExactContent(status: SourceRightsStatus): boolean {
  return status === 'owned' || status === 'licensed' || status === 'public_domain' || status === 'authorized'
}
