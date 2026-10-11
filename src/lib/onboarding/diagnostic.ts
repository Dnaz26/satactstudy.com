import type { BookletQuestion } from '@/components/practice/test-booklet'

function q(
  id: string,
  question_text: string,
  choices: Array<[string, string]>,
  correct_answer: string,
  extra?: Partial<BookletQuestion>,
): BookletQuestion {
  return {
    id,
    question_text,
    choices: choices.map(([key, text]) => ({ key, text })),
    correct_answer,
    difficulty: 'hard',
    topic_id: null,
    topic_name: extra?.topic_name ?? 'Diagnostic',
    section_name: extra?.section_name ?? 'Diagnostic',
    category_name: extra?.category_name ?? null,
    test_type: 'SAT',
    question_type: 'multiple_choice',
    passage_title: extra?.passage_title ?? null,
    passage_content: extra?.passage_content ?? null,
    image_url: null,
    official_explanation: extra?.official_explanation ?? null,
    ai_explanation: null,
    calculator_config: null,
  }
}

const READING_PASSAGE = `The deep ocean remains the least understood habitat on Earth, not because it lacks complexity but because its complexity resists the instruments we bring to it. Submersibles flood the darkness with light, and in doing so scatter the very communities they mean to observe: species that evolved over millions of years in near-total blackness simply vanish from the illuminated frame. Scientists have therefore learned to read absence as a kind of data. A sudden thinning of marine snow, an unmapped chemical gradient, a silence where hydrophones expected the crackle of shrimp — each suggests a structure the light destroyed. The paradox is central to the field: to see the abyss clearly, researchers must largely stop looking at it directly and instead triangulate it from traces, the way astronomers map dark matter by the way it bends the light of distant galaxies.`

export const DIAGNOSTIC_QUESTIONS: BookletQuestion[] = [
  q(
    'diag-r1',
    'Based on the passage, the author mentions astronomers mapping dark matter primarily to...',
    [
      ['A', 'argue that deep-ocean research deserves the same funding as astronomy.'],
      ['B', 'illustrate a method of studying something indirectly through its effects.'],
      ['C', 'suggest that marine life and galaxies follow identical physical laws.'],
      ['D', 'prove that direct observation of the deep ocean is impossible.'],
    ],
    'B',
    {
      topic_name: 'Reading',
      section_name: 'Reading',
      passage_title: 'Diagnostic passage — Deep ocean',
      passage_content: READING_PASSAGE,
      official_explanation: 'The passage compares triangulating the abyss from traces to mapping dark matter by its effects — an indirect method.',
    },
  ),
  q(
    'diag-r2',
    'As used in the passage, the word "triangulate" most nearly means...',
    [
      ['A', 'illuminate from three directions.'],
      ['B', 'divide into measurable sections.'],
      ['C', 'locate by combining indirect evidence.'],
      ['D', 'dismiss as unreliable.'],
    ],
    'C',
    {
      topic_name: 'Reading',
      section_name: 'Reading',
      passage_title: 'Diagnostic passage — Deep ocean',
      passage_content: READING_PASSAGE,
      official_explanation: 'In context, triangulate means piecing together a location or picture from traces and indirect signals.',
    },
  ),
  q(
    'diag-r3',
    'The author would most likely agree that flooding the deep ocean with light...',
    [
      ['A', 'is the only reliable way to catalog new species.'],
      ['B', 'reveals communities exactly as they exist in darkness.'],
      ['C', 'can distort the phenomenon it intends to record.'],
      ['D', 'has no measurable effect on observed behavior.'],
    ],
    'C',
    {
      topic_name: 'Reading',
      section_name: 'Reading',
      passage_title: 'Diagnostic passage — Deep ocean',
      passage_content: READING_PASSAGE,
      official_explanation: 'The passage says lit submersibles scatter the communities they mean to observe — observation distorts the subject.',
    },
  ),
  q(
    'diag-m1',
    'If f(x) = 2x² − 5x + 3 and g(x) = x² + 4x − 1, for how many real values of x does f(x) = g(x)?',
    [
      ['A', 'Zero'],
      ['B', 'One'],
      ['C', 'Two'],
      ['D', 'Infinitely many'],
    ],
    'C',
    {
      topic_name: 'Advanced Math',
      section_name: 'Math',
      official_explanation: 'Set equal: x² − 9x + 4 = 0. Discriminant 81 − 16 = 65 > 0, so two real solutions.',
    },
  ),
  q(
    'diag-m2',
    'A rectangle has length 3 more than twice its width. If its area is 65 square units, what is its perimeter?',
    [
      ['A', '28'],
      ['B', '32'],
      ['C', '34'],
      ['D', '36'],
    ],
    'D',
    {
      topic_name: 'Geometry',
      section_name: 'Math',
      official_explanation: 'Let w = width: w(2w+3) = 65 → 2w² + 3w − 65 = 0 → w = 5. Length = 13. Perimeter = 2(5+13) = 36.',
    },
  ),
  q(
    'diag-m3',
    'The function y = 500(1.08)^t models a population, where t is years. Which statement best interprets 1.08?',
    [
      ['A', 'The population shrinks 8% each year.'],
      ['B', 'The population grows 8% each year.'],
      ['C', 'The population grows by 108 individuals each year.'],
      ['D', 'The initial population is 108.'],
    ],
    'B',
    {
      topic_name: 'Advanced Math',
      section_name: 'Math',
      official_explanation: 'A base of 1.08 = 1 + 0.08, an 8% growth multiplier per period.',
    },
  ),
  q(
    'diag-g1',
    'The committee, after weeks of heated debate, ___ to approve the proposal without further amendments.',
    [
      ['A', 'NO CHANGE (vote)'],
      ['B', 'voted'],
      ['C', 'voting'],
      ['D', 'having voted'],
    ],
    'B',
    {
      topic_name: 'Grammar',
      section_name: 'Writing',
      official_explanation: 'The sentence needs a main verb. "Voted" completes the clause; the original has no predicate.',
    },
  ),
  q(
    'diag-g2',
    'Marine biologists have discovered that some species communicate through patterns of light ___ invisible to the human eye.',
    [
      ['A', 'NO CHANGE (that are)'],
      ['B', 'which is'],
      ['C', 'they are'],
      ['D', 'being'],
    ],
    'A',
    {
      topic_name: 'Grammar',
      section_name: 'Writing',
      official_explanation: 'NO CHANGE is correct: "that are invisible" agrees in number with plural "patterns".',
    },
  ),
  q(
    'diag-g3',
    'Neither the coach nor the players ___ satisfied with the officiating during the final quarter.',
    [
      ['A', 'NO CHANGE (was)'],
      ['B', 'were'],
      ['C', 'has been'],
      ['D', 'being'],
    ],
    'B',
    {
      topic_name: 'Grammar',
      section_name: 'Writing',
      official_explanation: 'With neither/nor, the verb agrees with the nearer subject "players" — plural "were".',
    },
  ),
  q(
    'diag-g4',
    'Having finished the experiment early, ___ published ahead of schedule.',
    [
      ['A', 'NO CHANGE (the results were)'],
      ['B', 'the team published the results'],
      ['C', 'publication of the results was'],
      ['D', 'the results publishing'],
    ],
    'B',
    {
      topic_name: 'Grammar',
      section_name: 'Writing',
      official_explanation: 'Fixes the dangling modifier: the team — not the results — finished the experiment.',
    },
  ),
]

/** Spec: 0 correct = 400, 10 correct = 1600, each correct = +120. */
export function diagnosticSatScore(correctCount: number): number {
  const clamped = Math.max(0, Math.min(10, Math.round(correctCount)))
  return 400 + clamped * 120
}

/**
 * Approximate SAT -> ACT concordance for the diagnostic result screen.
 * Aligned to widely published concordance bands.
 */
export function satToAct(sat: number): number {
  const s = Math.max(400, Math.min(1600, Math.round(sat / 10) * 10))
  if (s >= 1580) return 36
  if (s >= 1550) return 35
  if (s >= 1520) return 34
  if (s >= 1490) return 33
  if (s >= 1460) return 32
  if (s >= 1430) return 31
  if (s >= 1400) return 30
  if (s >= 1370) return 29
  if (s >= 1340) return 28
  if (s >= 1310) return 27
  if (s >= 1280) return 26
  if (s >= 1250) return 25
  if (s >= 1220) return 24
  if (s >= 1190) return 23
  if (s >= 1160) return 22
  if (s >= 1130) return 21
  if (s >= 1100) return 20
  if (s >= 1070) return 19
  if (s >= 1040) return 18
  if (s >= 1010) return 17
  if (s >= 970) return 16
  if (s >= 930) return 15
  if (s >= 890) return 14
  if (s >= 850) return 13
  if (s >= 810) return 12
  if (s >= 760) return 11
  return 10
}

export const SAT_ACT_DIFFERENCES = [
  'SAT: 400–1600 total, two sections (Reading & Writing, Math). More time per question, strong algebra focus, no Science section.',
  'ACT: 1–36 composite, four sections (English, Math, Reading, Science). Faster pace, broader math including trig, plus a Science reasoning section.',
  'Rule of thumb: pick SAT if you like time to think and algebra; pick ACT if you work fast and like straightforward questions.',
]
