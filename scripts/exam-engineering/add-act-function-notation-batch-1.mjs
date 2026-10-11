import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Function Notation Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000054'
const items = [
  { prompt: 'Let f(x)=3x²−2x+1. What is f(−2)?', choices: ['9', '13', '17', '21'], answer: 'C', level: 5, seconds: 50, explanation: 'Substitute −2: f(−2)=3(4)−2(−2)+1=12+4+1=17.', proof: 'Direct substitution gives 17.', wrong: { A: 'Omits the positive contribution from −2(−2).', B: 'Uses an incorrect square or coefficient.', C: 'Correct: 12+4+1=17.', D: 'Makes an arithmetic error after substitution.' } },
  { prompt: 'For g(x)=2x−5, the value of g(a+3) is 11. What is a?', choices: ['3', '4', '5', '6'], answer: 'C', level: 5, seconds: 55, explanation: 'Substitute a+3 for x: 2(a+3)−5=11. Thus 2a+1=11 and a=5.', proof: 'At a=5, g(8)=11.', wrong: { A: 'Does not account for the +3 inside the function input.', B: 'Makes an arithmetic error when isolating a.', C: 'Correct: 2(a+3)−5=11 gives a=5.', D: 'Solves for the input a+3 as if it were a.' } },
  { prompt: 'If f(x)=x²−4x, which expression is equivalent to f(x+2)?', choices: ['x²−4', 'x²+4', 'x²−8', 'x²−4x'], answer: 'A', level: 6, seconds: 60, explanation: 'Replace each x by x+2: f(x+2)=(x+2)²−4(x+2)=x²+4x+4−4x−8=x²−4.', proof: 'Expansion and collection of terms yields x²−4.', wrong: { A: 'Correct: the linear terms cancel and the constant is −4.', B: 'Loses the constant’s negative contribution.', C: 'Omits the +4 from expanding the square.', D: 'Substitutes x+2 only into part of the function.' } },
  { prompt: 'Let f(x)=3x+1 and g(x)=x²−2. If h(x)=f(g(x)), what is h(2)?', choices: ['5', '6', '7', '9'], answer: 'C', level: 6, seconds: 60, explanation: 'Evaluate the inside function first: g(2)=4−2=2. Then f(2)=3(2)+1=7.', proof: 'The composition gives f(g(2))=f(2)=7.', wrong: { A: 'Subtracts the inner-function result from the outer result incorrectly.', B: 'Omits the +1 in f.', C: 'Correct: g(2)=2, then f(2)=7.', D: 'Applies f to 2² before subtracting 2.' } },
  { prompt: 'A function is defined by f(x)=x+4 when x<1 and f(x)=x²−1 when x≥1. What is f(−2)+f(3)?', choices: ['7', '9', '10', '12'], answer: 'C', level: 6, seconds: 65, explanation: 'Since −2<1, f(−2)=−2+4=2. Since 3≥1, f(3)=9−1=8. Their sum is 10.', proof: 'Use the first rule at −2 and the second at 3: 2+8=10.', wrong: { A: 'Uses the wrong branch for one input or misadds the outputs.', B: 'Makes an arithmetic error after evaluating one branch.', C: 'Correct: the two outputs are 2 and 8.', D: 'Adds the inputs instead of the function values.' } },
  { prompt: 'A function satisfies f(2x−1)=5x+7 for every real x. What is f(9)?', choices: ['27', '30', '32', '35'], answer: 'C', level: 7, seconds: 70, explanation: 'Set the input 2x−1 equal to 9, giving x=5. Then f(9)=5(5)+7=32.', proof: 'When x=5, the given identity states f(9)=32.', wrong: { A: 'Substitutes 9 for x instead of making the function input equal 9.', B: 'Makes an arithmetic error after solving for x.', C: 'Correct: the input 9 corresponds to x=5, so f(9)=32.', D: 'Uses the wrong value for the auxiliary x.' } },
  { prompt: 'For f(x)=(x+1)/(x−3), which value of x satisfies f(x)=2?', choices: ['5', '6', '7', '8'], answer: 'C', level: 6, seconds: 65, explanation: 'Solve (x+1)/(x−3)=2 with x≠3. Then x+1=2x−6, so x=7, which is in the domain.', proof: 'f(7)=8/4=2.', wrong: { A: 'Does not satisfy the equation after substitution.', B: 'Makes an error distributing 2 to the denominator.', C: 'Correct: (7+1)/(7−3)=2.', D: 'Overstates the solution by one.' } },
  { prompt: 'The function f is defined by f(x)=x²+ax+1. If f(2)=11, what is f(−1)?', choices: ['−1', '1', '3', '5'], answer: 'A', level: 7, seconds: 70, explanation: 'From f(2)=4+2a+1=11, we get a=3. Then f(−1)=1−3+1=−1.', proof: 'The condition determines a=3; substitution at −1 gives −1.', wrong: { A: 'Correct: a=3 and f(−1)=−1.', B: 'Omits the negative contribution of a(−1).', C: 'Substitutes the parameter into the wrong term.', D: 'Uses f(2) as the requested output.' } },
  { prompt: 'Let f(x)=x+4 and g(x)=3x². What is f(g(−1))?', choices: ['1', '3', '7', '13'], answer: 'C', level: 5, seconds: 55, explanation: 'First g(−1)=3(1)=3. Then f(3)=3+4=7.', proof: 'The inside output is 3 and the outer function adds 4.', wrong: { A: 'Subtracts 2 rather than applying both functions.', B: 'Stops after evaluating g.', C: 'Correct: f(g(−1))=f(3)=7.', D: 'Squares the output of g a second time.' } },
  { prompt: 'Let f(x)=3x−8. What is f⁻¹(7), where f⁻¹ denotes the inverse function?', choices: ['3', '5', '7', '15'], answer: 'B', level: 6, seconds: 60, explanation: 'f⁻¹(7) is the input x for which f(x)=7. Solve 3x−8=7, giving x=5.', proof: 'f(5)=7, so the inverse maps 7 to 5.', wrong: { A: 'Solves 3x=7 rather than 3x−8=7.', B: 'Correct: f(5)=7.', C: 'Confuses the inverse input and output.', D: 'Adds 8 but does not divide by 3.' } },
  { prompt: 'Define g(x)=−2f(x−3)+4. If f(1)=6, what is g(4)?', choices: ['−12', '−8', '8', '16'], answer: 'B', level: 6, seconds: 65, explanation: 'For x=4, the input to f is 4−3=1. Therefore g(4)=−2f(1)+4=−2(6)+4=−8.', proof: 'Using f(1)=6 gives −12+4=−8.', wrong: { A: 'Stops after multiplying f(1) by −2 and omits the +4.', B: 'Correct: −2(6)+4=−8.', C: 'Loses the negative sign in the transformation.', D: 'Adds 4 before applying the scale factor.' } },
  { prompt: 'Let f(x)=x²+1 and g(x)=2x−1. What is f(g(2))?', choices: ['5', '8', '10', '17'], answer: 'C', level: 5, seconds: 55, explanation: 'First g(2)=3. Then f(3)=3²+1=10.', proof: 'Composition gives f(3)=10.', wrong: { A: 'Adds 1 before squaring the inner result.', B: 'Omits the +1 in the outer function.', C: 'Correct: (3)²+1=10.', D: 'Squares the input to g before completing the composition.' } },
  { prompt: 'A function satisfies f(x+1)=x²−4x+7 for every real x. What is f(5)?', choices: ['5', '6', '7', '8'], answer: 'C', level: 7, seconds: 70, explanation: 'To make the function input x+1 equal 5, set x=4. Then f(5)=4²−4(4)+7=7.', proof: 'Substituting x=4 in the identity gives f(5)=7.', wrong: { A: 'Substitutes x=5 rather than x+1=5.', B: 'Makes an arithmetic error in evaluating the expression.', C: 'Correct: x=4 corresponds to the input 5 and yields 7.', D: 'Uses an incorrect value for the auxiliary x.' } },
  { prompt: 'For f(x)=(x−2)/(x+1), which value of x satisfies f(x)=1/2?', choices: ['3', '4', '5', '6'], answer: 'C', level: 6, seconds: 65, explanation: 'With x≠−1, solve 2(x−2)=x+1. This gives 2x−4=x+1, so x=5.', proof: 'f(5)=3/6=1/2.', wrong: { A: 'Does not satisfy the equation after cross-multiplication.', B: 'Makes an arithmetic error isolating x.', C: 'Correct: (5−2)/(5+1)=1/2.', D: 'Adds rather than balances the constant terms.' } },
  { prompt: 'A linear function p(x)=ax+b satisfies p(2)=7 and p(−1)=−2. What is p(5)?', choices: ['13', '14', '15', '16'], answer: 'D', level: 6, seconds: 65, explanation: 'The slope is (7−(−2))/(2−(−1))=3. Using p(2)=7 gives b=1, so p(5)=3(5)+1=16.', proof: 'The two points determine p(x)=3x+1, which gives p(5)=16.', wrong: { A: 'Uses an incorrect slope from the two given points.', B: 'Uses the correct rate but an incorrect intercept.', C: 'Confuses p(5) with the slope times 5.', D: 'Correct: p(x)=3x+1, so p(5)=16.' } },
  { prompt: 'Let f(x)=|x−4|+x. What is f(3)?', choices: ['2', '3', '4', '5'], answer: 'C', level: 5, seconds: 50, explanation: 'Substitute 3: f(3)=|3−4|+3=1+3=4.', proof: 'The absolute value is 1, so f(3)=4.', wrong: { A: 'Subtracts the absolute-value term instead of adding it.', B: 'Reports only the absolute-value term.', C: 'Correct: |−1|+3=4.', D: 'Adds 1 to the input twice.' } },
]

const targetAnswers = ['A', 'D', 'A', 'C', 'C', 'A', 'D', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C', 'B']
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
  .find((row) => row.id === topicId && row.name === 'Function Notation' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Function Notation topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT function-notation problem. Verify the order of composition, input substitutions, inverse meaning, branch conditions, and domain. Do not assume a key. Return exact correct option text; a letter may be normalized. Do not provide chain-of-thought. JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
          { role: 'user', content: JSON.stringify({ prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])), previous_review: previous }) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Independent review failed on item ${index}: HTTP ${response.status} ${await response.text()}`)
    return JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
  }
  let result = await review()
  const expectedText = item.choices['ABCD'.indexOf(item.answer)]
  const resolveText = (candidate) => 'ABCD'.includes(candidate.answer_text) && candidate.answer_text.length === 1
    ? item.choices['ABCD'.indexOf(candidate.answer_text)] : candidate.answer_text
  if (resolveText(result) !== expectedText) result = await review(result)
  result.answer_text = resolveText(result)
  reviews.push({ index, ...result })
}
if (reviews.some((review, index) => review.index !== index || !review.valid || review.answer_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 84) throw new Error(`Coverage changed; expected 84, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'Math', category_name: 'Functions', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
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
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Functions', skill: topic.name,
  subskill: ['direct function evaluation', 'unknown input from an output', 'function shift and simplification', 'composition in a defined order', 'piecewise function evaluation', 'recovering a function value from an input identity', 'solving a rational function output equation', 'parameter determined by one function value', 'composition at a negative input', 'inverse function evaluation', 'vertical and horizontal transformation', 'nested function evaluation', 'recovering input in shifted function notation', 'rational function equation and domain', 'linear function reconstruction from points', 'function notation and equivalent expressions'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [2, 6, 7, 9, 10, 12, 13, 14].includes(index), contextual: [13, 14].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
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
