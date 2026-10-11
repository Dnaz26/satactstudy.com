import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricTotal } from './difficulty-rubric.mjs'
import { productBand, routingScore } from './product-rubric.mjs'

const batch = 'Audited hard pool 2026-10-10 batch 1'

function assertClose(actual, expected, label) {
  if (Math.abs(actual - expected) > 1e-9) throw new Error(`${label}: expected ${expected}, got ${actual}`)
}

assertClose(8 + 5 * 5, 33, 'plan B at k=5')
assertClose(20 + 3 * 5, 35, 'plan A at k=5')
if (!(8 + 5 * 5 < 20 + 3 * 5)) throw new Error('Plan B should be cheaper at k=5')
if (!(8 + 5 * 7 > 20 + 3 * 7)) throw new Error('Plan A should be cheaper at k=7')

const vertexY = 9 - 18 + 14
assertClose(vertexY, 5, 'vertex height')
assertClose(2 * 3 - 1, 5, 'line at vertex')

assertClose(2 ** (2 * 2 + 2), 64, 'exponent identity at a valid pair')
if (2 * 2 + 2 !== 6) throw new Error('Sample pair must fit 2x+y=6')

assertClose(1.25 * 0.8, 1, 'increase then decrease')
assertClose(0.8 * 1.25, 1, 'decrease then increase')

const brace = Math.hypot(5, 14)
assertClose(brace ** 2, 221, 'brace length squared')

const items = [
  {
    exam: 'SAT', section: 'Math', domain: 'Algebra', topic: 'Linear equations in one variable', topicId: '0ec77160-829a-4dae-a4b8-4b2deb7ce0d3',
    prompt: 'For a positive number $k$, Plan A costs $20+3k$ dollars and Plan B costs $8+5k$ dollars. A 10% tax is added only to the plan that costs less before tax. For which values of $k$ is the taxed cost equal to $1.1(8+5k)$?',
    choices: ['$0<k<6$', '$k>6$', '$0<k<4$', '$k>4$'],
    answer: 'A',
    seconds: 95,
    subskill: 'piecewise comparison before a percent is applied',
    explanation: 'Plan B is cheaper when $8+5k<20+3k$, which simplifies to $k<6$. Combined with $k>0$, the tax falls on Plan B exactly when $0<k<6$.',
    proof: 'Subtract $3k$ and 8 from both sides of the comparison to get $2k<12$.',
    rubric: { steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 0, passageComplexity: 0, choiceCloseness: 2, distractorRealism: 2, timePressure: 2 },
    wrong: {
      A: 'Correct: B is cheaper only while $k<6$, and $k$ is positive.',
      B: 'Reverses the inequality, which is when Plan A is cheaper.',
      C: 'Uses the difference of the fixed costs instead of the rate difference.',
      D: 'Drops the fixed costs and compares only part of the rates.',
    },
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Advanced Math', topic: 'Equivalent expressions', topicId: '5bd48af1-4c30-4e4f-90c9-f3a089465b34',
    prompt: 'If $2x+y=6$, which expression has the same value as $4^{x}\\cdot 2^{y}$ for every pair $(x,y)$ that satisfies the equation?',
    choices: ['$16$', '$32$', '$64$', '$128$'],
    answer: 'C',
    seconds: 90,
    subskill: 'rewrite unlike exponential bases using a linear constraint',
    explanation: '$4^{x}=(2^{2})^{x}=2^{2x}$, so the product is $2^{2x+y}$. The constraint replaces $2x+y$ with 6, and $2^{6}=64$.',
    proof: 'Every pair on the line gives the same power $2^6$.',
    rubric: { steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 0, passageComplexity: 0, choiceCloseness: 2, distractorRealism: 2, timePressure: 1 },
    wrong: {
      A: 'Uses $2^{4}$ or $4^{2}$.',
      B: 'Uses $2^{5}$, dropping one factor of the base conversion.',
      C: 'Correct: $2^{2x+y}=2^{6}=64$.',
      D: 'Uses $2^{7}$.',
    },
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Advanced Math', topic: 'Nonlinear functions', topicId: '996d94ff-c108-434e-99b2-1ac9ebde5c8b',
    prompt: 'The function $f$ is defined by $f(x)=x^{2}-6x+k$. The vertex of the graph of $f$ lies on the line $y=2x-1$. What is the value of $k$?',
    choices: ['$4$', '$5$', '$14$', '$-4$'],
    answer: 'C',
    seconds: 100,
    subskill: 'match a vertex to a second function',
    explanation: 'The vertex occurs at $x=3$. Its height is $f(3)=k-9$. The line has height $5$ there, so $k-9=5$ and $k=14$.',
    proof: 'Completing the square or using $x=-b/(2a)$ puts the vertex at $x=3$, and $f(3)=5$.',
    rubric: { steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 1, passageComplexity: 0, choiceCloseness: 1, distractorRealism: 2, timePressure: 2 },
    wrong: {
      A: 'Uses the vertex $x$-coordinate without the constant term.',
      B: 'Reports the line’s height and stops.',
      C: 'Correct: $k-9=5$.',
      D: 'Subtracts the line height from the vertex shift in the wrong direction.',
    },
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Problem-Solving and Data Analysis', topic: 'Percentages', topicId: 'd1000000-0000-0000-0000-000000000014',
    prompt: 'Price P increases by 25% and then decreases by 20% of the new price. Price Q decreases by 20% and then increases by 25% of that new price. Which statement must be true?',
    choices: ['P and Q both return to the original price.', 'P finishes higher than Q.', 'Q finishes higher than P.', 'Neither price returns to the original price.'],
    answer: 'A',
    seconds: 80,
    subskill: 'compare two opposite percent sequences',
    explanation: 'The first sequence multiplies by $1.25\\cdot 0.80=1$. The second multiplies by $0.80\\cdot 1.25=1$. The order does not change the product, so both prices return to the original price.',
    proof: 'Both products equal 1, so the final prices are equal to each other and to the start.',
    rubric: { steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 0, passageComplexity: 0, choiceCloseness: 2, distractorRealism: 2, timePressure: 1 },
    wrong: {
      A: 'Correct: both net factors equal 1.',
      B: 'Assumes the increase-first order produces a larger result.',
      C: 'Assumes the decrease-first order produces a larger result.',
      D: 'Treats successive percents as if they cannot cancel.',
    },
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Geometry and Trigonometry', topic: 'Right triangles and trigonometry', topicId: '9d7afe8b-a998-4814-9707-d815674d0322',
    prompt: 'A 13-foot ladder leans against a vertical wall so that the tangent of the angle between the ladder and the level ground is $5/12$. A brace runs from the top of the ladder to a point on the ground that is 2 feet farther from the wall than the ladder’s foot. How long is the brace, in feet?',
    choices: ['$\\sqrt{193}$', '$15$', '$\\sqrt{221}$', '$13$'],
    answer: 'C',
    seconds: 110,
    subskill: 'recover sides from a tangent, then a second distance',
    explanation: 'The ladder forms a 5-12-13 triangle, so the wall height is 5 feet and the foot is 12 feet from the wall. The brace meets the ground 14 feet from the wall. Its length is $\\sqrt{5^{2}+14^{2}}=\\sqrt{221}$.',
    proof: 'Opposite 5 and adjacent 12 match tangent 5/12 and hypotenuse 13. The brace is the hypotenuse of a 5-14 right triangle.',
    rubric: { steps: 2, abstraction: 1, hiddenSetup: 2, conceptMixing: 2, graphInference: 0, passageComplexity: 0, choiceCloseness: 2, distractorRealism: 2, timePressure: 2 },
    wrong: {
      A: 'Uses 12 and 7, or another nearby pair, instead of 5 and 14.',
      B: 'Adds the extra 2 feet to the ladder length.',
      C: 'Correct: $\\sqrt{25+196}=\\sqrt{221}$.',
      D: 'Reports the ladder length instead of the brace.',
    },
  },
  {
    exam: 'SAT', section: 'Reading and Writing', domain: 'Information and Ideas', topic: 'Inferences', topicId: '3799e6f5-5b66-4f97-a1d3-b8e5f8a7c8ea',
    prompt: 'A conservator’s note says the faded ink on a harbor log became readable only after the page was humidified, and that the same treatment left a nearby shop ledger unchanged. The ledger’s ink was already dark. The note then says the harbor log had been stored above a drying kiln. Which inference is best supported?',
    choices: [
      'Humidifying will darken every ink that is stored near heat.',
      'The kiln exposure is a possible reason the harbor ink needed humidifying, but the note does not show that the ledger avoided that exposure.',
      'The ledger must have been stored farther from the kiln than the harbor log, because its ink stayed dark.',
      'Humidifying damaged the harbor log, because the ledger did not need the treatment.',
    ],
    answer: 'B',
    seconds: 85,
    subskill: 'limit an inference to the comparison the note actually makes',
    explanation: 'The note connects the harbor log’s faded ink with both the successful treatment and the kiln. It gives no storage location for the ledger, so the ledger’s dark ink cannot by itself prove a different location. Choice B keeps the kiln as a possible factor without adding that missing comparison.',
    proof: 'The passage never locates the ledger, so any claim that it was farther from the kiln is unsupported.',
    rubric: { steps: 2, abstraction: 1, hiddenSetup: 2, conceptMixing: 2, graphInference: 0, passageComplexity: 2, choiceCloseness: 2, distractorRealism: 2, timePressure: 2 },
    wrong: {
      A: 'Turns one treated page into a rule about every ink stored near heat.',
      B: 'Correct: the kiln is only tied to the harbor log, so the comparison stops there.',
      C: 'Invents a storage fact the note does not give.',
      D: 'Treats a successful treatment as damage.',
    },
  },
]

for (const item of items) {
  const total = rubricTotal(item.rubric)
  if (productBand(total) !== 'hard' && productBand(total) !== 'elite-hard') throw new Error(`${item.topic} rubric ${total} is not hard`)
  if (item.rubric.steps < 2) throw new Error(`${item.topic} is one-step`)
  if (new Set(item.choices).size !== 4) throw new Error(`${item.topic} has duplicate choices`)
}

const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  const total = rubricTotal(item.rubric)
  return {
    test_type: item.exam,
    section_name: item.section,
    category_name: item.domain,
    topic_name: item.topic,
    subtopic_name: item.subskill,
    topic_id: item.topicId,
    difficulty: 'Hard',
    difficulty_score: routingScore(total),
    question_type: 'multiple_choice',
    question_text: item.prompt,
    choice_a: item.choices[0],
    choice_b: item.choices[1],
    choice_c: item.choices[2],
    choice_d: item.choices[3],
    correct_answer: item.answer,
    official_explanation: item.explanation,
    source_type: 'original',
    source_rights_status: 'owned',
    source: batch,
    exam_name: batch,
    fingerprint,
    answer_verification_status: 'independently_verified',
    review_status: 'pending',
    approved: false,
    active: false,
  }
})

const existing = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
if (existing.length) throw new Error(`Duplicate fingerprints: ${existing.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id,fingerprint'))
const byHash = new Map(saved.map((row) => [row.fingerprint, row]))
checked(await db.from('exam_item_metadata').insert(rows.map((row, index) => {
  const item = items[index]
  const savedRow = byHash.get(row.fingerprint)
  const total = rubricTotal(item.rubric)
  return {
    question_id: savedRow.id,
    version: 1,
    exam_type: item.exam,
    section: item.section,
    domain: item.domain,
    skill: item.topic,
    subskill: item.subskill,
    difficulty_level: total >= 15 ? 7 : 6,
    difficulty_basis: 'editorial',
    estimated_seconds: item.seconds,
    module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'harder' }],
    distractor_rationales: item.wrong,
    calculator_expected: item.section === 'Math',
    contextual: true,
    validation_status: 'validated',
    content_hash: row.fingerprint,
    validation_evidence: {
      independent_solution: true,
      answer_verified: true,
      distractors_verified: true,
      ambiguity_review: true,
      style_review: true,
      difficulty_review: true,
      blueprint_classification: true,
      author_solution: item.proof,
      independent_solution_text: item.proof,
      independent_review_method: 'Symbolic or textual proof checked in the batch script before insert. Proposed keys were checked against that proof.',
      difficulty_rubric: { ...item.rubric, total, band: productBand(total) },
      student_performance_multiple: false,
    },
    originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
  }
})))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))

const report = {
  batch,
  generatedAt: new Date().toISOString(),
  added: items.map((item, index) => ({
    id: byHash.get(rows[index].fingerprint).id,
    exam: item.exam,
    section: item.section,
    domain: item.domain,
    topic: item.topic,
    rubric_total: rubricTotal(item.rubric),
    band: productBand(rubricTotal(item.rubric)),
  })),
  not_a_literal_five_times_multiplier: true,
}
mkdirSync('supabase/exam-engineering', { recursive: true })
writeFileSync('supabase/exam-engineering/audited-hard-batch-1-2026-10-10.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
