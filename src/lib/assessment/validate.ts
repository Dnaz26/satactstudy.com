/**
 * Deterministic item validators for the ACT flagship program.
 *
 * These checks are structural and exact: choice integrity, key validity,
 * equivalence, banned generator labels, LaTeX hygiene, English span
 * integrity, evidence coverage, and duplicate/sibling detection.
 *
 * What they do NOT do (documented limits):
 * - Solve novel math (exact solving happens in the authoring pipeline with
 *   Python Fractions/sympy-style checks; results are recorded as review
 *   evidence and re-checked here against the provided expected answer).
 * - Judge pedagogy, difficulty calibration, or distractor psychology beyond
 *   structural parallelism heuristics.
 */

export type AssessmentSection = 'English' | 'Math' | 'Reading' | 'Science'

export interface AssessmentItem {
  section: AssessmentSection
  prompt: string
  choices: string[]
  answer: string
  passage?: string | null
  /** English marked span: must occur exactly once in the passage. */
  span?: string | null
  /** Reading/Science evidence refs: must be non-empty. */
  evidence?: string[]
  /**
   * Independently established correct choice text (from deterministic
   * solving at authoring time). When provided, the key must point at the
   * unique choice matching it; otherwise the item fails invalid_key.
   */
  expected?: string | null
}

export type FailureCode =
  | 'choice_count'
  | 'blank_choice'
  | 'duplicate_choices'
  | 'equivalent_choices'
  | 'suspicious_marks'
  | 'invalid_key'
  | 'banned_label'
  | 'latex_forbidden'
  | 'span_missing'
  | 'span_multiple'
  | 'choices_not_parallel'
  | 'answer_signaled_by_length'
  | 'evidence_missing'
  | 'prompt_too_short'

export interface ValidationResult {
  pass: boolean
  failures: FailureCode[]
}

const BANNED_PREFIX = /^\s*(skill\s*sets?\s+\d+|study\s*note\b|topic\s*fill\s+\d+)/i

function normEq(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '')
}

function normValue(s: string): string {
  // Sign- and value-aware: keeps digits, letters, decimal points,
  // slashes, carets, minus/plus, parentheses content markers.
  return s.toLowerCase().replace(/[\s$*{}\\_]/g, '')
}

function stripParens(s: string): string {
  return s.replace(/\([^()]*\)/g, '').trim()
}

function stripTrailingMarks(s: string): string {
  return stripParens(s).trim().replace(/[\s*†‡§¶#]*$/g, '').trim()
}

export function validateItem(item: AssessmentItem): ValidationResult {
  const failures: FailureCode[] = []
  const fail = (code: FailureCode) => {
    if (!failures.includes(code)) failures.push(code)
  }

  if (!item.prompt || item.prompt.trim().length < 15) fail('prompt_too_short')

  const choices = (item.choices ?? []).map((c) => (c ?? '').trim())
  if (choices.length !== 4) fail('choice_count')
  if (choices.some((c) => !c)) fail('blank_choice')

  const lowered = choices.map((c) => c.toLowerCase())
  if (new Set(lowered).size !== lowered.length) fail('duplicate_choices')

  const values = choices.map(normValue)
  const numerics = choices.map((c) => {
    const n = Number(c)
    return c.trim() !== '' && Number.isFinite(n) ? n : null
  })
  const noParens = choices.map((c) => normValue(stripParens(c)))
  const stripped = choices.map((c) => normValue(stripTrailingMarks(c)))
  const seen = new Map<string, number>()
  const seenParen = new Map<string, number>()
  const seenStripped = new Map<string, number>()
  values.forEach((v, i) => {
    if (seen.has(v) && seen.get(v) !== i) fail('equivalent_choices')
    seen.set(v, i)
    if (numerics[i] != null) {
      for (let j = 0; j < i; j++) {
        if (numerics[j] != null && numerics[j] === numerics[i]) fail('equivalent_choices')
      }
    }
    if (noParens[i] && seenParen.has(noParens[i]!) && seenParen.get(noParens[i]!) !== i) {
      fail('equivalent_choices')
    }
    seenParen.set(noParens[i]!, i)
    if (stripped[i] && seenStripped.has(stripped[i]!) && seenStripped.get(stripped[i]!) !== i) {
      fail('equivalent_choices')
      fail('suspicious_marks')
    }
    seenStripped.set(stripped[i]!, i)
  })

  const key = (item.answer ?? '').trim().toUpperCase()
  const keyIndex = 'ABCD'.indexOf(key)
  if (keyIndex < 0 || keyIndex >= choices.length || !choices[keyIndex]) {
    fail('invalid_key')
  } else if (item.expected != null) {
    const want = normEq(item.expected)
    const got = normEq(choices[keyIndex] ?? '')
    if (want !== got) fail('invalid_key')
    const matches = choices.filter((c) => normEq(c) === want).length
    if (matches !== 1) fail('invalid_key')
  }

  const stem = item.prompt ?? ''
  if (BANNED_PREFIX.test(stem)) fail('banned_label')
  // Math-mode LaTeX ($...$, backslash commands). Currency like $45 is fine.
  const hasLatex = (t: string) => t.includes('\\') || t.replace(/\$\d/g, '').includes('$')
  if (hasLatex(stem) || choices.some(hasLatex)) fail('latex_forbidden')

  if (item.section === 'English' && item.span) {
    const passage = item.passage ?? ''
    if (!item.span.trim() || !passage.includes(item.span)) {
      fail('span_missing')
    } else {
      const occurrences = passage.split(item.span).length - 1
      if (occurrences !== 1) fail('span_multiple')
    }
  }

  if ((item.section === 'Reading' || item.section === 'Science')
    && (!item.evidence || !item.evidence.some((e) => e && e.trim()))) {
    fail('evidence_missing')
  }

  if (item.section !== 'Math') {
    const lens = choices.map((c) => c.length || 1)
    const longest = Math.max(...lens)
    const shortest = Math.min(...lens)
    if (longest > shortest * 3) fail('choices_not_parallel')
    if (keyIndex >= 0 && choices[keyIndex]
      && choices[keyIndex]!.length === longest && longest >= shortest * 2.5) {
      fail('answer_signaled_by_length')
    }
  }

  return { pass: failures.length === 0, failures }
}

function contentTokens(text: string): Set<string> {
  const stop = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were',
    'what', 'which', 'does', 'following', 'best', 'each', 'into', 'when', 'then', 'than', 'such',
    'only', 'just', 'over', 'more', 'most', 'passage', 'sentence', 'word', 'phrase', 'underlined',
    'according', 'based', 'author', 'claim', 'percent', 'study', 'figure', 'table', 'above', 'below'])
  // Words count at length 3+; multi-digit numbers count too (they often
  // carry the only distinction between short math stems). Single letters
  // and single digits are noise.
  const toks = (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => !stop.has(w) && (w.length > 2 || (/^\d+$/.test(w) && w.length > 1)))
  return new Set(toks)
}

/** Jaccard similarity over content tokens (0..1). */
export function semanticSimilarity(a: string, b: string): number {
  const sa = contentTokens(a)
  const sb = contentTokens(b)
  if (!sa.size || !sb.size) return 0
  let inter = 0
  for (const t of sa) if (sb.has(t)) inter += 1
  return inter / (sa.size + sb.size - inter)
}

export interface SiblingGroup {
  signature: string
  indexes: number[]
  maxSimilarity: number
}

/**
 * Find template siblings: items sharing a normalized signature or with
 * pairwise token similarity at/above threshold (default 0.8).
 */
export function findTemplateSiblings(
  texts: string[],
  threshold = 0.8,
): SiblingGroup[] {
  const sigOf = (t: string) => t.toLowerCase()
    .replace(/[0-9]+(\.[0-9]+)?/g, '#')
    .replace(/[^a-z#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const bySig = new Map<string, number[]>()
  texts.forEach((t, i) => {
    const sig = sigOf(t)
    bySig.set(sig, [...(bySig.get(sig) ?? []), i])
  })
  const groups: SiblingGroup[] = []
  for (const [sig, indexes] of bySig) {
    if (indexes.length > 1) {
      let maxSim = 0
      for (let a = 0; a < indexes.length; a++) {
        for (let b = a + 1; b < indexes.length; b++) {
          maxSim = Math.max(maxSim, semanticSimilarity(texts[indexes[a]] ?? '', texts[indexes[b]] ?? ''))
        }
      }
      groups.push({ signature: sig, indexes, maxSimilarity: maxSim })
    }
  }
  // Near-duplicate pairs with distinct signatures.
  const paired = new Set<number>()
  groups.forEach((g) => g.indexes.forEach((i) => paired.add(i)))
  for (let a = 0; a < texts.length; a++) {
    for (let b = a + 1; b < texts.length; b++) {
      if (paired.has(a) && paired.has(b)) continue
      const sim = semanticSimilarity(texts[a] ?? '', texts[b] ?? '')
      if (sim >= threshold) {
        groups.push({ signature: `sim:${sim.toFixed(2)}`, indexes: [a, b], maxSimilarity: sim })
        paired.add(a)
        paired.add(b)
      }
    }
  }
  return groups
}
