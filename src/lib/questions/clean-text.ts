import { normalizeInequalitySymbols } from '@/lib/questions/render'

/** Strip generator prefixes and normalize inequality symbols for student UI. */
export function cleanQuestionText(text: string): string {
  return normalizeInequalitySymbols(text)
    .replace(/^Skill\s*sets?\s+\d+\.\s*/i, '')
    .replace(/^Skill\s*set\s+\d+\.\s*/i, '')
    .replace(/^Topic\s*fill\s+\d+\.\s*/i, '')
    .replace(/\${3,}/g, '$$')
    .trim()
}
