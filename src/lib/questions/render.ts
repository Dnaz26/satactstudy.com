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
  [/\\leq/g, '≤'],
  [/\\geq/g, '≥'],
  [/\\neq/g, '≠'],
  [/\\ne/g, '≠'],
  [/\\pm/g, '±'],
  [/\\infty/g, '∞'],
  [/\\pi/g, 'π'],
  [/\\sqrt/g, '√'],
  [/\\circ/g, '°'],
  [/\\degree/g, '°'],
  [/\\%/g, '%'],
]

export function applyLatexSymbols(value: string): string {
  return SYMBOLS.reduce((text, [pattern, next]) => text.replace(pattern, next), value)
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

export function parseMath(input: string): MathPart[] {
  const parts: MathPart[] = []
  let i = 0
  let buf = ''
  const flush = () => {
    if (!buf) return
    parts.push(...splitNumericFractions(replaceSymbols(buf)))
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
