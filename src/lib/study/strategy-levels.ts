import {
  DESMOS_TRICKS,
  HARD_QUESTION_TIPS,
  MATH_FORMULAS,
  QUICK_TIPS,
  VOCABULARY_TRICKS,
  type ReferenceCard,
} from '@/lib/reference/content'
import { makeLevel, makeProblem, type StudyLevel, type StudyProblem, type StudyTrack } from './types'

type BankItem = {
  prompt: string
  answer: string
  choices: [string, string, string, string]
  explain: string
}

const MATH_QUICK = new Set([
  'Plug in numbers on variables',
  'Backsolve from the choices',
  'Name what the question wants',
  'Skip the time sink',
])

const MATH_HARD = new Set([
  'Translate the story into one equation',
  'Systems: intersection, not intercept',
  'Functions on a graph',
  'Student-produced responses',
  'Inequalities and absolute value',
  'Data and scatterplots',
  'Calculator last mile',
  'Pacing snapshot',
])

const PRACTICE_BANK: Record<string, BankItem> = {
  'Predict before you look': {
    prompt: 'As used in the text, “merely” most nearly means',
    answer: 'B',
    choices: ['barely', 'only', 'occasionally', 'formerly'],
    explain: 'Predict a synonym like “only,” then match choice B.',
  },
  'Eliminate hard, then guess once': {
    prompt: 'Because the study sampled only weekend shoppers, its claim that downtown retail is “thriving year-round” is ______.',
    answer: 'B',
    choices: ['definitive', 'premature', 'irrelevant', 'inevitable'],
    explain: 'Kill extremes and unsupported claims; “premature” fits limited weekend data.',
  },
  'Plug in numbers on variables': {
    prompt: 'If x > 0 and y = 3x + 2, which of the following is equivalent to 6x + 4?',
    answer: 'A',
    choices: ['2y', 'y + 2', '3y', 'y - 2'],
    explain: 'Pick x = 2 → y = 8 and 6x + 4 = 16. Only 2y matches.',
  },
  'Backsolve from the choices': {
    prompt: 'A number increased by 40% equals 84. What is the number?',
    answer: 'C',
    choices: ['48', '50', '60', '70'],
    explain: 'Try the middle: 60 × 1.4 = 84.',
  },
  'Name what the question wants': {
    prompt: 'A rectangle has length 2x and width x. What is the perimeter of the rectangle?',
    answer: 'D',
    choices: ['2x', '3x', '4x', '6x'],
    explain: 'Perimeter is 2(2x + x) = 6x — not area.',
  },
  'Skip the time sink': {
    prompt: 'Which of the following is a solution to x³ − 6x² + 11x − 6 = 0?',
    answer: 'A',
    choices: ['1', '4', '5', '6'],
    explain: 'Test easy integers first: x = 1 works. Do not grind the cubic.',
  },
  'Context beats the flashcard definition': {
    prompt: 'As used in the text, “qualified” most nearly means',
    answer: 'A',
    choices: ['limited', 'certified', 'celebrated', 'ignored'],
    explain: 'Tone: praise was limited, not “certified.”',
  },
  'Split prefix, root, and suffix': {
    prompt: 'As used in the text, “untenable” most nearly means',
    answer: 'A',
    choices: ['impossible to defend', 'easy to measure', 'widely popular', 'newly discovered'],
    explain: 'un + tenable → cannot be held/defended.',
  },
  'Tone words are the real test': {
    prompt: 'The chemist’s attitude toward the conclusions is best described as',
    answer: 'B',
    choices: ['admiring', 'doubtful', 'indifferent', 'hostile'],
    explain: '“Skeptical” maps to doubtful, not hostile.',
  },
}

function bankProblems(title: string, card: ReferenceCard): StudyProblem[] {
  const hit = PRACTICE_BANK[title]
  const check1 = makeProblem(
    `Which move best matches “${title}”?`,
    'A',
    [card.rule, 'Pick the longest choice', 'Ignore the stem', 'Always choose C'],
    card.detail,
  )
  const check2 = makeProblem(
    `After learning “${title},” what should you do first on a similar item?`,
    'B',
    ['Skip reading', card.steps[0] ?? card.rule, 'Average the choices', 'Change topics'],
    card.steps[0] ?? card.rule,
  )
  if (!hit) return [check1, check2, makeProblem(
    `Why does “${title}” help?`,
    'C',
    ['It wastes time', 'It invents facts', card.detail.slice(0, 90) || card.rule, 'It skips all work'],
    card.detail,
  )]
  return [
    makeProblem(hit.prompt, hit.answer, hit.choices, hit.explain),
    check1,
    check2,
  ]
}

function fromCard(
  index: number,
  track: StudyTrack,
  category: string,
  card: ReferenceCard,
  topicExtra: string[] = [],
): StudyLevel {
  return makeLevel(
    index,
    track,
    category,
    card.title,
    [card.title.toLowerCase(), category.toLowerCase(), ...topicExtra],
    card.rule,
    [card.rule, ...card.steps],
    [card.detail, ...(card.href ? [`Open practice path: ${card.href}`] : [])],
    bankProblems(card.title, card),
  )
}

function formulaLevels(startIndex: number): StudyLevel[] {
  return MATH_FORMULAS.map((group, i) => {
    const teach = [
      group.note ?? `Know every formula in ${group.title} cold.`,
      ...group.items.map((item) => `${item.name}: ${item.formula}`),
    ]
    const first = group.items[0]!
    const second = group.items[1] ?? first
    const third = group.items[2] ?? first
    return makeLevel(
      startIndex + i,
      'math',
      'Formulas',
      group.title,
      ['formula', group.title.toLowerCase(), first.name.toLowerCase()],
      `${first.name}: ${first.formula}`,
      teach,
      ['Write the formula before you plug numbers.', 'Check you reported the asked quantity.'],
      [
        makeProblem(
          `A practice item requires ${first.name}. What is the correct first move?`,
          'A',
          [`Write ${first.formula}, then substitute.`, 'Guess the largest choice.', 'Skip writing the formula.', 'Average all choices.'],
          `Write ${first.formula} first.`,
        ),
        makeProblem(
          `Which formula matches ${second.name}?`,
          'B',
          [first.formula, second.formula, 'x = 0 always', 'Pick C'],
          second.formula,
        ),
        makeProblem(
          `On test day, how should you use ${third.name}?`,
          'C',
          ['Memorize only the name', 'Invent a new formula', `Apply ${third.formula} with the given values`, 'Ignore units'],
          third.formula,
        ),
      ],
    )
  })
}

export function buildMathStrategyLevels(startIndex: number): StudyLevel[] {
  const levels: StudyLevel[] = []
  let i = startIndex

  for (const card of QUICK_TIPS.filter((c) => MATH_QUICK.has(c.title))) {
    levels.push(fromCard(i++, 'math', 'Test strategy', card, ['strategy', 'tip']))
  }
  for (const card of DESMOS_TRICKS) {
    levels.push(fromCard(i++, 'math', 'Desmos', card, ['desmos', 'graphing']))
  }
  const formulas = formulaLevels(i)
  levels.push(...formulas)
  i += formulas.length
  for (const card of HARD_QUESTION_TIPS.filter((c) => MATH_HARD.has(c.title))) {
    levels.push(fromCard(i++, 'math', 'Hard questions', card, ['hard', 'strategy']))
  }
  return levels
}

export function buildEnglishStrategyLevels(startIndex: number): StudyLevel[] {
  const levels: StudyLevel[] = []
  let i = startIndex

  for (const card of QUICK_TIPS.filter((c) => !MATH_QUICK.has(c.title))) {
    levels.push(fromCard(i++, 'english', 'Test strategy', card, ['strategy', 'tip']))
  }
  for (const card of VOCABULARY_TRICKS) {
    levels.push(fromCard(i++, 'english', 'Vocabulary', card, ['vocab', 'words']))
  }
  for (const card of HARD_QUESTION_TIPS.filter((c) => !MATH_HARD.has(c.title))) {
    levels.push(fromCard(i++, 'english', 'Hard questions', card, ['hard', 'reading', 'science']))
  }
  return levels
}
