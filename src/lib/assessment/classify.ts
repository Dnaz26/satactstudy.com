/**
 * Disposition of an item already in the practice-exam bank.
 *
 * DUPLICATE wins over every other label: a number swap, a shuffled
 * choice order, or a "Skill set" stamp is the same item.
 */

export type BankDisposition = 'KEEP' | 'REVISE' | 'REPLACE' | 'DUPLICATE'

export interface BankItemView {
  testType: 'SAT' | 'ACT'
  section: string
  prompt: string
  choices: Array<string | null | undefined>
  passageSharedCount: number
  /** Other bank items with the same number-stripped stem, including this one. */
  templateSiblingCount: number
}

export interface BankClassification {
  disposition: BankDisposition
  reasons: string[]
}

const SKILL_SET = /skill\s*sets?\s+\d+/i
const BARE_LCM = /least common multiple of\s+\d+\s+and\s+\d+/i
const BARE_EVAL = /if\s+\$?g\(x\)\s*=\s*x\s*(\^|²)\s*2?\s*\+\s*\d+\s*x\$?,\s*what is\s+\$?g\(\d+\)/i
const LATEX = /\\frac|\\text|\\le|\\ge|\\sqrt|\$[^$\n]+\$/
const JUNK_CHOICE = /\(\d+\)\s*$|\*$/

export function templateSignature(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/\\[a-z]+/g, '')
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[^a-z#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function filledChoices(choices: Array<string | null | undefined>): string[] {
  return choices.map((c) => (c ?? '').trim()).filter(Boolean)
}

export function classifyBankItem(item: BankItemView): BankClassification {
  const reasons: string[] = []
  const prompt = item.prompt ?? ''
  const choices = filledChoices(item.choices)

  if (SKILL_SET.test(prompt)) {
    reasons.push('Stem is stamped "Skill set" plus a number. That is a generated worksheet label, not an exam item.')
  }
  if (item.templateSiblingCount > 1) {
    reasons.push(`Stem matches ${item.templateSiblingCount} bank items after numbers are removed. Changing numbers is not a new question.`)
  }
  if (reasons.length) return { disposition: 'DUPLICATE', reasons }

  if (item.testType === 'ACT' && item.section === 'Math' && choices.length >= 5) {
    reasons.push('Enhanced ACT Math uses four answer choices. This item still uses the legacy five-choice layout.')
  }
  if (BARE_LCM.test(prompt)) {
    reasons.push('The item asks for a least common multiple in isolation. On a full exam that skill has to sit inside a larger situation.')
  }
  if (BARE_EVAL.test(prompt)) {
    reasons.push('The item only asks for g(a number). A full-exam function item has to interpret, compose, or reverse a relationship.')
  }
  if (item.testType === 'SAT' && item.passageSharedCount > 1) {
    reasons.push(`This stimulus is shared by ${item.passageSharedCount} exam questions. Digital SAT Reading and Writing gives each question its own text.`)
  }
  if (reasons.length) return { disposition: 'REPLACE', reasons }

  if (LATEX.test(prompt) || choices.some((c) => LATEX.test(c))) {
    reasons.push('The item is written in LaTeX. Exam wording is plain text a student can read without a renderer.')
  }
  if (choices.some((c) => JUNK_CHOICE.test(c))) {
    reasons.push('A choice carries a generator mark such as "(1)" or a trailing asterisk.')
  }
  if (reasons.length) return { disposition: 'REVISE', reasons }

  return {
    disposition: 'KEEP',
    reasons: ['Stem, choice count, and stimulus use match the current exam closely enough to remain in the bank.'],
  }
}
