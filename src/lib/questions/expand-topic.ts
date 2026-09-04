import { randomUUID } from 'crypto'
import { MIN_TOPIC_QUESTIONS } from '@/lib/constants'
import { questionFingerprint } from './fingerprint'

type QueryClient = { from: (table: string) => any }

type Draft = {
  question_text: string
  choice_a: string
  choice_b: string
  choice_c: string
  choice_d: string
  correct_answer: string
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

type TopicMeta = {
  topic_id: string
  topic_name: string
  test_type: string
  section_name: string
  category_name: string
  calculator_allowed: boolean
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const swap = copy[i]
    copy[i] = copy[j]
    copy[j] = swap
  }
  return copy
}

function mc(stem: string, correct: string, wrong: string[], explain: string, difficulty: Draft['difficulty']): Draft {
  const extras = shuffle(wrong).slice(0, 3)
  const choices = shuffle([correct, ...extras])
  const letters = ['A', 'B', 'C', 'D'] as const
  const mapped = {
    choice_a: choices[0] ?? correct,
    choice_b: choices[1] ?? extras[0] ?? '0',
    choice_c: choices[2] ?? extras[1] ?? '1',
    choice_d: choices[3] ?? extras[2] ?? '2',
  }
  const index = choices.indexOf(correct)
  return {
    question_text: stem,
    ...mapped,
    correct_answer: letters[index >= 0 ? index : 0],
    explanation: explain,
    difficulty,
  }
}

function diffs(i: number): Draft['difficulty'] {
  return i % 3 === 0 ? 'Easy' : i % 3 === 1 ? 'Medium' : 'Hard'
}

function mathDrafts(name: string, need: number): Draft[] {
  const key = name.toLowerCase()
  const out: Draft[] = []
  for (let i = 0; i < need + 8 && out.length < need; i++) {
    const a = 2 + ((i * 3) % 11)
    const b = 3 + ((i * 5) % 13)
    const c = 1 + ((i * 7) % 9)
    const x = 2 + (i % 8)
    const d = diffs(i)
    if (/inequal/.test(key)) {
      out.push(mc(
        `Solve ${a}x + ${b} > ${a * x + b - 2}.`,
        `x > ${x - 1}`,
        [`x < ${x - 1}`, `x > ${x + 2}`, `x ≥ ${x + 4}`],
        `Subtract ${b}, then divide by ${a}. The inequality direction stays the same.`,
        d,
      ))
    } else if (/system/.test(key)) {
      const y = a + x
      out.push(mc(
        `Solve the system: x + y = ${x + y} and x − y = ${x - y}. What is x?`,
        String(x),
        [String(y), String(x + y), String(x - 1)],
        `Add the equations to get 2x = ${2 * x}, so x = ${x}.`,
        d,
      ))
    } else if (/quadratic|nonlinear|polynomial/.test(key)) {
      out.push(mc(
        `The equation x² − ${x + a}x + ${x * a} = 0 has solutions x = ${x} and x = ${a}. What is the product of the solutions?`,
        String(x * a),
        [String(x + a), String(x - a), String(a)],
        `For x² − (sum)x + product = 0, the constant term is the product ${x}·${a} = ${x * a}.`,
        d,
      ))
    } else if (/percent/.test(key)) {
      const base = 40 + i * 5
      const p = 10 + (i % 5) * 5
      out.push(mc(
        `What is ${p}% of ${base}?`,
        String((base * p) / 100),
        [String(base - p), String(base + p), String((base * p) / 10)],
        `${p}% means ${p}/100, so (${p}/100)×${base} = ${(base * p) / 100}.`,
        d,
      ))
    } else if (/ratio|proportion/.test(key)) {
      out.push(mc(
        `If ${a}:${b} = x:${b * x}, what is x?`,
        String(a * x),
        [String(b * x), String(a), String(a + b)],
        `Cross-multiply: ${a}·${b * x} = ${b}·x, so x = ${a * x}.`,
        d,
      ))
    } else if (/slope|rate|linear function/.test(key)) {
      const slope = a
      out.push(mc(
        `A line through (0, ${b}) and (${c}, ${b + slope * c}) has slope`,
        String(slope),
        [String(b), String(c), String(slope + 1)],
        `Slope is rise/run = ${slope * c}/${c} = ${slope}.`,
        d,
      ))
    } else if (/circle/.test(key)) {
      out.push(mc(
        `A circle has radius ${a}. What is its area?`,
        `${a * a}π`,
        [`${2 * a}π`, `${a}π`, String(a * a)],
        `Area = πr² = π·${a}² = ${a * a}π.`,
        d,
      ))
    } else if (/triangle|angle/.test(key)) {
      out.push(mc(
        `Two angles of a triangle are ${a * 10}° and ${b * 10}°. What is the third angle?`,
        `${180 - 10 * (a + b)}°`,
        [`${10 * (a + b)}°`, `${90 - a}°`, `${a * b}°`],
        `Triangle angles sum to 180°, so 180 − ${10 * a} − ${10 * b} = ${180 - 10 * (a + b)}.`,
        d,
      ))
    } else if (/area|volume/.test(key)) {
      out.push(mc(
        `A rectangular box is ${a} by ${b} by ${c}. What is its volume?`,
        String(a * b * c),
        [String(a * b), String(2 * (a + b + c)), String(a + b + c)],
        `Volume = length × width × height = ${a}×${b}×${c} = ${a * b * c}.`,
        d,
      ))
    } else if (/trig/.test(key)) {
      out.push(mc(
        `In a right triangle, opposite = ${3 + (i % 4)} and hypotenuse = ${5 + (i % 3)}. Which expression is sin θ?`,
        `${3 + (i % 4)}/${5 + (i % 3)}`,
        [`${5 + (i % 3)}/${3 + (i % 4)}`, `${3 + (i % 4)}/${4 + (i % 3)}`, String(3 + (i % 4))],
        `sin θ = opposite / hypotenuse.`,
        d,
      ))
    } else if (/probab/.test(key)) {
      out.push(mc(
        `A bag has ${a} red and ${b} blue chips. One chip is drawn. What is P(red)?`,
        `${a}/${a + b}`,
        [`${b}/${a + b}`, `${a}/${b}`, `${b}/${a}`],
        `Favorable over total: ${a}/${a + b}.`,
        d,
      ))
    } else if (/stat|data|mean|median/.test(key)) {
      const vals = [a, b, c, a + 1, b + 2]
      const mean = vals.reduce((s, n) => s + n, 0) / vals.length
      out.push(mc(
        `What is the mean of ${vals.join(', ')}?`,
        String(mean),
        [String(vals[2]), String(vals[0]), String(a + b)],
        `Add the five numbers and divide by 5.`,
        d,
      ))
    } else if (/exponent|radical/.test(key)) {
      out.push(mc(
        `Simplify ${a}² · ${a}³.`,
        `${a}^5`,
        [`${a}^6`, `${2 * a}^5`, String(a * 5)],
        `Add exponents when multiplying the same base: 2 + 3 = 5.`,
        d,
      ))
    } else if (/function/.test(key)) {
      out.push(mc(
        `If f(x) = ${a}x + ${b}, what is f(${c})?`,
        String(a * c + b),
        [String(a + b + c), String(a * c), String(b * c)],
        `Replace x with ${c}: ${a}(${c}) + ${b} = ${a * c + b}.`,
        d,
      ))
    } else if (/integer|number|rational/.test(key)) {
      out.push(mc(
        `Which number is a multiple of ${a} but not of ${a + 1}?`,
        String(a * (i + 2)),
        [String((a + 1) * (i + 2)), String(a + 1), String((a + 1) * a)],
        `${a} × ${i + 2} = ${a * (i + 2)}, and that product is not a multiple of ${a + 1}.`,
        d,
      ))
    } else if (/unit|conversion/.test(key)) {
      out.push(mc(
        `${c} feet equals how many inches?`,
        String(c * 12),
        [String(c * 10), String(c * 3), String(c + 12)],
        `1 foot = 12 inches, so ${c} × 12 = ${c * 12}.`,
        d,
      ))
    } else if (/coordinate/.test(key)) {
      out.push(mc(
        `What is the midpoint of (${a}, ${b}) and (${a + 2 * c}, ${b + 2})?`,
        `(${a + c}, ${b + 1})`,
        [`(${a}, ${b})`, `(${c}, ${b})`, `(${a + 2 * c}, ${b + 2})`],
        `Average the x-values and the y-values.`,
        d,
      ))
    } else {
      out.push(mc(
        `Solve ${a}x + ${b} = ${a * x + b}. What is x?`,
        String(x),
        [String(a), String(b), String(x + 1)],
        `Subtract ${b} from both sides, then divide by ${a}. x = ${x}.`,
        d,
      ))
    }
  }
  return out.slice(0, need).map((draft, index) => ({
    ...draft,
    question_text: `Topic fill ${index + 1}. ${draft.question_text}`,
  }))
}

function verbalDrafts(name: string, need: number): Draft[] {
  const key = name.toLowerCase()
  const out: Draft[] = []
  const notes = [
    'After a dry week, the gardeners weighed basil grown under three watering rules.',
    'Riders said dark stops felt costlier than a longer walk, then ridership recovered after lamps.',
    'Site 3 was coldest at noon, and its mayfly counts were the lowest of the three sites.',
    'Memo A wants lights first. Memo B wants a staffed dusk walk plus lights.',
  ]
  for (let i = 0; i < need + 6 && out.length < need; i++) {
    const note = notes[i % notes.length]
    const d = diffs(i)
    if (/main idea|topic development/.test(key)) {
      out.push(mc(
        `What is the main idea?\n\n${note}`,
        'The note reports a specific result from a small study or map change.',
        ['The author wants to cancel all transit', 'The note lists every plant species', 'The river was drained last year', 'Staff deleted the comments'],
        'Stay with what the sentences actually establish.',
        d,
      ))
    } else if (/evidence|detail/.test(key)) {
      out.push(mc(
        `Which detail is directly stated?\n\n${note}`,
        note.includes('basil') ? 'Gardeners weighed basil after a dry week.' : note.includes('ridership') ? 'Ridership recovered after lamps.' : note.includes('mayfly') ? 'Site 3 had the lowest mayfly counts.' : 'Memo B wants a staffed dusk walk.',
        ['The trial lasted one year', 'Fares were free', 'Site 3 was warmest', 'Lights were removed'],
        'Pick the line that appears in the note, not a guess.',
        d,
      ))
    } else if (/infer/.test(key)) {
      out.push(mc(
        `It can reasonably be inferred that\n\n${note}`,
        'The writer thinks the measured change mattered.',
        ['No one collected data', 'The author rejects all lighting', 'The sites were identical', 'The gardeners hid the masses'],
        'Inference has to follow the evidence, not invent a new story.',
        d,
      ))
    } else if (/word|vocab|context/.test(key)) {
      out.push(mc(
        `In this note, recovered most nearly means\n\n${note}`,
        'moved back toward an earlier level',
        ['was invented', 'was painted', 'was fined', 'was renamed'],
        'Context is a drop, then a return.',
        d,
      ))
    } else if (/purpose|author/.test(key)) {
      out.push(mc(
        `The author mainly wants to\n\n${note}`,
        'report what the evidence showed',
        ['sell lamps', 'attack riders', 'list every stop', 'cancel the path'],
        'Purpose follows the evidence, not a sales pitch.',
        d,
      ))
    } else if (/transition|organization|structure|flow/.test(key)) {
      out.push(mc(
        'Which transition best joins a result to a takeaway?',
        'Therefore the sensor group grew the most mass.',
        ['Meanwhile the sensor group grew the most mass.', 'For example the sensor group grew the most mass.', 'In contrast the sensor group grew the most mass.'],
        'Therefore marks a conclusion earned by the data.',
        d,
      ))
    } else if (/punctuation|boundar/.test(key)) {
      out.push(mc(
        'Which sentence is punctuated correctly?',
        'After a warm week, researchers counted mayflies at three sites.',
        ['After a warm week researchers, counted mayflies at three sites.', 'After a warm week; researchers counted mayflies at three sites.', 'After, a warm week researchers counted mayflies at three sites.'],
        'An introductory phrase takes a comma.',
        d,
      ))
    } else if (/agreement|usage|grammar/.test(key)) {
      out.push(mc(
        'Which sentence is grammatically correct?',
        'Neither site has a count above 50.',
        ['Neither site have a count above 50.', 'Neither site having a count above 50.', 'Neither site are a count above 50.'],
        'Neither takes a singular verb.',
        d,
      ))
    } else if (/pronoun/.test(key)) {
      out.push(mc(
        'Which sentence uses a clear pronoun?',
        'When the riders asked for lamps, the agency installed them.',
        ['When they asked for them, they installed them.', 'When the riders asked for lamps, it installed them.', 'When the riders asked for lamps, those installed them.'],
        'Name the noun before the pronoun, and keep the number clear.',
        d,
      ))
    } else if (/tense|verb/.test(key)) {
      out.push(mc(
        'Which sentence uses verb tense correctly?',
        'If the soil drops below 20 percent, the sensor group is watered.',
        ['If the soil drops below 20 percent, the sensor group watered.', 'If the soil drops below 20 percent, the sensor group watering.', 'If the soil drops below 20 percent, the sensor group have watered.'],
        'Keep a complete verb that matches the timeline.',
        d,
      ))
    } else if (/modifier/.test(key)) {
      out.push(mc(
        'Which sentence places the modifier on the right noun?',
        'Walking at dusk, riders asked for lamps.',
        ['Walking at dusk, lamps were asked for by riders.', 'Walking at dusk, the path asked for lamps.', 'Walking at dusk, comments asked lamps.'],
        'The opening phrase must attach to the people actually walking.',
        d,
      ))
    } else if (/parallel/.test(key)) {
      out.push(mc(
        'Which sentence is parallel?',
        'Gardeners borrow, grow, and return seeds.',
        ['Gardeners borrow, growing, and return seeds.', 'Gardeners borrow, grow, and returning seeds.', 'Gardeners borrow, to grow, and return seeds.'],
        'Listed verbs should share the same form.',
        d,
      ))
    } else if (/concis|style|tone|clarity/.test(key)) {
      out.push(mc(
        'Which sentence is the most concise without losing the meaning?',
        'The sensor group grew the most mass.',
        ['The sensor group grew the most mass, which was the most.', 'The group with sensors grew the most mass in terms of mass.', 'The sensor group grew the most mass, being the most mass.'],
        'Cut empty phrases that repeat the same idea.',
        d,
      ))
    } else if (/sentence/.test(key)) {
      out.push(mc(
        'Which choice avoids a run-on?',
        'Site 3 was coldest. Its counts were also lowest.',
        ['Site 3 was coldest its counts were also lowest.', 'Site 3 was coldest, its counts were also lowest.', 'Site 3 was coldest its, counts were also lowest.'],
        'Two independent clauses need a legal join.',
        d,
      ))
    } else if (/experiment|scientific|design/.test(key)) {
      out.push(mc(
        `What was the independent variable in this note?\n\n${note}`,
        note.includes('basil') ? 'the watering rule' : 'the lighting or staffing choice under study',
        ['the author\'s name', 'the greenhouse building', 'the year the river formed'],
        'The independent variable is the rule the researchers set.',
        d,
      ))
    } else if (/graph|trend|data/.test(key)) {
      out.push(mc(
        `Which trend does the note support?\n\n${note}`,
        'The measured condition tracked with the reported outcome.',
        ['No numbers were collected', 'Every site matched exactly', 'The author rejected the table'],
        'Stay inside the note. Do not import outside facts.',
        d,
      ))
    } else if (/viewpoint|compar/.test(key)) {
      out.push(mc(
        `The two memos disagree mainly about\n\n${note}`,
        'what to do first to get more path use',
        ['whether the path exists', 'whether dusk happens', 'whether rivers can have paths'],
        'Both want more use; they differ on the first fix.',
        d,
      ))
    } else {
      out.push(mc(
        `Which sentence best matches the note?\n\n${note}`,
        'The writer reports a measured change and what it suggests.',
        ['The writer invents a joke instead of data', 'The writer deletes the result', 'The writer claims the river vanished'],
        'Match the sentence to the evidence in the note.',
        d,
      ))
    }
  }
  return out.slice(0, need).map((draft, index) => ({
    ...draft,
    question_text: `Topic fill ${index + 1}. ${draft.question_text}`,
  }))
}

function draftsFor(meta: TopicMeta, need: number): Draft[] {
  const name = `${meta.topic_name} ${meta.section_name} ${meta.category_name}`
  if (meta.calculator_allowed || /math|algebra|geometry|number|function|stat|trig/i.test(name)) {
    const math = mathDrafts(name, need)
    if (math.length >= need) return math
    return [...math, ...verbalDrafts(name, need - math.length)]
  }
  return verbalDrafts(name, need)
}

export async function ensureTopicQuestionCount(
  supabase: QueryClient,
  topicId: string,
  minimum = MIN_TOPIC_QUESTIONS,
): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('topic_id', topicId)
    .eq('approved', true)
    .eq('active', true)

  const have = count ?? 0
  if (have >= minimum) return have

  const { data: sample } = await supabase
    .from('questions')
    .select('test_type, section_name, category_name, topic_name, calculator_allowed')
    .eq('topic_id', topicId)
    .limit(1)
    .maybeSingle()

  const { data: topic } = await supabase
    .from('topics')
    .select('id, name')
    .eq('id', topicId)
    .maybeSingle()

  const meta: TopicMeta = {
    topic_id: topicId,
    topic_name: sample?.topic_name ?? topic?.name ?? 'Topic',
    test_type: sample?.test_type ?? 'SAT',
    section_name: sample?.section_name ?? 'Practice',
    category_name: sample?.category_name ?? 'General',
    calculator_allowed: Boolean(sample?.calculator_allowed),
  }

  const { data: existing } = await supabase
    .from('questions')
    .select('fingerprint')
    .eq('topic_id', topicId)
  const seen = new Set(
    ((existing ?? []) as Array<{ fingerprint?: string | null }>)
      .map((row) => row.fingerprint)
      .filter((value): value is string => Boolean(value)),
  )

  const need = minimum - have
  const rows = draftsFor(meta, need + 6)
    .map((draft) => {
      const fingerprint = questionFingerprint({
        question_text: draft.question_text,
        choice_a: draft.choice_a,
        choice_b: draft.choice_b,
        choice_c: draft.choice_c,
        choice_d: draft.choice_d,
        correct_answer: draft.correct_answer,
      })
      return { draft, fingerprint }
    })
    .filter((row) => {
      if (seen.has(row.fingerprint)) return false
      seen.add(row.fingerprint)
      return true
    })
    .slice(0, need)

  if (!rows.length) return have

  const inserts = rows.map(({ draft, fingerprint }) => ({
    id: randomUUID(),
    topic_id: meta.topic_id,
    test_type: meta.test_type,
    section_name: meta.section_name,
    category_name: meta.category_name,
    topic_name: meta.topic_name,
    difficulty: draft.difficulty,
    difficulty_score: draft.difficulty === 'Easy' ? 0.28 : draft.difficulty === 'Hard' ? 0.76 : 0.52,
    question_text: draft.question_text,
    choice_a: draft.choice_a,
    choice_b: draft.choice_b,
    choice_c: draft.choice_c,
    choice_d: draft.choice_d,
    correct_answer: draft.correct_answer,
    official_explanation: draft.explanation,
    source_type: 'original_derived_reference',
    source_rights_status: 'owned',
    source: 'StudentQuest original (skills from official exam structure, not wording)',
    question_type: 'multiple_choice',
    answer_verification_status: 'authored',
    review_status: 'approved',
    approved: true,
    active: true,
    fingerprint,
    calculator_allowed: meta.calculator_allowed,
    exam_name: 'StudentQuest scheduled topic bank',
  }))

  await supabase.from('questions').insert(inserts)
  await supabase.from('question_topic_mappings').insert(
    inserts.map((row) => ({
      question_id: row.id,
      topic_id: topicId,
      relationship: 'primary',
      weight: 1,
      confidence: 1,
    })),
  )

  return have + inserts.length
}
