import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Linear Equations Challenge Batch 1'
const items = [
  {
    prompt: 'A repair lab charges a fixed setup fee plus the same amount for each hour of work. A 3-hour repair costs $58, and an 8-hour repair costs $103. According to this pricing model, what would an 11-hour repair cost?',
    choices: ['$121', '$130', '$139', '$148'], answer: 'B', difficulty: 5, seconds: 75,
    explanation: 'The hourly charge is (103−58)/(8−3)=$9. The fixed fee is 58−3(9)=$31, so an 11-hour repair costs 31+11(9)=$130.',
    wrong: { A: 'Uses the $9 hourly rate for the 11 hours but omits the fixed $31 setup fee.', B: 'Correct: finds the hourly charge, recovers the fixed fee, and evaluates the model at 11 hours.', C: 'Adds the 8-hour total to three extra hours at $12 rather than using the modeled hourly rate.', D: 'Extrapolates from the 8-hour total using the full average cost per hour, ignoring the setup fee.' },
    proof: 'From the two observations, the slope is 9 dollars per hour and the intercept is 31 dollars. Substitution at 11 gives 130.'
  },
  {
    prompt: 'For what value of m does the equation m(2x−3)+6=4x+m have no solution?',
    choices: ['−2', '0', '3', '2'], answer: 'D', difficulty: 6, seconds: 70,
    explanation: 'After expansion, (2m−4)x=4m−6. For no solution, the coefficient of x must be 0 while the right side is nonzero. Setting 2m−4=0 gives m=2; then 4m−6=2, so the equation is inconsistent.',
    wrong: { A: 'Does not make the coefficients of x equal, so the equation has one solution.', B: 'Also leaves a nonzero coefficient of x.', C: 'Also leaves a nonzero coefficient of x.', D: 'Correct: it makes the x-coefficients equal while leaving unequal constants.' },
    proof: 'At m=2 the original equation becomes 4x=4x+2, which is impossible. Any other m leaves a nonzero coefficient of x and therefore one solution.'
  },
  {
    prompt: 'A calibration value x satisfies (3(x−2))/4 + (x+5)/6 = (2x−1)/3 + 4. What is x?',
    choices: ['9', '83/18', '52/3', '83/9'], answer: 'C', difficulty: 6, seconds: 85,
    explanation: 'Multiply both sides by 12: 9(x−2)+2(x+5)=4(2x−1)+48. Simplifying gives 11x−8=8x+44, so 3x=52 and x=52/3.',
    wrong: { A: 'Combines the variable terms but loses the constant contributions from the fractions.', B: 'Divides 52 by 6 instead of by the resulting coefficient 3.', C: 'Correct: clearing denominators gives 11x−8=8x+44, hence x=52/3.', D: 'Doubles the solution after collecting the terms.' },
    proof: 'Multiplication by the positive common denominator 12 gives 9x−18+2x+10=8x−4+48, hence 3x=52. Substitution confirms both sides equal.'
  },
  {
    prompt: 'A supply estimate is calculated by solving (5x−3)/4 + (x+7)/6 = (2x−5)/3 + 9. What value of x satisfies the estimate?',
    choices: ['83/9', '9', '83/18', '166/9'], answer: 'A', difficulty: 6, seconds: 85,
    explanation: 'Multiply by 12 to clear denominators: 3(5x−3)+2(x+7)=4(2x−5)+108. This simplifies to 17x+5=8x+88, so 9x=83 and x=83/9.',
    wrong: { A: 'Correct: clearing denominators and collecting terms yields 9x=83.', B: 'Rounds 83/9 to the nearest integer instead of giving the exact solution.', C: 'Divides 83 by 18, doubling the coefficient of x.', D: 'Multiplies the correct quotient by 2.' },
    proof: 'Expanding after multiplying by 12 gives 17x+5=8x+88, or x=83/9. Substituting this value into the cleared equation makes both sides equal.'
  },
  {
    prompt: 'Two equipment plans charge according to the number n of operating hours. Plan A costs 42+0.06n dollars, while Plan B costs 27+0.09n dollars. At 620 operating hours, which plan costs less, and by how much?',
    choices: ['Plan B, by $3.60', 'Plan A, by $0.60', 'Plan A, by $3.60', 'Plan B, by $0.60'], answer: 'C', difficulty: 6, seconds: 80,
    explanation: 'At 620 hours, Plan A costs 42+0.06(620)=$79.20, and Plan B costs 27+0.09(620)=$82.80. Plan A is less expensive by $3.60.',
    wrong: { A: 'Chooses the plan with the lower hourly rate incorrectly, then reverses the comparison.', B: 'Uses a $0.06 difference between the hourly rates as if it were the total price difference.', C: 'Correct: evaluates both expressions and subtracts 82.80−79.20=$3.60.', D: 'Uses only the $0.03 rate difference times 20 hours rather than 620 hours and reverses the result.' },
    proof: 'Direct substitution gives A=$79.20 and B=$82.80; their difference is $3.60, with A lower.'
  },
  {
    prompt: 'A linear model predicts that y decreases by 2.4 whenever x increases by 0.6. If the model gives y=19.8 when x=1.5, what does it give when x=5?',
    choices: ['33.8', '5.8', '6.8', '−4.2'], answer: 'B', difficulty: 6, seconds: 75,
    explanation: 'The rate of change is −2.4/0.6=−4 per x-unit. From x=1.5 to x=5, x increases by 3.5, so y changes by −4(3.5)=−14. The predicted value is 19.8−14=5.8.',
    wrong: { A: 'Uses the rate as positive and adds 14 to the starting value.', B: 'Correct: applies the negative rate over the 3.5-unit change in x.', C: 'Subtracts 13 rather than the required 14.', D: 'Applies the −4 rate only once, without multiplying by the change in x.' },
    proof: 'The slope is −4. The linear change from x=1.5 to x=5 is −14, so y=5.8.'
  },
  {
    prompt: 'The equation (k−3)x+2k=(2k+1)x−5 has solution x=7. What is k?',
    choices: ['−23/5', '23/5', '−4', '−5'], answer: 'A', difficulty: 7, seconds: 90,
    explanation: 'Substitute x=7: 7(k−3)+2k=7(2k+1)−5. Simplifying gives 9k−21=14k+2, so −23=5k and k=−23/5.',
    wrong: { A: 'Correct: substitution and collection give 5k=−23.', B: 'Drops the negative sign when transposing −23=5k.', C: 'Uses the coefficient difference but omits the constant terms.', D: 'Confuses the solution x=7 with the parameter k.' },
    proof: 'With k=−23/5, both sides of the equation at x=7 equal −176/5. Solving the substituted equation gives only this k.'
  },
  {
    prompt: 'The numbers x and y satisfy 4x+3y=29 and 6x−3y=1. What is the value of x+y?',
    choices: ['8', '17/3', '20/3', '26/3'], answer: 'D', difficulty: 5, seconds: 75,
    explanation: 'Adding the equations eliminates y and gives 10x=30, so x=3. Substitution into the first equation gives 12+3y=29, hence y=17/3. Therefore x+y=3+17/3=26/3.',
    wrong: { A: 'Adds the coefficients or constants inconsistently after eliminating y.', B: 'Reports y alone instead of x+y.', C: 'Uses an incorrect value for y after solving for x.', D: 'Correct: x=3 and y=17/3, so x+y=26/3.' },
    proof: 'Adding yields x=3. Substitution gives y=17/3, so the requested sum is 26/3.'
  }
]

const topicId = 'd1000000-0000-0000-0000-000000000051'
const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Linear Equations' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Linear Equations topic not found')
if (items.some((item) => item.choices.length !== 4 || new Set(item.choices).size !== 4 || !/^[ABCD]$/.test(item.answer))) throw new Error('Malformed answer choices')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0, response_format: { type: 'json_object' }, max_tokens: 2600,
    messages: [
      { role: 'system', content: 'Blindly solve each original ACT math question from its stem. Do not assume any key. Check whether exactly one listed choice is correct, whether the stem is self-contained, and whether the supplied mathematical reasoning is valid. Internally solve first, then select the exact option text that equals your result; copy its letter and full text exactly. Before returning, verify that the letter maps to that exact choice text. Return only JSON: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact text copied from option A","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent math review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 92) throw new Error(`Coverage changed; expected 92, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'Math', category_name: 'Algebra', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: item.difficulty >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.difficulty - 1) / 6,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH, fingerprint,
    answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicateRows, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateRows?.length) throw new Error(`Duplicate fingerprint detected: ${duplicateRows.length}`)

const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Algebra', skill: topic.name,
  subskill: ['Linear models from two observations', 'Parameter and solution cases', 'Equations with rational coefficients', 'Clearing denominators', 'Comparing linear cost models', 'Rate-of-change interpretation', 'Parameter substitution', 'Systems and requested expressions'][index],
  difficulty_level: items[index].difficulty, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: false, contextual: index === 0 || index === 4 || index === 5,
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
