import type { StudyLevel, StudyProblem } from './types'

export type LessonExample = {
  label: string
  why: string
}

export type LessonExampleSet = {
  yesTitle: string
  noTitle: string
  yes: LessonExample[]
  no: LessonExample[]
}

const BANK: Record<string, LessonExampleSet> = {
  'Complete sentences': {
    yesTitle: 'These ARE complete sentences',
    noTitle: 'These are NOT complete sentences',
    yes: [
      { label: 'The bus stopped.', why: 'It has a who (the bus) and a what-happens (stopped).' },
      { label: 'We left after the game.', why: 'Subject “we” + verb “left” — a full thought.' },
      { label: 'Riders came back after the lamps went up.', why: 'Riders (who) came back (what happened).' },
      { label: 'Maya packed her bag.', why: 'Clear subject and verb — nothing missing.' },
    ],
    no: [
      { label: 'Because it rained.', why: 'Starts with because and never finishes the thought — a fragment.' },
      { label: 'After the game.', why: 'Only a time phrase — no subject doing an action.' },
      { label: 'When she left.', why: 'A when-clause cannot stand alone as a sentence.' },
      { label: 'The lamps, and the riders.', why: 'Names things but has no verb — not complete.' },
    ],
  },
  'Whole numbers': {
    yesTitle: 'These ARE whole numbers',
    noTitle: 'These are NOT whole numbers',
    yes: [
      { label: '0', why: '0 is a whole number — the count starts at zero.' },
      { label: '1', why: '1 is a counting number with no fraction part.' },
      { label: '7', why: '7 is a complete count — nothing leftover.' },
      { label: '12', why: '12 is a whole amount you can count on your fingers and toes, twice.' },
      { label: '100', why: '100 is a whole count — no decimal or fraction attached.' },
    ],
    no: [
      { label: '4.3', why: '4.3 is a decimal — not a whole count.' },
      { label: '6.452', why: '6.452 has digits after the decimal point.' },
      { label: '1/2', why: '1/2 is a fraction — only part of a whole.' },
      { label: '−3', why: '−3 is negative — whole numbers are 0 and up.' },
      { label: '2.5', why: '2.5 has a leftover half, so it is not whole.' },
    ],
  },
  'Fractions and percents': {
    yesTitle: 'These ARE fractions / percents',
    noTitle: 'These are NOT fractions / percents',
    yes: [
      { label: '1/2', why: '1/2 means 1 out of 2 equal parts.' },
      { label: '3/4', why: '3/4 means 3 out of 4 equal parts.' },
      { label: '50%', why: '50% means 50 out of 100 — same idea as 1/2.' },
      { label: '25%', why: '25% means a quarter of the whole.' },
    ],
    no: [
      { label: '7', why: '7 is a whole count, not a part-of-a-whole statement.' },
      { label: 'x + 1', why: 'x + 1 is an expression, not a fraction of a whole.' },
      { label: '√2', why: '√2 is an irrational length, not a simple part/whole percent.' },
    ],
  },
  'Linear functions': {
    yesTitle: 'These ARE linear',
    noTitle: 'These are NOT linear',
    yes: [
      { label: 'y = 3x + 5', why: 'Steady rate 3, start 5 — a straight-line machine.' },
      { label: 'y = x + 4', why: 'y grows by 1 each time x grows by 1.' },
      { label: 'y = −2x + 1', why: 'Constant slope −2 still makes a straight line.' },
    ],
    no: [
      { label: 'y = x²', why: 'x² bends into a curve — not a constant rate.' },
      { label: 'y = 1/x', why: '1/x jumps and curves — not linear.' },
      { label: 'y = 2ˣ', why: 'Exponential growth speeds up — not a fixed slope.' },
    ],
  },
  'Linear equations': {
    yesTitle: 'These ARE linear equations',
    noTitle: 'These are NOT',
    yes: [
      { label: '2x + 4 = 10', why: 'One variable to the first power — solve by undoing steps.' },
      { label: 'x − 3 = 7', why: 'A balance scale with x on one side.' },
      { label: '5x = 20', why: 'Multiply form — divide both sides by 5.' },
    ],
    no: [
      { label: 'x² = 9', why: 'x² is quadratic, not a linear equation.' },
      { label: 'y = 3x + 1', why: 'That is a function rule, not a single-value equation to solve for one number (unless asked).' },
      { label: '|x| = 4', why: 'Absolute value splits into two cases — not plain linear.' },
    ],
  },
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function looksLikeQuestion(text: string): boolean {
  const t = clean(text)
  if (!t) return true
  if (/\?$/.test(t)) return true
  return /^(which of the following|which is|which sentence|what is|how many|pick the|choose the|select the|find the|solve)\b/i.test(t)
}

function shortLabel(text: string, max = 72): string {
  const t = clean(text)
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

function uniqueExamples(items: LessonExample[], min = 3): LessonExample[] {
  const seen = new Set<string>()
  const out: LessonExample[] = []
  for (const item of items) {
    const label = shortLabel(item.label)
    const why = clean(item.why)
    const key = label.toLowerCase()
    if (!label || !why || looksLikeQuestion(label) || seen.has(key)) continue
    seen.add(key)
    out.push({ label, why })
  }
  return out.slice(0, Math.max(min, out.length))
}

function fromProblems(problems: StudyProblem[], title: string): { yes: LessonExample[]; no: LessonExample[] } {
  const yes: LessonExample[] = []
  const no: LessonExample[] = []
  for (const problem of problems) {
    const correct = problem.choices.find((c) => c.key === problem.answer)
    if (correct?.text) {
      yes.push({
        label: correct.text,
        why: clean(problem.explain) || `${correct.text} follows the ${title} rule.`,
      })
    }
    for (const choice of problem.choices) {
      if (choice.key === problem.answer) continue
      no.push({
        label: choice.text,
        why: `"${choice.text}" does not satisfy ${title} — that is why it is a trap.`,
      })
    }
  }
  return { yes, no }
}

/** Topic-aware examples when the AI pack is missing or incomplete. */
export function fallbackExamples(level: StudyLevel): LessonExampleSet {
  const title = level.title
  const teach0 = level.teach[0] ?? `${title} is the idea we are learning.`
  const fromBank = fromProblems(level.problems, title)
  const sample = !looksLikeQuestion(level.example) ? level.example : ''

  const yesSeed: LessonExample[] = [
    ...(sample ? [{ label: sample, why: teach0 }] : []),
    ...fromBank.yes,
  ]

  const noSeed: LessonExample[] = [
    ...fromBank.no,
  ]

  let yes = uniqueExamples(yesSeed, 3)
  let no = uniqueExamples(noSeed, 3)

  if (yes.length < 3) {
    yes = uniqueExamples([
      ...yes,
      { label: `A clear ${title} case`, why: teach0 },
      { label: `Another solid ${title} case`, why: `This still follows ${title} on purpose.` },
      { label: `A third ${title} win`, why: level.tricks[0] || `Reuse the ${title} rule again.` },
    ], 3)
  }
  if (no.length < 3) {
    no = uniqueExamples([
      ...no,
      { label: `Not really ${title}`, why: `It never uses the ${title} rule.` },
      { label: `Almost ${title}, but wrong`, why: `Close wording, wrong idea.` },
      { label: `Off-topic filler`, why: `It ignores ${title} completely.` },
    ], 3)
  }

  return {
    yesTitle: `These match ${title}`,
    noTitle: `These do NOT match ${title}`,
    yes: yes.slice(0, 5),
    no: no.slice(0, 5),
  }
}

/** Normalize AI or partial example packs; fill gaps from the level. */
export function normalizeExampleSet(
  level: StudyLevel,
  raw?: Partial<LessonExampleSet> | null,
): LessonExampleSet {
  const base = BANK[level.title] ?? fallbackExamples(level)
  if (!raw) return base

  const yes = uniqueExamples(
    [...(raw.yes ?? []), ...base.yes],
    3,
  ).slice(0, 5)
  const no = uniqueExamples(
    [...(raw.no ?? []), ...base.no],
    3,
  ).slice(0, 5)

  return {
    yesTitle: clean(raw.yesTitle || base.yesTitle),
    noTitle: clean(raw.noTitle || base.noTitle),
    yes: yes.length >= 3 ? yes : base.yes,
    no: no.length >= 3 ? no : base.no,
  }
}

export function examplesForLevel(level: StudyLevel): LessonExampleSet {
  return BANK[level.title] ?? fallbackExamples(level)
}
