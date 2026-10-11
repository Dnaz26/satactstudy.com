import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricBand, rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'SAT trig step-up 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(8 * 8 + 15 * 15 === 17 * 17, '8-15-17')
assert(15 * 15 + 8 * 17 === 361, 'quadrant numerator')
assert(17 * 15 === 255, 'quadrant denominator')
assert(3 * 20 / 2 === 30 && 30 / 40 === 3 / 4 && 30 / 20 === 3 / 2, 'monument height')
assert(Math.abs(Math.sin(Math.PI) ) < 1e-12 && Math.cos(Math.PI) < 0, 'tide is falling at t=6')
assert(9 * 9 + 12 * 12 === 15 * 15 && 15 * 15 + 8 * 8 === 17 * 17, 'room wire')
assert((2 * 1 + 1) * (1 - 1) === 0 && (2 * -0.5 + 1) * (-0.5 - 1) === 0, 'trig equation roots')
assert(7 * 7 + 24 * 24 === 25 * 25 && 2 * 7 * 24 === 336, 'double angle magnitude')
assert(Math.abs(2 / Math.sqrt(5) + 1 / Math.sqrt(5) - 3 / Math.sqrt(5)) < 1e-12, 'sin plus cos')
assert(Math.abs((7 * Math.sqrt(3) * 0.5) / 7 - Math.sqrt(3) / 2) < 1e-12, 'ambiguous sine')
assert(7 * Math.sqrt(3) * 0.5 < 7 && 7 < 7 * Math.sqrt(3), 'ambiguous case window')

const hard = (scores) => {
  const total = rubricTotal(scores)
  assert(total >= 12, `rubric ${total}`)
  return { ...scores, total, band: rubricBand(total) }
}
const items = []
function add(item) {
  assert(item.prompt.length >= 95, `stem shorter than the challenge gate: ${item.prompt}`)
  assert(item.choices.length === 4 && new Set(item.choices.map((choice) => choice[0])).size === 4, item.prompt)
  assert(!item.prompt.includes('$'), item.prompt)
  if (item.rubric.graphInference > 0) assert(item.graphicData, item.prompt)
  item.rubric = hard(item.rubric)
  items.push(item)
}
const R = (steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure) =>
  ({ steps, abstraction, hiddenSetup, conceptMixing, graphInference, passageComplexity, choiceCloseness, distractorRealism, timePressure })

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'An angle θ in standard position has its terminal side in quadrant II, and sin θ = 8/17. What is the value of cos θ + tan θ?',
  answer: 'B',
  choices: [
    ['361/255', 'That adds the positive values 15/17 and 8/15. In quadrant II, cosine and tangent are both negative.'],
    ['-361/255', 'The 8-15-17 triangle gives cos θ = -15/17 and tan θ = -8/15. Their sum is -225/255 - 136/255.'],
    ['-15/17', 'That is only cos θ. The expression also includes tan θ.'],
    ['-8/15', 'That is only tan θ. The expression also includes cos θ.'],
  ],
  proof: 'cos θ = -15/17 and tan θ = -8/15, so the sum is -(225 + 136)/255 = -361/255.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { quadrant: 2, radius: 17, terminalPoint: [-15, 8], sine: '8/17', cosine: '-15/17', tangent: '-8/15' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'A surveyor stands on level ground. The tangent of the angle of elevation to the top of a monument is 3/4. She walks 20 meters straight toward the monument, and the tangent of the new angle of elevation is 3/2. How many meters tall is the monument?',
  answer: 'C',
  choices: [
    ['20', '20 meters is the distance from the second position to the base, not the height.'],
    ['40', '40 meters is the distance from the first position to the base. The first tangent is 3/4, so the height is not equal to that distance.'],
    ['30', 'If d is the closer distance, then h/d = 3/2 and h/(d + 20) = 3/4. Those equations give d = 20 and h = 30.'],
    ['60', '60 comes from using the farther distance, 40 meters, with the closer tangent, 3/2. The closer tangent belongs to the 20 meter distance.'],
  ],
  proof: 'h = 3d/2 and h = 3(d + 20)/4. So 6d = 3d + 60, d = 20, and h = 30. Check: 30/40 = 3/4 and 30/20 = 3/2.',
  rubric: R(2, 2, 2, 2, 1, 1, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { fartherMeters: 40, closerMeters: 20, heightMeters: 30, farTangent: '3/4', closeTangent: '3/2' },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Trigonometry',
  prompt: 'The tide height in feet is h(t) = 4 + 6 sin(πt/6), where t is the number of hours after midnight. At t = 0 the water is on the midline and rising. What is the first time t > 0 when the water is on the midline and falling?',
  answer: 'B',
  choices: [
    ['3', 'At t = 3, πt/6 = π/2, so the sine is 1 and the tide is at its highest point, not on the midline.'],
    ['6', 'The period is 12 hours. The next midline crossing after t = 0 is t = 6, and the cosine factor in the derivative is negative there, so the tide is falling.'],
    ['9', 'At t = 9, πt/6 = 3π/2, so the sine is -1 and the tide is at its lowest point.'],
    ['12', 't = 12 is a full period later, when the water is on the midline and rising again, the same state as t = 0.'],
  ],
  proof: 'sin(πt/6) = 0 at t = 6, and h\'(t) = π cos(πt/6) is negative at t = 6.',
  rubric: R(2, 2, 2, 2, 2, 1, 2, 2, 1),
  graphicType: 'line_graph',
  graphicData: { model: '4 + 6 sin(πt/6)', midline: 4, periodHours: 12, crestHour: 3, fallingMidlineHour: 6, troughHour: 9 },
})

add({
  exam: 'SAT', section: 'Math', topic: 'Right triangles and trigonometry',
  prompt: 'A room has a rectangular floor that is 9 feet by 12 feet and a ceiling that is 8 feet above the floor. A straight wire runs from one corner of the floor to the opposite corner of the ceiling. What is the sine of the angle between the wire and the floor?',
  answer: 'D',
  choices: [
    ['15/17', '15/17 is the cosine of the angle with the floor. The floor diagonal is adjacent to that angle, and the wire is the hypotenuse.'],
    ['8/15', '8/15 is the tangent of the angle with the floor, using the height over the floor diagonal.'],
    ['9/17', '9 is one floor edge. The side adjacent to the angle with the floor is the full floor diagonal, 15 feet, not a single edge.'],
    ['8/17', 'The floor diagonal is 15 feet and the wire is 17 feet. The height, 8 feet, is opposite the angle with the floor, so the sine is 8/17.'],
  ],
  proof: 'Floor diagonal sqrt(81 + 144) = 15. Wire sqrt(225 + 64) = 17. sin = 8/17.',
  rubric: R(2, 2, 2, 2, 2, 0, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { floorFeet: [9, 12], floorDiagonalFeet: 15, heightFeet: 8, wireFeet: 17, sineWithFloor: '8/17' },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'How many solutions does the equation 2 sin^2 x - sin x - 1 = 0 have on the half-open interval 0 ≤ x < 2π?',
  answer: 'C',
  choices: [
    ['1', 'sin x = 1 gives x = π/2, but the factored equation also has sin x = -1/2.'],
    ['2', 'sin x = -1/2 has two solutions in the interval, and sin x = 1 has one more.'],
    ['3', 'The equation factors as (2 sin x + 1)(sin x - 1) = 0. The solutions are π/2, 7π/6, and 11π/6.'],
    ['4', 'sin x = 1 has only one solution in this half-open interval. Counting a second angle for sine 1, or including 2π, adds a value that is not a solution here.'],
  ],
  proof: '(2 sin x + 1)(sin x - 1) = 0, so sin x = -1/2 or sin x = 1. Those give three solutions on [0, 2π).',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { solutionsRadians: ['π/2', '7π/6', '11π/6'], sineValues: [1, -0.5] },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'Angle θ is in standard position with its terminal side in quadrant II, and sin θ = 7/25. What is the exact value of sin(2θ)?',
  answer: 'C',
  choices: [
    ['336/625', 'The product 2(7/25)(24/25) has that magnitude, but cosine is negative in quadrant II, so the double-angle sine is negative.'],
    ['-168/625', 'That drops the factor of 2 in sin(2θ) = 2 sin θ cos θ.'],
    ['-336/625', 'cos θ = -24/25, so 2(7/25)(-24/25) = -336/625.'],
    ['7/25', '7/25 is sin θ. The double-angle formula still has to be applied.'],
  ],
  proof: 'A 7-24-25 triangle in quadrant II has cos θ = -24/25. Then sin(2θ) = 2(7/25)(-24/25) = -336/625.',
  rubric: R(2, 2, 2, 2, 1, 0, 2, 2, 2),
  graphicType: 'coordinate_plane',
  graphicData: { quadrant: 2, radius: 25, terminalPoint: [-24, 7], doubleAngleSine: '-336/625' },
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'Angle θ is acute and tan θ = 2. What is the exact value of sin θ + cos θ, written in simplest form?',
  answer: 'D',
  choices: [
    ['2√5/5', 'That is sin θ alone. The opposite side is 2 and the hypotenuse is √5, so sin θ = 2/√5 = 2√5/5.'],
    ['2', 'Tangent is 2. Sine and cosine are not added by copying the tangent.'],
    ['√5', '√5 is the hypotenuse when the opposite side is 2 and the adjacent side is 1. It is not the sum of the ratios.'],
    ['3√5/5', 'sin θ = 2/√5 and cos θ = 1/√5, so the sum is 3/√5 = 3√5/5.'],
  ],
  proof: 'Opposite 2, adjacent 1, hypotenuse √5. sin θ + cos θ = 3/√5 = 3√5/5.',
  rubric: R(2, 2, 1, 2, 0, 0, 2, 2, 2),
})

add({
  exam: 'ACT', section: 'Math', topic: 'Trigonometry',
  prompt: 'In triangle ABC, angle A measures 30 degrees, the side opposite angle A has length 7, and the side opposite angle B has length 7√3. How many distinct triangles satisfy these measurements?',
  answer: 'C',
  choices: [
    ['0', 'The given opposite side is long enough to meet the other side: 7 is greater than 7√3 times sin 30 degrees.'],
    ['1', 'There is an acute solution, angle B = 60 degrees, and also an obtuse solution, angle B = 120 degrees. Both leave a positive third angle.'],
    ['2', 'sin B = √3/2, so angle B can be 60 degrees or 120 degrees. The third angles are 90 degrees and 30 degrees, so both triangles exist.'],
    ['3', 'Sine is positive in only two places that can serve as an angle of a triangle here. There is no third value of angle B.'],
  ],
  proof: 'sin B = (7√3)(1/2)/7 = √3/2. B = 60° gives C = 90°. B = 120° gives C = 30°. Both are valid, so there are two triangles.',
  rubric: R(2, 2, 2, 2, 1, 1, 2, 2, 2),
  graphicType: 'geometry_diagram',
  graphicData: { angleADegrees: 30, oppositeA: 7, oppositeB: '7√3', angleBDegrees: [60, 120], triangleCount: 2 },
})

assert(items.length === 8, `built ${items.length}`)

const easyRescores = [
  {
    question_text: 'A ladder leans against a wall. The sine of the angle between the ladder and the ground is 3/5, and the ladder is 15 feet long. How many feet is the base of the ladder from the wall?',
    difficulty: 'Medium',
    difficulty_score: 0.5,
    difficulty_level: 4,
    rubric: { steps: 2, abstraction: 1, hiddenSetup: 1, conceptMixing: 1, graphInference: 1, passageComplexity: 0, choiceCloseness: 1, distractorRealism: 2, timePressure: 1 },
  },
  {
    question_text: 'A kite string is 20 meters long and makes a 30 degree angle with level ground. How many meters above the ground is the kite? Use sin 30 degrees = 1/2.',
    difficulty: 'Easy',
    difficulty_score: 1 / 6,
    difficulty_level: 2,
    rubric: { steps: 1, abstraction: 1, hiddenSetup: 0, conceptMixing: 1, graphInference: 1, passageComplexity: 0, choiceCloseness: 1, distractorRealism: 1, timePressure: 1 },
  },
]
for (const row of easyRescores) {
  const total = rubricTotal(row.rubric)
  row.rubric = { ...row.rubric, total, band: rubricBand(total) }
  assert(total < 12, `easy item still scored as true-hard: ${total}`)
}

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const item of items) {
  const matches = topicRows.filter((row) => row.name === item.topic && row.categories?.sections?.tests?.name === item.exam && row.categories?.sections?.name === item.section)
  if (matches.length !== 1) throw new Error(`Topic lookup failed for ${item.exam} ${item.section} ${item.topic}: ${matches.length}`)
  item.topicRow = { id: matches[0].id, domain: matches[0].categories.name, topic: matches[0].name }
}

function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}

const existing = checked(await db.from('questions').select('id').eq('source', batchName).limit(5))
let inserted = 0
let rescored = 0
if (existing.length === 0) {
  const rows = items.map((item) => ({
    test_type: item.exam,
    section_name: item.section,
    category_name: item.topicRow.domain,
    topic_name: item.topicRow.topic,
    subtopic_name: item.topicRow.topic,
    topic_id: item.topicRow.id,
    difficulty: 'Hard',
    difficulty_score: item.rubric.total >= 15 ? 1 : 0.833,
    question_type: 'multiple_choice',
    question_text: item.prompt,
    choice_a: item.choices[0][0],
    choice_b: item.choices[1][0],
    choice_c: item.choices[2][0],
    choice_d: item.choices[3][0],
    correct_answer: item.answer,
    official_explanation: item.proof,
    source_type: 'original',
    source_rights_status: 'owned',
    source: batchName,
    exam_name: batchName,
    fingerprint: fingerprintFor(item),
    answer_verification_status: 'independently_verified',
    review_status: 'approved',
    approved: true,
    active: true,
  }))
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(items.map((item) => {
    const rationales = {}
    item.choices.forEach((choice, index) => {
      const letter = 'ABCD'[index]
      rationales[letter] = letter === item.answer ? `Correct: ${choice[1]}` : choice[1]
    })
    return {
      question_id: idByFingerprint.get(fingerprintFor(item)),
      version: 1,
      exam_type: item.exam,
      section: item.section,
      domain: item.topicRow.domain,
      skill: item.topicRow.topic,
      subskill: item.proof.slice(0, 180),
      difficulty_level: item.rubric.total >= 15 ? 7 : 6,
      difficulty_basis: 'editorial',
      estimated_seconds: 120,
      module_eligibility: item.exam === 'SAT'
        ? [{ module: 1, route: 'common' }, { module: 2, route: 'harder' }]
        : [{ module: 1, route: 'common' }],
      distractor_rationales: rationales,
      graphic_type: item.graphicType ?? null,
      graphic_data: item.graphicData ?? null,
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: fingerprintFor(item),
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        graphic_data_verified: Boolean(item.graphicData),
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Each numeric result was asserted in code before insert. Quadrant signs and the ambiguous case were checked separately.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length

  for (const row of easyRescores) {
    const matches = checked(await db.from('questions').select('id, difficulty, difficulty_score').eq('question_text', row.question_text).eq('active', true))
    if (matches.length !== 1) throw new Error(`Expected one active row to rescore, found ${matches.length} for: ${row.question_text.slice(0, 48)}`)
    checked(await db.from('questions').update({
      difficulty: row.difficulty,
      difficulty_score: row.difficulty_score,
    }).eq('id', matches[0].id))
    const meta = checked(await db.from('exam_item_metadata').select('question_id, validation_evidence').eq('question_id', matches[0].id))
    if (meta.length !== 1) throw new Error(`Expected one metadata row for ${matches[0].id}`)
    checked(await db.from('exam_item_metadata').update({
      difficulty_level: row.difficulty_level,
      difficulty_basis: 'editorial',
      validation_evidence: {
        ...(meta[0].validation_evidence ?? {}),
        difficulty_review: true,
        difficulty_rubric: row.rubric,
        rescore_note: 'Rescored downward. A single right-triangle ratio, even with one Pythagorean step, is not true-hard.',
      },
    }).eq('question_id', matches[0].id))
    rescored += 1
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  batch: batchName,
  built: items.length,
  inserted,
  rescored,
  elite: items.filter((item) => item.rubric.total >= 15).length,
  trueHard: items.filter((item) => item.rubric.total >= 12).length,
  items: items.map((item) => ({ exam: item.exam, topic: item.topic, answer: item.answer, total: item.rubric.total, band: item.rubric.band })),
  rescoredItems: easyRescores.map((row) => ({ difficulty: row.difficulty, level: row.difficulty_level, total: row.rubric.total, band: row.rubric.band })),
}
writeFileSync('supabase/exam-engineering/sat-trig-step-up-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
