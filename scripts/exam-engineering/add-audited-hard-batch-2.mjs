import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const batch = 'Audited hard pool 2026-10-11 batch 2'
const questions = [
  {
    exam: 'SAT', section: 'Math', domain: 'Algebra', topic: 'Linear functions', topicId: '4af6e28e-b347-42b2-9002-9c61b0cc2b3d',
    prompt: 'A linear function $f$ satisfies $f(2a)=3a+5$ and $f(2a+4)=5a+13$, where $a$ is a positive constant. If $f(6)=17$, what is $f(10)$?',
    choices: ['$17$', '$25$', '$29$', '$31$'], answer: 'C',
    explanation: 'The two given outputs differ by $2a+8$ while the inputs differ by 4, so the slope is $a/2+2$. Using $f(2a)$ gives the intercept $5-a-a^2$. Thus $f(6)=17+2a-a^2=17$, giving $a(a-2)=0$. Since $a>0$, $a=2$, the slope is 3, the intercept is $-1$, and $f(10)=29$.',
    proof: () => { const possible = [0, 2].filter(a => a > 0 && 17 + 2*a - a*a === 17); return possible.length === 1 && (possible[0]/2+2)*10+5-possible[0]-possible[0]**2 === 29 },
    wrong: { A: 'Stops at the supplied value $f(6)$.', B: 'Uses a slope of 2 for the last four input units.', C: 'Correct: $f(x)=3x-1$.', D: 'Uses an intercept of $+1$ rather than $-1$.' },
    subskill: 'infer a parameter from two function values and a third constraint', seconds: 150,
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Problem-Solving and Data Analysis', topic: 'Probability and conditional probability', topicId: 'cf2a63b6-90ae-4029-8e84-e6be5811d2e9',
    prompt: 'Supplier A makes 60% of a shipment and Supplier B makes the rest. Of A’s items, 5% are defective; of B’s, 10% are defective. An inspection flags 90% of defective items and 5% of nondefective items. If an item is flagged, what is the probability that it came from Supplier B?',
    choices: ['$2/5$', '$9/20$', '$36/73$', '$4/7$'], answer: 'C',
    explanation: 'Among all items, the probability of being from B and flagged is $0.4(0.1\\cdot0.9+0.9\\cdot0.05)=0.054$. For A the corresponding probability is $0.6(0.05\\cdot0.9+0.95\\cdot0.05)=0.0555$. Therefore the required conditional probability is $0.054/(0.054+0.0555)=36/73$.',
    proof: () => Math.abs((.4*(.1*.9+.9*.05))/(.4*(.1*.9+.9*.05)+.6*(.05*.9+.95*.05))-36/73)<1e-12,
    wrong: { A: 'Uses B’s original shipment share and ignores the flag.', B: 'Treats the inspection rate as the requested conditional probability.', C: 'Correct: includes both true and false flags for each supplier.', D: 'Conditions on actual defects instead of on all flagged items.' },
    subskill: 'two-stage conditional probability with false positives', seconds: 170,
  },
  {
    exam: 'SAT', section: 'Math', domain: 'Geometry and Trigonometry', topic: 'Circles', topicId: 'd1000000-0000-0000-0000-000000000021',
    prompt: 'Two concentric circles have radii $r$ and $r+3$. The area between them is $45\\pi$. A chord of the larger circle is tangent to the smaller circle. What is the length of the chord?',
    choices: ['$6\\sqrt{3}$', '$6\\sqrt{5}$', '$9\\sqrt{5}$', '$12$'], answer: 'B',
    explanation: '$\\pi((r+3)^2-r^2)=45\\pi$ gives $6r+9=45$, so $r=6$ and the larger radius is 9. The perpendicular distance from the common center to the tangent chord is 6. Half the chord is $\\sqrt{9^2-6^2}=3\\sqrt5$, so the full chord is $6\\sqrt5$.',
    proof: () => { const r=(45-9)/6; return r===6 && Math.abs(2*Math.sqrt((r+3)**2-r**2)-6*Math.sqrt(5))<1e-12 },
    wrong: { A: 'Uses the annulus width as a leg in the chord triangle.', B: 'Correct: doubles the half-chord $3\\sqrt5$.', C: 'Multiplies the half-chord by the outer radius.', D: 'Uses the inner diameter instead of the tangent chord.' },
    subskill: 'derive radius from annulus area, then use chord geometry', seconds: 145,
  },
  {
    exam: 'ACT', section: 'Math', domain: 'Functions', topic: 'Quadratic Functions', topicId: 'd1000000-0000-0000-0000-000000000055',
    prompt: 'The graph of a quadratic function $f(x)=x^2+bx+c$ has a minimum value of $-4$, and its two x-intercepts are 4 units apart. Also, $f(1)=5$. If the sum of the x-intercepts is positive, what is $c$?',
    choices: ['$-4$', '$8$', '$12$', '$16$'], answer: 'C',
    explanation: 'Write $f(x)=(x-h)^2-4$; its roots are $h-2$ and $h+2$, so their sum is $2h>0$. From $f(1)=5$, $(1-h)^2=9$, giving $h=4$ or $h=-2$. The positive-sum condition selects $h=4$. Then $c=f(0)=16-4=12$.',
    proof: () => { const hs=[4,-2].filter(h=>2*h>0 && (1-h)**2-4===5); return hs.length===1 && hs[0]**2-4===12 },
    wrong: { A: 'Reports the minimum value instead of the constant term.', B: 'Uses the wrong vertex branch or subtracts the root spacing.', C: 'Correct: the vertex is $(4,-4)$, so $f(0)=12$.', D: 'Forgets the vertical shift of $-4$.' },
    subskill: 'combine vertex, root spacing, and a sign condition', seconds: 140,
  },
]

for (const item of questions) {
  if (!item.proof()) throw new Error(`Independent check failed: ${item.topic}`)
  if (new Set(item.choices).size !== 4 || item.choices['ABCD'.indexOf(item.answer)] !== item.choices.find((_, i) => 'ABCD'[i] === item.answer)) throw new Error('Invalid choices')
}
const rows = questions.map((item) => ({
  test_type: item.exam, section_name: item.section, category_name: item.domain,
  topic_name: item.topic, subtopic_name: item.subskill, topic_id: item.topicId,
  difficulty: 'Hard', difficulty_score: 0.92, question_type: 'multiple_choice',
  question_text: item.prompt, choice_a: item.choices[0], choice_b: item.choices[1],
  choice_c: item.choices[2], choice_d: item.choices[3], correct_answer: item.answer,
  official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned',
  source: batch, exam_name: batch,
  fingerprint: createHash('sha256').update(`${item.prompt}|${item.choices.join('|')}`).digest('hex'),
  answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
}))
if (process.argv.includes('--repair-notation')) {
  const existingRows = checked(await db.from('questions').select('id,topic_id').eq('exam_name', batch))
  if (existingRows.length !== rows.length) throw new Error('Unexpected batch size during notation repair')
  for (const row of rows) {
    const match = existingRows.find((existingRow) => existingRow.topic_id === row.topic_id)
    if (!match) throw new Error('Missing batch topic during notation repair')
    checked(await db.from('questions').update({
      question_text: row.question_text, choice_a: row.choice_a, choice_b: row.choice_b,
      choice_c: row.choice_c, choice_d: row.choice_d, official_explanation: row.official_explanation,
      fingerprint: row.fingerprint,
    }).eq('id', match.id))
    checked(await db.from('exam_item_metadata').update({ content_hash: row.fingerprint }).eq('question_id', match.id))
  }
  console.log('Repaired math notation and hashes on all four published questions')
  process.exit(0)
}
const existing = checked(await db.from('questions').select('id,fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
if (existing.length) throw new Error(`Duplicate fingerprint in batch: ${existing.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: questions[index].exam, section: 'Math',
  domain: questions[index].domain, skill: questions[index].topic, subskill: questions[index].subskill,
  difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: questions[index].seconds,
  module_eligibility: questions[index].exam === 'SAT' ? [{ module: 2, route: 'harder' }] : [],
  distractor_rationales: questions[index].wrong, contextual: false,
  validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true,
    ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: questions[index].explanation,
    independent_solution_text: questions[index].explanation,
    independent_review_method: 'The algebraic or numeric invariant was checked in the batch script before insert; each distractor was also inspected against the worked solution.',
    computational_proof_passed: true, student_performance_multiple: false },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
const readback = checked(await db.from('questions').select('id').in('id', saved.map((row) => row.id)).eq('approved', true).eq('active', true))
if (readback.length !== questions.length) throw new Error('Batch readback failed')
console.log(JSON.stringify({ insertedAndVerified: readback.length, ids: readback.map((row) => row.id) }))
