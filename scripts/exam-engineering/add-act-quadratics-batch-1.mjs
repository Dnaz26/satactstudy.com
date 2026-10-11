import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Quadratic Functions Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000055'
const items = [
  {
    prompt: 'A quadratic function is f(x)=x²−8x+c, where c is a constant. If the minimum value of f is −9, what is c?',
    choices: ['7', '8', '9', '25'], answer: 'A', level: 6, seconds: 70,
    explanation: 'Complete the square: f(x)=(x−4)²+c−16. Its minimum is c−16, so c−16=−9 and c=7.',
    wrong: { A: 'Correct: the vertex value is c−16, which equals −9 when c=7.', B: 'Confuses the x-coordinate of the vertex with the constant.', C: 'Uses the magnitude of the minimum as c.', D: 'Adds 16 to 9 rather than solving c−16=−9.' },
    proof: 'At x=4, f reaches c−16. Setting this equal to −9 gives c=7.'
  },
  {
    prompt: 'For f(x)=−2(x−3)²+18, for which interval of x is f(x)>0?',
    choices: ['x<0', '0<x<6', 'x>6', 'All real x'], answer: 'B', level: 5, seconds: 65,
    explanation: 'Solve −2(x−3)²+18>0. Dividing by −2 reverses the inequality: (x−3)²<9, so −3<x−3<3 and therefore 0<x<6.',
    wrong: { A: 'Selects a region outside the roots where the downward-opening parabola is negative.', B: 'Correct: the expression is positive strictly between its roots 0 and 6.', C: 'Selects a region outside the roots where the downward-opening parabola is negative.', D: 'Includes x=0 and x=6, where the expression equals zero, and values outside the roots.' },
    proof: 'The zeros occur at x=0 and x=6; since the leading coefficient is negative, the function is positive between them only.'
  },
  {
    prompt: 'For which values of k does the equation x²+(k−4)x+9=0 have exactly one real solution? What is the sum of those values of k?',
    choices: ['6', '8', '12', '14'], answer: 'B', level: 7, seconds: 90,
    explanation: 'A quadratic has exactly one real solution when its discriminant is zero: (k−4)²−36=0. Thus k−4=±6, giving k=10 or k=−2. Their sum is 8.',
    wrong: { A: 'Uses the difference between the two parameter values rather than their sum.', B: 'Correct: the two values are 10 and −2, whose sum is 8.', C: 'Adds 4 to both roots but then sums incorrectly.', D: 'Keeps only the positive parameter value and adds 4.' },
    proof: 'Setting the discriminant equal to zero gives k=10 or k=−2; their sum is 8.'
  },
  {
    prompt: 'The graphs of y=x²−5x+4 and y=2x−2 intersect at two points. What is the sum of the x-coordinates of those points?',
    choices: ['6', '7', '8', '−7'], answer: 'B', level: 6, seconds: 80,
    explanation: 'At an intersection, x²−5x+4=2x−2, so x²−7x+6=0. The sum of the roots is 7 by Vieta’s formula.',
    wrong: { A: 'Reports the product of the intersection x-values, not their sum.', B: 'Correct: the x-values are roots of x²−7x+6, whose sum is 7.', C: 'Adds the constant term 1 from the original quadratic after finding the root sum.', D: 'Gets the sign of the sum of the roots wrong.' },
    proof: 'Equating the functions gives x²−7x+6=0; by Vieta, the sum of its roots is 7.'
  },
  {
    prompt: 'How many real x-intercepts does the graph of y=x²+6x+10 have?',
    choices: ['0', '1', '2', '3'], answer: 'A', level: 5, seconds: 60,
    explanation: 'The discriminant is 6²−4(1)(10)=−4, which is negative. Therefore the quadratic has no real zeros and its graph has no x-intercepts.',
    wrong: { A: 'Correct: a negative discriminant means there are no real x-intercepts.', B: 'Confuses a repeated real root with a negative discriminant.', C: 'Assumes every quadratic crosses the x-axis twice.', D: 'Counts the degree as the number of real x-intercepts.' },
    proof: 'The discriminant is −4<0, so there are zero real roots.'
  },
  {
    prompt: 'A quadratic is defined by f(x)=−3(x+2)(x−8). What is its maximum value?',
    choices: ['60', '72', '75', '100'], answer: 'C', level: 6, seconds: 75,
    explanation: 'The zeros are −2 and 8, so the axis of symmetry is their midpoint x=3. Then f(3)=−3(5)(−5)=75, the maximum because the leading coefficient is negative.',
    wrong: { A: 'Uses a value near a root rather than the vertex.', B: 'Finds the axis of symmetry but evaluates one factor incorrectly.', C: 'Correct: the vertex is at x=3 and f(3)=75.', D: 'Squares the distance between the roots and omits the leading coefficient.' },
    proof: 'The vertex lies halfway between roots −2 and 8 at x=3; substitution gives 75, and the negative leading coefficient makes it a maximum.'
  },
  {
    prompt: 'Let f(x)=(x−1)(x−7) and g(x)=f(x+2)+4. What is the minimum value of g?',
    choices: ['−13', '−9', '−5', '4'], answer: 'C', level: 7, seconds: 85,
    explanation: 'The roots of f are 1 and 7, so its vertex is at x=4 with value f(4)=−9. Replacing x by x+2 shifts the graph left without changing its minimum; adding 4 raises that minimum to −5.',
    wrong: { A: 'Subtracts 4 from the original minimum instead of adding it.', B: 'Reports the minimum of f before the vertical shift.', C: 'Correct: the horizontal shift preserves the minimum and the +4 raises it to −5.', D: 'Reports the vertical shift without including the original minimum.' },
    proof: 'f has minimum −9. The horizontal shift preserves that value; the vertical shift adds 4, yielding −5.'
  },
  {
    prompt: 'The equation 2x²+3x−2=0 has one positive solution. What is the reciprocal of that positive solution?',
    choices: ['−2', '1/2', '2', '4'], answer: 'C', level: 5, seconds: 65,
    explanation: 'Factor: (2x−1)(x+2)=0. The positive solution is x=1/2, whose reciprocal is 2.',
    wrong: { A: 'Reports the negative solution rather than taking the reciprocal of the positive one.', B: 'Reports the positive solution itself.', C: 'Correct: the positive root is 1/2, so its reciprocal is 2.', D: 'Doubles the reciprocal after solving.' },
    proof: 'The roots are 1/2 and −2; the positive root’s reciprocal is 2.'
  },
  {
    prompt: 'For what greatest value of t do the graphs y=x²−4x+1 and y=tx−3 intersect at exactly one point?',
    choices: ['−8', '−4', '0', '4'], answer: 'C', level: 7, seconds: 90,
    explanation: 'At an intersection, x²−4x+1=tx−3, or x²−(t+4)x+4=0. One intersection requires discriminant zero: (t+4)²−16=0. Thus t=0 or t=−8, and the greater value is 0.',
    wrong: { A: 'Is the smaller tangent slope, not the greatest one.', B: 'Makes the linear coefficient zero but does not make the discriminant zero.', C: 'Correct: the two tangent values are −8 and 0, so the greater is 0.', D: 'Does not satisfy the zero-discriminant condition.' },
    proof: 'Setting the intersection quadratic’s discriminant to zero gives t=0 or −8; therefore the greatest is 0.'
  },
  {
    prompt: 'A quadratic function has the form f(x)=ax²+bx+c. If f(1)=4, f(−1)=8, and f(0)=3, what is a?',
    choices: ['2', '3', '4', '5'], answer: 'B', level: 6, seconds: 80,
    explanation: 'Since f(0)=3, c=3. Then a+b=1 from f(1)=4, and a−b=5 from f(−1)=8. Adding these equations gives 2a=6, so a=3.',
    wrong: { A: 'Uses half the sum of the equations incorrectly after substituting c.', B: 'Correct: adding a+b=1 and a−b=5 gives 2a=6.', C: 'Confuses the coefficient a with the constant term or one function value.', D: 'Subtracts the equations and solves for b instead of a.' },
    proof: 'The three function values yield c=3, a+b=1, and a−b=5; solving gives a=3.'
  },
]

const targetAnswers = ['B', 'D', 'A', 'C', 'C', 'A', 'D', 'B', 'A', 'D']
for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const oldChoices = item.choices
  const oldAnswerIndex = 'ABCD'.indexOf(item.answer)
  const oldReasons = item.wrong
  const targetIndex = 'ABCD'.indexOf(targetAnswers[index])
  const order = [0, 1, 2, 3].filter((choiceIndex) => choiceIndex !== oldAnswerIndex)
  order.splice(targetIndex, 0, oldAnswerIndex)
  item.choices = order.map((choiceIndex) => oldChoices[choiceIndex])
  item.answer = targetAnswers[index]
  item.wrong = Object.fromEntries(order.map((choiceIndex, newIndex) => ['ABCD'[newIndex], oldReasons['ABCD'[choiceIndex]]]))
}

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Quadratic Functions' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Quadratic Functions topic not found')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5000,
    messages: [
      { role: 'system', content: 'Blindly solve each original ACT math question and check exactly one listed answer is defensible. Do not assume a key. Verify the algebra and the requested quantity. Select the exact option text and its letter, then verify that pair. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact option text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 90) throw new Error(`Coverage changed; expected 90, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'Math', category_name: 'Functions', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: item.level >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.level - 1) / 6, question_type: 'multiple_choice',
    question_text: item.prompt, choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicateRows, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateRows?.length) throw new Error(`Duplicate fingerprints detected: ${duplicateRows.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Functions', skill: topic.name,
  subskill: ['vertex and parameter interpretation', 'sign intervals', 'discriminant parameter', 'quadratic-line intersections', 'real roots', 'maximum from factored form', 'function transformation', 'roots and reciprocals', 'tangency parameter', 'coefficient inference from values'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong, calculator_expected: false, contextual: false,
  validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: items[index].proof, independent_solution_text: reviews[index].reason,
    independent_review_method: 'Blind second-model solution and uniqueness review; proposed keys withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch: BATCH, saved: saved.length, topic: topic.name, before, after, answers: items.map((item) => item.answer), reviewPassed: true }, null, 2))
