import type { GuidedLesson, LessonStepId } from './lesson-flow'
import { isNearDuplicate } from '@/lib/tutor/anti-repeat'

export type TeachMood = 'idle' | 'talk' | 'point' | 'cheer' | 'think'

/**
 * Whiteboard example for ONE beat: a single example line plus the single
 * annotation Nova is making right now, with the exact symbols highlighted.
 */
export type BoardExample = {
  /** Board math at this beat, e.g. ["4 + 3 = 7"] or ["4 + 3 = 7", "3 + 4 = 7"]. */
  lines: string[]
  /** Exact substrings of the math Nova is spotlighting this beat. */
  highlight?: string[]
  /** The one annotation Nova writes this beat, e.g. "① Circle the operation". */
  note?: string
}

export type TeachBeat = {
  say: string
  highlight?: string
  mood: TeachMood
  focusLabel?: string
  focusSide?: 'yes' | 'no' | 'equation'
  /** Whiteboard example for this beat — rendered in the board box, never in the bubble. */
  board?: BoardExample
  /** Internal agent checklist label — never shown as a student checklist UI. */
  checklistLabel?: string
}

export { isNearDuplicate }

function cleanBeat(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** Split lecture text into sentences (decimal-safe: only breaks before a capital). */
function splitSentences(say: string): string[] {
  return say
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => cleanBeat(s))
    .filter(Boolean)
}

/**
 * Pull EVERY "For example, ..." sentence out of lecture text.
 * Lecture keeps the rules; every worked instance goes to the board.
 */
function extractAllBoard(say: string): { lecture: string; maths: string[] } {
  const lectureSentences: string[] = []
  const maths: string[] = []
  for (const sentence of splitSentences(say)) {
    const match = /^\s*for example,\s*(.+?)\s*[.!?]?\s*$/i.exec(sentence)
    const math = match?.[1] ? cleanBeat(match[1]) : ''
    if (math && /[0-9=]/.test(math)) {
      maths.push(math)
    } else {
      lectureSentences.push(sentence)
    }
  }
  return { lecture: lectureSentences.join(' '), maths }
}

/** From a prose-y example label, pull just the equation fragment for the board. */
function mathFragment(text: string): string {
  const cleaned = cleanBeat(text)
  const stripped = cleaned.replace(
    /^.*?\b(look at|consider|take|say|suppose|imagine|like|for instance|e\.g\.?|such as)\s+(?=[0-9a-z])/i,
    '',
  )
  const candidate = cleanBeat(stripped) || cleaned
  if (!/=/.test(candidate) && candidate.split(/\s+/).length > 6) {
    const equation = /[0-9a-z][^.;!?]*=[^.;!?]+/.exec(candidate)?.[0]
    if (equation) return cleanBeat(equation)
  }
  return candidate
}

/** Split board math like "3 + 5 = 5 + 3 and 2 x 7 = 7 x 2" into separate lines. */
function splitBoardLines(math: string): string[] {
  return math
    .split(/\s+and\s+(?=[0-9a-z(])/i)
    .map((line) => cleanBeat(line.replace(/[.!?]+$/, '')))
    .filter(Boolean)
    .slice(0, 3)
}

/** Tiny safe arithmetic evaluator (numbers, + - * / x, parentheses). No eval. */
function safeEval(expr: string): number | null {
  const normalized = expr
    .replace(/[×x]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, '')
  if (!normalized || !/^[0-9+\-*/().]+$/.test(normalized)) return null
  let pos = 0
  function parseExpr(): number | null {
    let value = parseTerm()
    if (value == null) return null
    while (pos < normalized.length && (normalized[pos] === '+' || normalized[pos] === '-')) {
      const op = normalized[pos]
      pos += 1
      const rhs = parseTerm()
      if (rhs == null) return null
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }
  function parseTerm(): number | null {
    let value = parseFactor()
    if (value == null) return null
    while (pos < normalized.length && (normalized[pos] === '*' || normalized[pos] === '/')) {
      const op = normalized[pos]
      pos += 1
      const rhs = parseFactor()
      if (rhs == null || (op === '/' && rhs === 0)) return null
      value = op === '*' ? value * rhs : value / rhs
    }
    return value
  }
  function parseFactor(): number | null {
    let sign = 1
    while (normalized[pos] === '+' || normalized[pos] === '-') {
      if (normalized[pos] === '-') sign = -sign
      pos += 1
    }
    if (normalized[pos] === '(') {
      pos += 1
      const value = parseExpr()
      if (value == null || normalized[pos] !== ')') return null
      pos += 1
      return sign * value
    }
    const match = /^[0-9]*\.?[0-9]+/.exec(normalized.slice(pos))
    if (!match) return null
    pos += match[0].length
    return sign * Number(match[0])
  }
  const value = parseExpr()
  if (value == null || pos !== normalized.length || !Number.isFinite(value)) return null
  return Math.round(value * 1000) / 1000
}

function numbersIn(text: string): number[] {
  return (text.match(/[0-9]*\.?[0-9]+/g) ?? []).map(Number)
}

function sameNumberMultiset(a: string, b: string): boolean {
  const left = numbersIn(a).sort((x, y) => x - y)
  const right = numbersIn(b).sort((x, y) => x - y)
  return left.length > 0 && left.length === right.length && left.every((n, i) => n === right[i])
}

/**
 * Stepped annotation engine: ONE example and ONE annotation at a time.
 * Every annotation highlights exactly what it talks about, and every mark
 * teaches a move the student can copy on test day (circle the operation,
 * box the numbers, rewrite the flip, check the match).
 */
type RuleHint = 'commutative' | null

type BoardStepPlan = {
  say: string
  highlight?: string[]
  lines?: string[]
  note: string
}

const CIRCLED = ['①', '②', '③', '④', '⑤']

function opSpoken(op: string): string {
  if (op === '+') return 'plus sign'
  if (op === '×' || op === '*' || op === '·') return 'times sign'
  if (op === '−' || op === '-' || op === '–' || op === '—') return 'minus sign'
  return 'division sign'
}

function isFlipOp(op: string): boolean {
  return op === '+' || op === '×' || op === '*' || op === '·'
}

/** Find the main operator at depth 0 (skips a leading unary minus). */
function topLevelOp(side: string): { op: string; left: string; right: string } | null {
  let depth = 0
  for (let i = 0; i < side.length; i++) {
    const ch = side[i] ?? ''
    if (ch === '(') depth += 1
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && '+-×*·/÷−–—'.includes(ch)) {
      const left = side.slice(0, i).trim()
      const right = side.slice(i + 1).trim()
      if (!left || !right) continue
      if ((ch === '-' || ch === '−' || ch === '–' || ch === '—') && !/[0-9a-z)]$/i.test(left)) continue
      return { op: ch, left, right }
    }
  }
  return null
}

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000)
}

function splitEquation(line: string): string[] {
  return line.split('=').map((s) => cleanBeat(s)).filter(Boolean)
}

/** "4 + 3" -> "3 + 4". Only for safe numeric +/x splits. */
function flipSide(side: string): string | null {
  const parsed = topLevelOp(side)
  if (!parsed || !isFlipOp(parsed.op)) return null
  if (safeEval(parsed.left) == null || safeEval(parsed.right) == null) return null
  return `${parsed.right} ${parsed.op} ${parsed.left}`
}

function innermostGroup(text: string): string | null {
  return /\([^()]*\)/.exec(text)?.[0] ?? null
}

function lettersIn(text: string): string[] {
  const seen: string[] = []
  for (const ch of text) {
    if (/[a-z]/i.test(ch) && !seen.includes(ch)) seen.push(ch)
  }
  return seen.slice(0, 3)
}

function hasWorkLine(line: string): boolean {
  return /=/.test(line) || (/[0-9]/.test(line) && /[+×÷*/−–—-]/.test(line))
}

function opScopeLine(op: string, ruleHint: RuleHint): string {
  if (ruleHint === 'commutative') {
    return 'Commutative only fires for adding and multiplying — never for minus or divide.'
  }
  return 'The operation decides which rule can fire.'
}

function opStep(op: string, ruleHint: RuleHint): Omit<BoardStepPlan, 'note'> {
  return {
    say: `I circle the ${opSpoken(op)} first — ${opScopeLine(op, ruleHint)} On test day, circle the operation before you touch any numbers.`,
    highlight: [op],
  }
}

function operandsStep(left: string, right: string): Omit<BoardStepPlan, 'note'> {
  return {
    say: `I box the ${left} and the ${right} — name the players before you move anything. Nothing else on the page is allowed to move.`,
    highlight: [left, right],
  }
}

/** Full detail plan for ONE example line: op -> operands -> flip/proof. */
function planDetailSteps(line: string, ruleHint: RuleHint): BoardStepPlan[] {
  const sides = splitEquation(line)
  if (sides.length !== 2) {
    const value = safeEval(line)
    if (value != null) {
      return [{
        say: `I work it out on the board: ${line} = ${fmtNum(value)}. One line, one answer — write every step down.`,
        highlight: [line],
        note: `Makes ${fmtNum(value)}`,
      }]
    }
    const nums = [...new Set(numbersIn(line))].slice(0, 4).map(String)
    return [{
      say: `Trace each piece of ${line} and say what it controls before you move anything.`,
      highlight: nums.length ? nums : [line],
      note: 'Trace each piece',
    }]
  }

  const left = sides[0] ?? ''
  const right = sides[1] ?? ''
  const vL = safeEval(left)
  const vR = safeEval(right)
  const parsed = topLevelOp(left)
  const group = innermostGroup(left) ?? innermostGroup(right)
  const flipped = flipSide(left)

  // Already shows both orders: circle op, box numbers, prove the match.
  if (parsed && isFlipOp(parsed.op) && vL != null && vL === vR && sameNumberMultiset(left, right) && !group) {
    return [
      { ...opStep(parsed.op, ruleHint), note: 'Circle the operation' },
      { ...operandsStep(parsed.left, parsed.right), note: 'Box the numbers you can move' },
      {
        say: `The right side is already flipped — and each side makes ${fmtNum(vL)}. That match is your proof the swap was legal. No match, no swap.`,
        highlight: [right],
        note: `Both sides = ${fmtNum(vL)} ✓`,
      },
    ]
  }

  // One-sided result: circle op, box numbers, then flip and rewrite live.
  if (parsed && isFlipOp(parsed.op) && vR != null && /^-?[0-9.]+$/.test(right) && vL != null && flipped) {
    const flippedLine = `${flipped} = ${right}`
    return [
      { ...opStep(parsed.op, ruleHint), note: 'Circle the operation' },
      { ...operandsStep(parsed.left, parsed.right), note: 'Box the numbers you can move' },
      {
        say: `Now I flip them and rewrite underneath: ${flippedLine}. Same answer — still ${fmtNum(vR)}. Rewriting the flip on scratch paper is exactly how you check yourself on test day.`,
        highlight: [flippedLine],
        lines: [line, flippedLine],
        note: 'Flip and rewrite',
      },
    ]
  }

  // Parentheses: bracket first, then prove.
  if (group && vL != null && vL === vR) {
    return [
      {
        say: `Parentheses always go first — I bracket ${group} and solve inside before touching anything outside. On the test, bracket first, then rewrite.`,
        highlight: [group],
        note: 'Bracket the parentheses first',
      },
      {
        say: `Each side makes ${fmtNum(vL)} — that match is your proof. Rewrite after every inside-step, never two steps in your head.`,
        highlight: [right],
        note: `Both sides = ${fmtNum(vL)} ✓`,
      },
    ]
  }

  // Symbolic rule: circle op, then plug in real numbers.
  if (/[a-z]/i.test(line) && parsed) {
    const letters = lettersIn(line)
    return [
      { ...opStep(parsed.op, ruleHint), note: 'Circle the operation' },
      {
        say: `The ${letters.join(', ') || 'letters'} stand for any numbers — I test with 2 and 3 on scratch paper. If it holds for 2 and 3, I trust it. Thirty seconds, saves the question.`,
        highlight: letters.length ? letters : [line],
        note: 'Test with 2 and 3',
      },
    ]
  }

  // Generic verify: work each side, compare.
  const nums = [...new Set(numbersIn(line))].slice(0, 4).map(String)
  return [{
    say: 'Work each side separately, then compare — the match is your proof. That habit is what saves you on test day.',
    highlight: nums.length ? nums : (right ? [right] : [line]),
    note: 'Work each side',
  }]
}

/** Condensed single-beat check for one example line. */
function condensedBeat(line: string, sameRule = true): { say: string; highlight?: string[]; note: string } {
  const lead = sameRule ? 'Same rule, new numbers: ' : 'Take this one: '
  const sides = splitEquation(line)
  if (sides.length === 2) {
    const values = sides.map(safeEval)
    if (values.every((v) => v != null) && new Set(values).size === 1) {
      const v = fmtNum(values[0] as number)
      return {
        say: `${lead}${line}. Each side makes ${v} — that match is the whole proof. Hunt for it on every question.`,
        highlight: [sides[1] ?? line],
        note: `Both sides = ${v} ✓`,
      }
    }
  }
  const nums = [...new Set(numbersIn(line))].slice(0, 4).map(String)
  return {
    say: `${lead}${line}. Trace each number, say what it controls, then move.`,
    highlight: nums.length ? nums : [line],
    note: 'Trace each number',
  }
}

function isRuleOrCannot(sentence: string): boolean {
  return /\b(cannot|can not|can't|must not|do not|don't|never|not allowed|is not|are not)\b|\brule\b|\bonly\b/i.test(sentence)
}

function asBoardLine(text: string): string | null {
  const cleaned = cleanBeat(text).replace(/[.!?]+$/, '')
  if (!cleaned || /\?$/.test(cleaned)) return null
  if (hasWorkLine(cleaned)) {
    const frag = mathFragment(cleaned)
    return frag || cleaned
  }
  if (cleaned.length <= 90 && cleaned.split(/\s+/).length <= 14) return cleaned
  return null
}

/** A second numeric example of the same pattern, kept only when it still balances. */
function variedTwin(line: string): string | null {
  if (!/[+=×÷*/√−–—-]/.test(line) || /\/\s*0\b/.test(line)) return null
  let bumped = false
  const next = line.replace(/[0-9]+/g, (token) => {
    bumped = true
    return String(Number(token) + 2)
  })
  if (!bumped || next === line) return null
  const sides = next.split('=')
  if (sides.length === 2) {
    const left = safeEval(sides[0] ?? '')
    const right = safeEval(sides[1] ?? '')
    if (left == null || left !== right) return null
  }
  return cleanBeat(next)
}

function pullWorkChunks(text: string): string[] {
  const chunks: string[] = []
  for (const match of text.match(/[A-Za-z0-9()][^.;]{0,48}=[^.;]{1,48}/g) ?? []) {
    chunks.push(cleanBeat(match))
  }
  for (const piece of text.split(/\s+and\s+/i)) {
    if (hasWorkLine(piece)) chunks.push(cleanBeat(piece))
  }
  return chunks
}

/** Concrete pairs so a cannot or rule is shown on more than one example. */
function craftedForRule(rule: string): string[] {
  const lower = rule.toLowerCase()
  if ((/divid/.test(lower) || /denominator/.test(lower)) && /(0|zero)/.test(lower)) {
    return ['1/(x - 3) is undefined at x = 3', '8/(x + 2) is undefined at x = -2']
  }
  if (/(square root|even root|√)/.test(lower) && /negative/.test(lower)) {
    return ['√(x - 1) needs x ≥ 1', '√(x + 6) needs x ≥ -6']
  }
  if (/cancel/.test(lower)) {
    return ['(x + 3)/3 does not cancel the 3', '(2x + 6)/2 = x + 3']
  }
  if (/lead|majority|margin/.test(lower) && /cannot|not/.test(lower)) {
    return ['48% ± 5% still includes 50%', '54% ± 2% stays above 50%']
  }
  if (/stand alone|fragment/.test(lower)) {
    return ['Because it rained.', 'When she left.']
  }
  if (/semicolon/.test(lower)) {
    return ['The bus stopped. Riders cheered.', 'After the game.']
  }
  if (/commutat/.test(lower)) {
    if (/\b(not|never)\b/.test(lower)) {
      return ['8 - 3 is not 3 - 8', '10 ÷ 2 is not 2 ÷ 10']
    }
    return ['4 + 9 = 9 + 4', '6 × 2 = 2 × 6']
  }
  if (/associat/.test(lower)) {
    if (/\b(not|never)\b/.test(lower)) {
      return ['(8 - 3) - 1 is not 8 - (3 - 1)', '(12 ÷ 6) ÷ 2 is not 12 ÷ (6 ÷ 2)']
    }
    return ['(2 + 3) + 4 = 2 + (3 + 4)', '(2 × 3) × 4 = 2 × (3 × 4)']
  }
  if (/distribut/.test(lower)) {
    return ['4(x + 5) = 4x + 20', '-2(x + 7) = -2x - 14']
  }
  return []
}

function uniqueLines(items: Array<string | null | undefined>, limit = 3): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (!item || out.length >= limit) continue
    const line = asBoardLine(item)
    if (!line) continue
    const key = line.toLowerCase().replace(/\s+/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out
}

/**
 * Split packed lecture text so each cannot and each rule is its own part.
 * A "For example" sentence stays attached to the rule it illustrates.
 */
function splitConceptParts(text: string): string[] {
  const raw = cleanBeat(text)
  if (!raw) return []
  const named = raw.match(/[A-Z][a-z]+\s*:[^.;!?]+[.;!?]?/g)?.map((c) => cleanBeat(c)).filter(Boolean) ?? []
  if (named.length >= 2) return named

  const sentences = splitSentences(raw)
  if (sentences.length < 2) return [raw]

  const groups: string[][] = []
  let bucket: string[] = []
  const flush = () => {
    if (bucket.length) groups.push(bucket)
    bucket = []
  }
  for (const sentence of sentences) {
    if (/^\s*for example\b/i.test(sentence)) {
      bucket.push(sentence)
      continue
    }
    if (bucket.length) flush()
    bucket.push(sentence)
  }
  flush()

  const parts = groups.map((group) => cleanBeat(group.join(' '))).filter(Boolean)
  const ruleCount = parts.filter((part) => isRuleOrCannot(part)).length
  if (ruleCount >= 1 && parts.length >= 2) return parts
  return [raw]
}

/**
 * Build stepped beats for a lecture + its worked examples.
 * Beat 0 states the rule with the first example on the board; then each
 * annotation gets its own beat (one example, one mark, exact highlights).
 * Mode 'full' (definitions) walks the first example in full detail and
 * condenses later ones; mode 'tour' (breakdown) condenses every example
 * so each concept still gets exactly one example + one mark per beat.
 */
function exampleBeats(opts: {
  lecture: string
  examples: string[]
  fallbackPool: string[]
  checklist: string
  ruleHint: RuleHint
  mode?: 'full' | 'tour' | 'rules'
}): TeachBeat[] {
  const primary = uniqueLines(opts.examples.flatMap(splitBoardLines), 3)
  let lines = primary.length >= 2
    ? primary
    : uniqueLines([...primary, ...opts.fallbackPool], 3)
  if (lines.length < 2) {
    const twin = variedTwin(lines[0] ?? '')
    if (twin) lines = uniqueLines([...lines, twin], 3)
  }
  const lecture = cleanBeat(opts.lecture)
  if (!lines.length || !lecture) {
    return [{ mood: 'talk', say: lecture || 'Let us look at this together.', checklistLabel: opts.checklist }]
  }
  const punctuated = /[.!?]$/.test(lecture) ? lecture : `${lecture}.`
  const [first, ...rest] = lines as [string, ...string[]]
  const beats: TeachBeat[] = [{
    mood: 'talk',
    say: `${punctuated} Look at the board.`,
    board: { lines: [first] },
    checklistLabel: opts.checklist,
  }]
  if (opts.mode === 'tour' || opts.mode === 'rules') {
    const ruleLecture = splitSentences(punctuated).filter((sentence) => !/^\s*for example\b/i.test(sentence)).join(' ')
    const lead = /[.!?]$/.test(ruleLecture) ? ruleLecture : `${ruleLecture}.`
    lines.forEach((line, i) => {
      const say = opts.mode === 'rules'
        ? (i === 0 ? `${lead} Here is one example: ${line}.` : `Same rule, different example: ${line}.`)
        : condensedBeat(line, false).say
      beats.push({
        mood: 'point',
        say,
        board: { lines: [line] },
        checklistLabel: `${opts.checklist} · example ${i + 1}`,
      })
    })
    return beats.slice(opts.mode === 'rules' ? 1 : 0)
  }
  planDetailSteps(first, opts.ruleHint).forEach((step, i) => {
    beats.push({
      mood: 'point',
      say: step.say,
      board: { lines: step.lines ?? [first], highlight: step.highlight, note: `${CIRCLED[i] ?? '•'} ${step.note}` },
      checklistLabel: `${opts.checklist} · mark ${i + 1}`,
    })
  })
  for (const line of rest) {
    const check = condensedBeat(line)
    beats.push({
      mood: 'point',
      say: check.say,
      board: { lines: [line], highlight: check.highlight, note: check.note },
      checklistLabel: `${opts.checklist} · check`,
    })
  }
  return beats
}

/**
 * Split a possibly packed definition into one beat per concept.
 * Each concept gets: rule beat -> stepped annotation beats (one example,
 * one mark at a time with exact highlights) -> condensed checks.
 * NOTHING from any other lesson ever appears here.
 */
function splitDefinitionBeats(lesson: GuidedLesson): TeachBeat[] {
  const raw = cleanBeat(lesson.whatItIs)
  const fallback: TeachBeat[] = [{ mood: 'talk', say: raw || lesson.whatItIs, checklistLabel: 'Definition' }]
  if (!raw) return fallback
  const parts = splitConceptParts(raw)

  const examplePool = [
    lesson.translateExample,
    ...lesson.examples.yes.map((item) => item.label),
  ].map(cleanBeat).filter((s) => s && /[0-9=]/.test(s))

  const beats: TeachBeat[] = []
  parts.forEach((part, index) => {
    let say = /[.!?]$/.test(part) ? part : `${part}.`
    if (!/[0-9=]/.test(say) && !/\bfor example\b/i.test(say)) {
      const example = examplePool[index % Math.max(1, examplePool.length)] ?? examplePool[0]
      if (example) {
        say = `${say} For example, ${example}${/[.!?]$/.test(example) ? '' : '.'}`
      }
    }
    const { lecture, maths } = extractAllBoard(say)
    const inline = pullWorkChunks(lecture)
    const crafted = craftedForRule(say)
    const rotated = examplePool.length
      ? [...examplePool.slice(index % examplePool.length), ...examplePool.slice(0, index % examplePool.length)]
      : []
    beats.push(...exampleBeats({
      lecture,
      examples: [...crafted, ...maths, ...inline],
      fallbackPool: rotated.slice(0, 4),
      checklist: parts.length > 1 ? `Definition ${index + 1} of ${parts.length}` : 'Definition',
      ruleHint: /commutat/i.test(say) ? 'commutative' : null,
      mode: isRuleOrCannot(say) || crafted.length > 0 ? 'rules' : 'full',
    }))
  })
  return beats.length ? beats : fallback
}

export function dedupeTeachBeats(beats: TeachBeat[]): TeachBeat[] {
  const out: TeachBeat[] = []
  for (const beat of beats) {
    const say = beat.say.trim()
    if (!say) continue
    const boardKey = (beat.board?.lines ?? []).join('|')
    if (out.some((prev) => {
      const prevBoard = (prev.board?.lines ?? []).join('|')
      if (boardKey && prevBoard && boardKey !== prevBoard) return false
      if (beat.focusLabel && prev.focusLabel && beat.focusLabel !== prev.focusLabel) return false
      return isNearDuplicate(prev.say, say)
    })) continue
    out.push(beat)
  }
  return out
}

function oneClause(text: string): string {
  const first = text.split(/(?<=[.!?])\s+/)[0] ?? text
  return first.replace(/[.!?]+$/g, '').trim()
}

/** One sentence that names every failing example and why it fails. */
function failuresInOneSentence(
  items: Array<{ label: string; why: string }>,
  title: string,
): string {
  const parts = items.map((item) => {
    const why = oneClause(item.why || `it breaks the ${title} rule`)
    return `“${item.label}” does not work because ${why}`
  })
  if (parts.length <= 1) return `${parts[0] ?? `Nothing here is ${title}`}.`
  if (parts.length === 2) return `${parts[0]}, and ${parts[1]}.`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}.`
}

/** Agent teaching beats. Student phases handle their own UI. */
export function buildTeachBeats(lesson: GuidedLesson, stepId: LessonStepId): TeachBeat[] {
  const yes = lesson.examples.yes
  const no = lesson.examples.no
  const title = lesson.title

  if (stepId === 'definition') {
    // Defense in depth: even if a definition string ever packs two ideas
    // ("Commutative: ... Associative: ..."), split it so Nova teaches
    // ONE thing per beat, each ending with a tiny worked example.
    return dedupeTeachBeats(splitDefinitionBeats(lesson))
  }

  if (stepId === 'irlExample') {
    return dedupeTeachBeats([
      {
        mood: 'cheer',
        say: lesson.irlExample,
        checklistLabel: 'Real-world example',
      },
    ])
  }

  if (stepId === 'breakdown') {
    // One concept per beat — NEVER a packed blob of other ideas. Each part
    // tours its own example with one mark at a time, exactly like the definition.
    const parts = splitConceptParts(lesson.breakdown).slice(0, 6)
    const pool = [
      lesson.translateExample,
      ...lesson.examples.yes.map((item) => item.label),
    ].map(cleanBeat).filter((s) => s && /[0-9=]/.test(s))
    const beats: TeachBeat[] = []
    if (!parts.length) {
      beats.push({ mood: 'point', say: lesson.breakdown, checklistLabel: 'Breakdown' })
    }
    parts.forEach((part, i) => {
      const { lecture, maths } = extractAllBoard(part)
      const inline = pullWorkChunks(lecture)
      const crafted = craftedForRule(part)
      const rotated = pool.length
        ? [...pool.slice(i % pool.length), ...pool.slice(0, i % pool.length)]
        : []
      beats.push(...exampleBeats({
        lecture,
        examples: [...crafted, ...maths, ...inline],
        fallbackPool: rotated.slice(0, 4),
        checklist: parts.length > 1 ? `Breakdown ${i + 1} of ${parts.length}` : 'Breakdown',
        ruleHint: /commutat/i.test(part) ? 'commutative' : null,
        mode: isRuleOrCannot(part) || crafted.length > 0 ? 'rules' : 'tour',
      }).map((beat, j) => (i === 0 && j === 0 ? { ...beat, mood: 'point' as const } : beat)))
    })
    return dedupeTeachBeats([
      ...beats,
      {
        mood: 'talk',
        say: `When you see a new ${title} item, name each part, say what it controls, then check one tiny example before you answer.`,
        checklistLabel: 'How to analyze it',
      },
    ])
  }

  if (stepId === 'build') {
    return [{
      mood: 'point',
      say: `Quick check for ${title}. Decide whether the example is ${title}. You are only identifying the topic.`,
      checklistLabel: 'Understanding check',
    }]
  }

  if (stepId === 'yesExamples') {
    const beats: TeachBeat[] = []
    const items = yes.slice(0, 3)
    if (items[0]) {
      beats.push({
        mood: 'cheer',
        say: `Correct uses of ${title}. I will show each good example on the board while I explain why it works.`,
        focusSide: 'yes',
        focusLabel: items[0].label,
        highlight: items[0].label,
        checklistLabel: 'Intro correct examples',
      })
    }
    for (const item of items) {
      beats.push({
        mood: 'point',
        say: `Look at “${item.label}”. ${item.why || `This follows the rule for ${title}.`}`,
        focusSide: 'yes',
        focusLabel: item.label,
        highlight: item.label,
        checklistLabel: `Correct: ${item.label.slice(0, 28)}`,
      })
    }
    return dedupeTeachBeats(beats)
  }

  if (stepId === 'noExamples') {
    const beats: TeachBeat[] = []
    const items = no.slice(0, 3)
    const summary = failuresInOneSentence(items, title)
    items.forEach((item, index) => {
      beats.push({
        mood: index === 0 ? 'think' : 'point',
        say: index === 0 ? summary : `Here is another one that does not work: “${item.label}”.`,
        focusSide: 'no',
        focusLabel: item.label,
        highlight: item.label,
        checklistLabel: `Trap: ${item.label.slice(0, 28)}`,
      })
    })
    return dedupeTeachBeats(beats)
  }

  if (stepId === 'explainBack') {
    return [{
      mood: 'point',
      say: `Your turn — explain ${title} in your own words. I will score it out of 100. A score above 70 keeps you going.`,
      checklistLabel: 'Explain in your words',
    }]
  }

  if (stepId === 'practice') {
    return [{
      mood: 'talk',
      say: `Practice together: 5 multiple-choice questions, one at a time, easy to hard. Miss one and I give you another at the same level.`,
      checklistLabel: 'Practice five questions',
    }]
  }

  return [{
    mood: 'cheer',
    say: `Finale — write your own ${title} question, the correct answer, and a short analysis. Score 95+ and we save it as a bank example.`,
    checklistLabel: 'Build your own question',
  }]
}

/** Kept for older imports — copilot phases no longer use equation part prompts. */
export function copilotParts(lesson: GuidedLesson) {
  return [
    { key: 'idea', label: lesson.title, prompt: `Explain ${lesson.title} in your own words.` },
  ]
}
