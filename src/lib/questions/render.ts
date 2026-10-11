import type { Choice } from '@/lib/schema'

export type MathPart =
  | { kind: 'text'; value: string }
  | { kind: 'frac'; num: MathPart[]; den: MathPart[] }
  | { kind: 'sup'; value: MathPart[] }

export type PromptSegment =
  | { math: false; value: string }
  | { math: true; parts: MathPart[] }

const SYMBOLS: Array<[RegExp, string]> = [
  [/\\times/g, '×'],
  [/\\div/g, '÷'],
  [/\\cdot/g, '·'],
  [/\\leqslant/g, '≤'],
  [/\\leqq/g, '≤'],
  [/\\geqslant/g, '≥'],
  [/\\geqq/g, '≥'],
  [/\\leq/g, '≤'],
  [/\\geq/g, '≥'],
  // Word-boundary style: \le must not eat \left / \leq; \ge must not eat \geq
  [/\\le(?![a-zA-Z])/g, '≤'],
  [/\\ge(?![a-zA-Z])/g, '≥'],
  [/\\lt(?![a-zA-Z])/g, '<'],
  [/\\gt(?![a-zA-Z])/g, '>'],
  [/\\neq/g, '≠'],
  [/\\ne(?![a-zA-Z])/g, '≠'],
  [/\\pm/g, '±'],
  [/\\infty/g, '∞'],
  [/\\pi(?![a-zA-Z])/g, 'π'],
  [/\\sqrt/g, '√'],
  [/\\circ/g, '°'],
  [/\\degree/g, '°'],
  [/\\%/g, '%'],
]

/** Decode HTML / numeric entities that often appear in imported inequality text. */
function decodeInequalityEntities(value: string): string {
  return value
    .replace(/&le(?:q)?;/gi, '≤')
    .replace(/&ge(?:q)?;/gi, '≥')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0*8804;/g, '≤')
    .replace(/&#0*8805;/g, '≥')
    .replace(/&#x0*2264;/gi, '≤')
    .replace(/&#x0*2265;/gi, '≥')
    .replace(/&#0*60;/g, '<')
    .replace(/&#0*62;/g, '>')
    .replace(/&#x0*3c;/gi, '<')
    .replace(/&#x0*3e;/gi, '>')
}

/**
 * Collapse accidental double-escaping (\\le → \le) before latex symbol swaps.
 * Only touches known inequality / comparison command names.
 */
function normalizeLatexBackslashes(value: string): string {
  return value.replace(
    /\\{2,}(?=(?:leqslant|geqslant|leqq|geqq|leq|geq|le|ge|lt|gt|neq|ne)(?![a-zA-Z]))/g,
    '\\',
  )
}

const INEQUALITY_COMMANDS: Array<[RegExp, string]> = [
  [/\\leqslant/g, '≤'],
  [/\\leqq/g, '≤'],
  [/\\geqslant/g, '≥'],
  [/\\geqq/g, '≥'],
  [/\\leq/g, '≤'],
  [/\\geq/g, '≥'],
  [/\\le(?![a-zA-Z])/g, '≤'],
  [/\\ge(?![a-zA-Z])/g, '≥'],
  [/\\lt(?![a-zA-Z])/g, '<'],
  [/\\gt(?![a-zA-Z])/g, '>'],
]

/**
 * Normalize inequality / comparison symbols to clear Unicode glyphs.
 * Does not strip braces — safe for question cleanup outside math rendering.
 */
export function normalizeInequalitySymbols(value: string): string {
  const prepared = normalizeLatexBackslashes(decodeInequalityEntities(value))
  return INEQUALITY_COMMANDS.reduce((text, [pattern, next]) => text.replace(pattern, next), prepared)
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/≦/g, '≤')
    .replace(/≧/g, '≥')
}

export function applyLatexSymbols(value: string): string {
  const withInequalities = normalizeInequalitySymbols(value)
  return SYMBOLS.reduce((text, [pattern, next]) => text.replace(pattern, next), withInequalities)
    .replace(/\^\s*°/g, '°')
    .replace(/\s+°/g, '°')
    .replace(/[{}]/g, '')
}

function replaceSymbols(value: string): string {
  return applyLatexSymbols(value)
}

function readBrace(input: string, start: number): { inner: string; next: number } {
  if (input[start] !== '{') return { inner: '', next: start }
  let depth = 0
  for (let i = start; i < input.length; i++) {
    if (input[i] === '{') depth++
    if (input[i] === '}') {
      depth--
      if (depth === 0) return { inner: input.slice(start + 1, i), next: i + 1 }
    }
  }
  return { inner: input.slice(start + 1), next: input.length }
}

export function splitNumericFractions(value: string): MathPart[] {
  const parts: MathPart[] = []
  const re = /(?<![A-Za-z])(-?\d+)\s*\/\s*(-?\d+)(?![A-Za-z])/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(value))) {
    if (match.index > last) parts.push({ kind: 'text', value: value.slice(last, match.index) })
    parts.push({
      kind: 'frac',
      num: [{ kind: 'text', value: match[1] }],
      den: [{ kind: 'text', value: match[2] }],
    })
    last = match.index + match[0].length
  }
  if (last < value.length) parts.push({ kind: 'text', value: value.slice(last) })
  return parts.length ? parts : [{ kind: 'text', value }]
}

function matchingOpen(value: string, closeAt: number): number {
  let depth = 0
  for (let i = closeAt; i >= 0; i--) {
    if (value[i] === ')') depth++
    else if (value[i] === '(') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function matchingClose(value: string, openAt: number): number {
  let depth = 0
  for (let i = openAt; i < value.length; i++) {
    if (value[i] === '(') depth++
    else if (value[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

/** A slash with a parenthesized side is one stacked fraction, not a diagonal slash. */
function findGroupedDivision(value: string): { start: number; end: number; num: string; den: string } | null {
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '/') continue
    let leftEnd = i - 1
    while (leftEnd >= 0 && value[leftEnd] === ' ') leftEnd--
    let rightStart = i + 1
    while (rightStart < value.length && value[rightStart] === ' ') rightStart++
    if (leftEnd < 0 || rightStart >= value.length) continue

    let start = -1
    let num = ''
    let leftGrouped = false
    if (value[leftEnd] === ')') {
      const open = matchingOpen(value, leftEnd)
      if (open < 0) continue
      start = open
      num = value.slice(open + 1, leftEnd)
      leftGrouped = true
    } else if (/\d/.test(value[leftEnd])) {
      let j = leftEnd
      while (j >= 0 && /\d/.test(value[j])) j--
      start = j + 1
      num = value.slice(start, leftEnd + 1)
    } else {
      continue
    }

    let end = -1
    let den = ''
    let rightGrouped = false
    if (value[rightStart] === '(') {
      const close = matchingClose(value, rightStart)
      if (close < 0) continue
      end = close + 1
      den = value.slice(rightStart + 1, close)
      rightGrouped = true
    } else if (/\d/.test(value[rightStart]) || (value[rightStart] === '-' && /\d/.test(value[rightStart + 1] ?? ''))) {
      let j = rightStart
      if (value[j] === '-') j++
      while (j < value.length && /\d/.test(value[j])) j++
      end = j
      den = value.slice(rightStart, end)
    } else {
      continue
    }

    if (!leftGrouped && !rightGrouped) continue
    return { start, end, num, den }
  }
  return null
}

function withoutEmptyText(parts: MathPart[]): MathPart[] {
  return parts.filter((part) => part.kind !== 'text' || part.value.length > 0)
}

/** Stacks numeric slashes and parenthesized divisions such as (3/4−2/5)/(7/10+1/6). */
export function splitDisplayFractions(value: string): MathPart[] {
  const found = findGroupedDivision(value)
  if (!found) return splitNumericFractions(value)
  let before = value.slice(0, found.start)
  let after = value.slice(found.end)
  if (before.endsWith('(') && after.startsWith(')')) {
    before = before.slice(0, -1)
    after = after.slice(1)
  }
  return withoutEmptyText([
    ...splitDisplayFractions(before),
    { kind: 'frac', num: splitDisplayFractions(found.num), den: splitDisplayFractions(found.den) },
    ...splitDisplayFractions(after),
  ])
}

export function parseMath(input: string): MathPart[] {
  const parts: MathPart[] = []
  let i = 0
  let buf = ''
  const flush = () => {
    if (!buf) return
    parts.push(...splitDisplayFractions(replaceSymbols(buf)))
    buf = ''
  }

  while (i < input.length) {
    if (input.startsWith('\\frac', i)) {
      flush()
      i += 5
      while (input[i] === ' ') i++
      const num = readBrace(input, i)
      i = num.next
      while (input[i] === ' ') i++
      const den = readBrace(input, i)
      i = den.next
      parts.push({ kind: 'frac', num: parseMath(num.inner), den: parseMath(den.inner) })
      continue
    }
    if (input[i] === '^') {
      flush()
      i++
      if (input[i] === '{') {
        const exp = readBrace(input, i)
        i = exp.next
        parts.push({ kind: 'sup', value: parseMath(exp.inner) })
      } else if (input[i]) {
        parts.push({ kind: 'sup', value: parseMath(input[i]) })
        i++
      }
      continue
    }
    buf += input[i]
    i++
  }
  flush()
  return parts
}

export function renderPromptSegments(text: string): PromptSegment[] {
  const parts = text.split('$')
  return parts.map((value, index) => (
    index % 2 === 1
      ? { math: true, parts: parseMath(value) }
      : { math: false, value }
  ))
}

export function isStudentProduced(questionType?: string | null, choices?: Choice[]): boolean {
  if (questionType === 'spr') return true
  return !choices?.length
}
