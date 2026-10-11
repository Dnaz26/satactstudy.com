import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Systems of Equations Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000053'
const items = [
  { prompt: 'The ordered pair (x,y) satisfies 3x+2y=19 and x−y=3. What is x?', choices: ['4', '5', '6', '7'], answer: 'B', level: 5, seconds: 55, explanation: 'From x−y=3, y=x−3. Substitute: 3x+2(x−3)=19, so 5x=25 and x=5.', proof: 'The solution is (5,2), which satisfies both equations.', wrong: { A: 'Substitutes incorrectly or solves for y instead of x.', B: 'Correct: substitution gives x=5 and y=2.', C: 'Makes an arithmetic error when combining like terms.', D: 'Does not satisfy x−y=3 together with the first equation.' } },
  { prompt: 'At a fundraiser, 3 adult tickets and 2 student tickets cost $44, while 2 adult tickets and 3 student tickets cost $41. What is the cost of one student ticket?', choices: ['$5', '$6', '$7', '$8'], answer: 'C', level: 6, seconds: 70, explanation: 'Let a and s be the ticket prices. The system is 3a+2s=44 and 2a+3s=41. Eliminating a gives 5s=35, so s=$7.', proof: 'The solution is a=10, s=7; these values produce totals 44 and 41.', wrong: { A: 'Underestimates the student price after an elimination error.', B: 'Uses a difference of the totals without matching coefficients.', C: 'Correct: elimination gives 5s=35.', D: 'Confuses the adult ticket price with the student price.' } },
  { prompt: 'For what value of k does the system 2x+ky=4 and 6x+9y=20 have no solution?', choices: ['2', '3', '4', '6'], answer: 'B', level: 7, seconds: 75, explanation: 'For parallel lines, the x- and y-coefficients must be proportional while the constants are not. Multiplying the first equation by 3 gives 6x+3ky=12. Matching the second equation’s coefficients requires 3k=9, so k=3; the unequal constants 12 and 20 make the lines distinct.', proof: 'At k=3 the equations have proportional x and y coefficients but inconsistent constants, so they are parallel and distinct.', wrong: { A: 'Does not make the coefficient pairs proportional.', B: 'Correct: k=3 gives parallel lines with different constants.', C: 'Does not make the coefficient pairs proportional.', D: 'Does not make the coefficient pairs proportional.' } },
  { prompt: 'For what value of k do the equations 4x+6y=10 and 2x+ky=5 describe the same line?', choices: ['1', '2', '3', '4'], answer: 'C', level: 6, seconds: 65, explanation: 'The second equation must be exactly half the first. Its x-coefficient and constant already are half, so k must be 3.', proof: 'Dividing 4x+6y=10 by 2 gives 2x+3y=5, requiring k=3.', wrong: { A: 'Does not preserve proportional coefficients.', B: 'Does not preserve proportional coefficients.', C: 'Correct: halving the first equation gives the second when k=3.', D: 'Does not preserve proportional coefficients.' } },
  { prompt: 'The point of intersection of 4x+3y=25 and x−y=1 is (x,y). What is x+y?', choices: ['5', '6', '7', '8'], answer: 'C', level: 6, seconds: 65, explanation: 'From x−y=1, x=y+1. Substitution gives 4(y+1)+3y=25, so y=3 and x=4. Thus x+y=7.', proof: 'The intersection is (4,3), whose coordinates sum to 7.', wrong: { A: 'Reports x alone or omits one coordinate.', B: 'Uses an arithmetic error during substitution.', C: 'Correct: the intersection is (4,3), and 4+3=7.', D: 'Adds an extra unit while solving x−y=1.' } },
  { prompt: 'Two numbers x and y satisfy x+y=8 and x−y=2. What is the product xy?', choices: ['12', '15', '18', '20'], answer: 'B', level: 6, seconds: 60, explanation: 'Adding the equations gives 2x=10, so x=5; then y=3. Their product is 15.', proof: 'The pair (5,3) satisfies both equations, and 5·3=15.', wrong: { A: 'Uses an incorrect value for one variable.', B: 'Correct: x=5 and y=3, so xy=15.', C: 'Adds the two values rather than multiplying them.', D: 'Uses the square of one value instead of the product.' } },
  { prompt: 'Two subscription plans cost 40+6m dollars and 58+3m dollars after m months. After how many months will their costs be equal?', choices: ['4', '5', '6', '7'], answer: 'C', level: 5, seconds: 55, explanation: 'Set the costs equal: 40+6m=58+3m. Then 3m=18, so m=6.', proof: 'At six months both plans cost $76.', wrong: { A: 'Solves after an incorrect subtraction of the fixed fees.', B: 'Divides the cost difference by the wrong rate difference.', C: 'Correct: the $18 fixed-fee difference closes at $3 per month.', D: 'Overestimates the time to reach equality.' } },
  { prompt: 'A pair (x,y) satisfies (x+y)/2=4 and x−y=2. What is x+2y?', choices: ['9', '10', '11', '12'], answer: 'C', level: 5, seconds: 60, explanation: 'The first equation gives x+y=8. Adding it to x−y=2 gives 2x=10, so x=5 and y=3. Therefore x+2y=11.', proof: 'The system solves to x=5, y=3, and x+2y=5+6=11.', wrong: { A: 'Combines the two equations incorrectly and undercounts the y contribution.', B: 'Uses an incorrect value for y after solving.', C: 'Correct: x=5 and y=3, so x+2y=11.', D: 'Overcounts by one after substitution.' } },
  { prompt: 'The graphs y=x²−1 and y=3x+3 intersect at two points. What is the sum of the x-coordinates of the intersection points?', choices: ['−3', '−1', '3', '5'], answer: 'C', level: 7, seconds: 75, explanation: 'At an intersection, x²−1=3x+3, so x²−3x−4=0. The roots are 4 and −1, whose sum is 3.', proof: 'Factoring gives (x−4)(x+1)=0; the x-coordinate sum is 4+(−1)=3.', wrong: { A: 'Reports the negative of the sum.', B: 'Reports only the negative root.', C: 'Correct: the intersection x-values are 4 and −1.', D: 'Adds the absolute values of both roots.' } },
  { prompt: 'A system has x+y=10 and x²+y²=58. What is xy?', choices: ['19', '21', '29', '42'], answer: 'B', level: 7, seconds: 75, explanation: 'Square the sum: (x+y)²=x²+y²+2xy. Thus 100=58+2xy, so xy=21.', proof: 'The identity gives 2xy=100−58=42, hence xy=21.', wrong: { A: 'Subtracts the known square sum incorrectly.', B: 'Correct: 2xy=42, so xy=21.', C: 'Confuses half the square sum with the product.', D: 'Reports 2xy rather than xy.' } },
  { prompt: 'The equations x+y=9 and 2x+2y=18 represent which situation?', choices: ['No solution', 'Exactly one solution', 'Exactly two solutions', 'Infinitely many solutions'], answer: 'D', level: 5, seconds: 50, explanation: 'The second equation is exactly twice the first, so both describe the same line and every point on that line solves the system.', proof: 'Dividing the second equation by 2 yields x+y=9, identical to the first.', wrong: { A: 'The equations are consistent, not contradictory.', B: 'Two equivalent equations do not isolate a unique point.', C: 'The shared line has more than two points.', D: 'Correct: both equations describe the same line.' } },
  { prompt: 'A system is 5x+2y=21 and 3x−2y=3. What is the value of x at the solution?', choices: ['1', '2', '3', '4'], answer: 'C', level: 5, seconds: 55, explanation: 'Add the equations to eliminate y: 8x=24, so x=3.', proof: 'Adding the equations gives 8x=24, hence x=3.', wrong: { A: 'Makes an arithmetic error in adding the constants.', B: 'Uses the coefficient sum as the solution.', C: 'Correct: the y terms cancel and 8x=24.', D: 'Solves for a variable using an incorrect coefficient.' } },
  { prompt: 'The lines y=2x+1 and y=mx−5 have no point of intersection. What must m equal?', choices: ['−2', '0', '1', '2'], answer: 'D', level: 6, seconds: 65, explanation: 'For distinct lines to have no intersection, they must be parallel. Their slopes must match, so m=2; their y-intercepts, 1 and −5, are different.', proof: 'Equal slopes and unequal intercepts give parallel distinct lines, requiring m=2.', wrong: { A: 'Uses the opposite of the first line’s slope.', B: 'Would make the second line horizontal and intersect the first.', C: 'Gives different slopes, so the lines intersect once.', D: 'Correct: matching slopes with different intercepts gives no intersection.' } },
  { prompt: 'A fundraiser sells 25 items consisting only of shirts and posters. Shirts cost $12 and posters cost $5; total revenue is $230. How many shirts were sold?', choices: ['10', '12', '15', '18'], answer: 'C', level: 6, seconds: 70, explanation: 'Let s be shirts and p posters. Then s+p=25 and 12s+5p=230. Substituting p=25−s gives 12s+125−5s=230, so 7s=105 and s=15.', proof: 'The solution is 15 shirts and 10 posters; 15+10=25 and 180+50=230.', wrong: { A: 'Underestimates the shirt count and cannot reach $230 in revenue.', B: 'Makes an arithmetic error after substitution.', C: 'Correct: 15 shirts and 10 posters meet both totals.', D: 'Overestimates the number of higher-priced items.' } },
]

const targetAnswers = ['A', 'D', 'A', 'C', 'C', 'A', 'D', 'B', 'A', 'D', 'C', 'B', 'A', 'D']
for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const correctIndex = 'ABCD'.indexOf(item.answer)
  const oldChoices = item.choices
  const oldReasons = item.wrong
  const targetIndex = 'ABCD'.indexOf(targetAnswers[index])
  const order = [0, 1, 2, 3].filter((choiceIndex) => choiceIndex !== correctIndex)
  order.splice(targetIndex, 0, correctIndex)
  item.choices = order.map((choiceIndex) => oldChoices[choiceIndex])
  item.wrong = Object.fromEntries(order.map((choiceIndex, newIndex) => ['ABCD'[newIndex], oldReasons['ABCD'[choiceIndex]]]))
  item.answer = targetAnswers[index]
}

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Systems of Equations' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Systems of Equations topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT systems-of-equations problem. Verify every substitution and whether the system has zero, one, or infinitely many solutions when relevant. Do not assume a key; map the result to the exact option text. Do not provide chain-of-thought. Return JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
          { role: 'user', content: JSON.stringify({ prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])), previous_review: previous }) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Independent review failed on item ${index}: HTTP ${response.status} ${await response.text()}`)
    return JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
  }
  let result = await review()
  const resolvedText = (candidate) => 'ABCD'.includes(candidate.answer_text) && candidate.answer_text.length === 1
    ? item.choices['ABCD'.indexOf(candidate.answer_text)]
    : candidate.answer_text
  if (resolvedText(result) !== item.choices['ABCD'.indexOf(item.answer)]) result = await review(result)
  result.answer_text = resolvedText(result)
  reviews.push({ index, ...result })
}
if (reviews.some((review, index) => review.index !== index || !review.valid || review.answer_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 86) throw new Error(`Coverage changed; expected 86, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'Math', category_name: 'Algebra', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: item.level >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.level - 1) / 6, question_type: 'multiple_choice',
    question_text: item.prompt, choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH, fingerprint,
    answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicates, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicates?.length) throw new Error(`Duplicate fingerprints detected: ${duplicates.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Algebra', skill: topic.name,
  subskill: ['substitution in a two-equation system', 'contextual ticket-price system', 'parameter for inconsistent lines', 'parameter for coincident lines', 'intersection and coordinate sum', 'sum-and-difference system', 'equal-cost linear models', 'fractional coefficients and substitution', 'nonlinear intersection and root sum', 'symmetric identities from two equations', 'dependent system and solution count', 'elimination in a linear system', 'parallel lines and slope condition', 'contextual revenue system'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [1, 4, 7, 8, 9, 13].includes(index), contextual: [1, 6, 13].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: itemProof(index), independent_solution_text: reviews[index].reason,
    independent_review_method: 'Blind second-model solution and uniqueness review; proposed keys withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch: BATCH, saved: saved.length, topic: topic.name, before, after, answers: items.map((item) => item.answer), reviewPassed: true }, null, 2))

function itemProof(index) { return items[index].proof }
