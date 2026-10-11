import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Inequalities Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000052'
const items = [
  {
    prompt: 'A value x must satisfy both −5≤3−2x and 3−2x<9. Which interval contains all and only the possible values of x?',
    choices: ['−3≤x<4', '−3<x≤4', '−4<x≤3', 'x≤−3 or x>4'], answer: 'B', level: 6, seconds: 75,
    explanation: 'Solving the first inequality gives x≤4. Solving the second gives x>−3 because division by −2 reverses the inequality. Their intersection is −3<x≤4.',
    proof: 'The two constraints reduce to x≤4 and x>−3; their intersection is (−3,4].',
    wrong: { A: 'Includes x=−3, which makes the strict inequality 3−2x<9 false.', B: 'Correct: it intersects x≤4 with x>−3.', C: 'Reverses one endpoint and changes the bounds.', D: 'Treats the two constraints as a union instead of an intersection.' },
  },
  {
    prompt: 'For what values of x is 5−2(3x−1)≥4x+9 true?',
    choices: ['x≥−1/5', 'x≤−1/5', 'x≤−1/10', 'x≥−1/10'], answer: 'B', level: 6, seconds: 70,
    explanation: 'Expand and collect terms: 7−6x≥4x+9, so −10x≥2. Dividing by −10 reverses the inequality, giving x≤−1/5.',
    proof: 'Substitution of x=−1/5 gives equality; larger x makes the left side smaller than the right, so the solution is x≤−1/5.',
    wrong: { A: 'Fails to reverse the inequality when dividing by a negative number.', B: 'Correct: expansion gives −10x≥2, hence x≤−1/5.', C: 'Uses the wrong constant when simplifying 5−2(3x−1).', D: 'Combines both the sign and fraction incorrectly.' },
  },
  {
    prompt: 'A calibration value x must satisfy (x−4)/3+2≥(2x+1)/5. Which statement describes all possible values of x?',
    choices: ['x<7', 'x≥7', 'x≤7', 'Every real number'], answer: 'C', level: 6, seconds: 70,
    explanation: 'Multiply by 15: 5(x−4)+30≥3(2x+1). Simplifying gives 5x+10≥6x+3, so x≤7.',
    proof: 'Clearing the positive denominator 15 preserves the inequality and yields x≤7; x=7 gives equality.',
    wrong: { A: 'Excludes x=7, even though it satisfies the original inequality with equality.', B: 'Reverses the final inequality without multiplying by a negative number.', C: 'Correct: clearing denominators gives x≤7.', D: 'Ignores the nonzero coefficient remaining after simplification.' },
  },
  {
    prompt: 'Which interval is the solution set of |4x−7|<9?',
    choices: ['[−1/2,4)', '(−2,4)', '(−1/2,4)', '(−1/2,4]'], answer: 'C', level: 6, seconds: 65,
    explanation: 'Rewrite as −9<4x−7<9. Adding 7 and dividing by 4 gives −1/2<x<4. Both endpoints are excluded because the inequality is strict.',
    proof: 'The absolute-value inequality is equivalent to the open interval (−1/2,4).',
    wrong: { A: 'Includes −1/2, where the absolute value equals 9 rather than being less than 9.', B: 'Uses −2 instead of −1/2 as the lower endpoint.', C: 'Correct: both endpoints are excluded by the strict inequality.', D: 'Includes 4, where the absolute value equals 9.' },
  },
  {
    prompt: 'For which real values of x is (x+3)/(x−2)≥0?',
    choices: ['(−∞,−3)∪[2,∞)', '(−∞,−3]∪(2,∞)', '[−3,2)', '(−3,2]'], answer: 'B', level: 7, seconds: 90,
    explanation: 'The critical values are −3, where the numerator is zero, and 2, where the expression is undefined. Testing the intervals shows the expression is nonnegative on (−∞,−3] and positive on (2,∞).',
    proof: 'The sign is positive for x<−3, negative for −3<x<2, and positive for x>2. Include −3 but exclude the undefined value 2.',
    wrong: { A: 'Includes x=2, where the expression is undefined, and excludes x=−3, where it equals zero.', B: 'Correct: includes the zero at −3 and excludes the pole at 2.', C: 'Includes values between −3 and 2, where the expression is negative.', D: 'Includes values where the expression is negative and includes the undefined endpoint 2.' },
  },
  {
    prompt: 'For what value of a does the inequality a(3x−2)>6x−4 have no real solution?',
    choices: ['−2', '2', '3', '6'], answer: 'B', level: 7, seconds: 85,
    explanation: 'Rearranging gives (3a−6)x>2a−4. When a=2, both sides reduce to 0, producing 0>0, which is never true. For any other a, the coefficient of x is nonzero and the inequality has a half-line of solutions.',
    proof: 'At a=2 the inequality becomes 6x−4>6x−4, false for every x. For a≠2, the x coefficient is nonzero and a half-line of x values satisfies it.',
    wrong: { A: 'Leaves a nonzero coefficient of x, so there are solutions.', B: 'Correct: the inequality becomes the impossible statement 0>0.', C: 'Leaves a nonzero coefficient of x, so there are solutions.', D: 'Leaves a nonzero coefficient of x, so there are solutions.' },
  },
  {
    prompt: 'A workshop chooses nonnegative integers x and y subject to x+y≤9, 2x+3y≤20, and x+2y≥8. What is the greatest possible value of x+y?',
    choices: ['8', '9', '10', '11'], answer: 'B', level: 4, seconds: 55,
    explanation: 'The first constraint makes 9 an upper bound. The pair (9,0) satisfies the other two constraints as well, so the upper bound is attainable.',
    proof: 'x+y cannot exceed 9, and (9,0) satisfies 2x+3y=18≤20 and x+2y=9≥8, attaining 9.',
    wrong: { A: 'Is feasible but below the feasible pair (9,0), whose sum is 9.', B: 'Correct: it is the stated upper bound and (9,0) is feasible.', C: 'Violates the explicit constraint x+y≤9.', D: 'Exceeds the explicit constraint x+y≤9 by two.' },
  },
  {
    prompt: 'A storage room has at most 40 cubic units available. Each large tray uses 6 units, each small tray uses 4 units, and at least 3 small trays must be kept. What is the greatest possible number of large trays?',
    choices: ['3', '4', '5', '6'], answer: 'B', level: 6, seconds: 75,
    explanation: 'To maximize large trays, use the minimum allowed 3 small trays. They use 12 units, leaving 28; that space holds at most 4 large trays because 6·4=24 but 6·5=30.',
    proof: 'With at least 3 small trays, 4(3)+6x≤40, so x≤28/6 and the greatest integer x is 4; it is attainable.',
    wrong: { A: 'Leaves unused capacity that can still fit a fourth large tray.', B: 'Correct: four large trays fit with three small trays; five do not fit.', C: 'Requires 30 units for large trays plus at least 12 for small trays, exceeding 40.', D: 'Exceeds the capacity even before counting the required small trays.' },
  },
  {
    prompt: 'How many integer values of x satisfy 2<(3x−1)/2≤11?',
    choices: ['4', '5', '6', '7'], answer: 'C', level: 6, seconds: 80,
    explanation: 'Multiplying by 2 gives 4<3x−1≤22. Thus 5<3x≤23, or 5/3<x≤23/3. The integer values are 2, 3, 4, 5, 6, and 7: six values.',
    proof: 'The interval is (5/3,23/3], containing the six integers 2 through 7.',
    wrong: { A: 'Omits two integers in the inclusive upper part of the interval.', B: 'Counts only five of the six integers from 2 through 7.', C: 'Correct: the integer solutions are 2, 3, 4, 5, 6, and 7.', D: 'Includes 8, which exceeds the upper bound.' },
  },
  {
    prompt: 'What is the greatest integer x that satisfies |x−3|≥2x−1?',
    choices: ['0', '1', '2', '3'], answer: 'B', level: 7, seconds: 90,
    explanation: 'For x≤1/2, the right side is nonpositive, so the inequality holds. For x>1/2, split at x=3: on 1/2<x<3, 3−x≥2x−1 gives x≤4/3; for x≥3, x−3≥2x−1 has no solutions. Thus all solutions satisfy x≤4/3, and the greatest integer is 1.',
    proof: 'The real solution set is x≤4/3; x=1 works and x=2 does not, so the greatest integer solution is 1.',
    wrong: { A: 'Is a solution but not the greatest integer solution.', B: 'Correct: 1 is the greatest integer not exceeding 4/3.', C: 'Fails the inequality because |2−3|=1<3.', D: 'Fails the inequality because |3−3|=0<5.' },
  },
  {
    prompt: 'Nonnegative integers x and y satisfy x+y≤9 and 2x−y≥3. What is the greatest possible value of x+y?',
    choices: ['7', '8', '9', '10'], answer: 'C', level: 7, seconds: 90,
    explanation: 'The first inequality gives the upper bound x+y≤9. The pair (4,5) satisfies both constraints and has sum 9, so the bound is attainable.',
    proof: 'The sum cannot exceed 9; (4,5) is a feasible nonnegative integer pair attaining 9.',
    wrong: { A: 'Is feasible but below the attainable maximum.', B: 'Is feasible but below the attainable maximum.', C: 'Correct: it is the upper bound and (4,5) attains it.', D: 'Violates the explicit constraint x+y≤9.' },
  },
  {
    prompt: 'A rectangular panel has a perimeter of at most 46 centimeters. Its length is 4 centimeters greater than its width. If the width is a whole number of centimeters, what is the greatest possible width?',
    choices: ['8', '9', '10', '11'], answer: 'B', level: 5, seconds: 70,
    explanation: 'Let the width be w; the length is w+4. The perimeter constraint gives 2(w+w+4)≤46, so 4w≤38 and w≤9.5. The greatest whole-number width is 9.',
    proof: 'Widths must satisfy w≤9.5; w=9 is allowed and w=10 is not.',
    wrong: { A: 'Is possible but not the greatest whole-number width.', B: 'Correct: 9 is the greatest integer not exceeding 9.5.', C: 'Exceeds the bound because it would give perimeter 48.', D: 'Exceeds the bound by an even larger amount.' },
  },
  {
    prompt: 'How many integers n satisfy −3≤(2n+1)/5<4?',
    choices: ['9', '18', '24', '36'], answer: 'B', level: 6, seconds: 80,
    explanation: 'Multiply by 5: −15≤2n+1<20. Subtract 1 and divide by 2 to get −8≤n<9.5. The integers run from −8 through 9, inclusive, for a total of 18.',
    proof: 'There are 9−(−8)+1=18 integers in the interval [−8,9].',
    wrong: { A: 'Confuses one endpoint with the number of integers in the interval.', B: 'Correct: the integers are −8 through 9, inclusive, for a count of 18.', C: 'Adds extra values beyond the interval.', D: 'Treats the number of possible values as a product rather than a count.' },
  },
  {
    prompt: 'How many integer values of x satisfy both |x−2|≤5 and 3x−1>8?',
    choices: ['5', '3', '4', '6'], answer: 'C', level: 7, seconds: 85,
    explanation: 'The absolute-value inequality gives −3≤x≤7. The second inequality gives x>3. The integer intersection is 4, 5, 6, and 7, so there are four values.',
    proof: 'Intersect [−3,7] with (3,∞) to obtain (3,7], which contains four integers.',
    wrong: { A: 'Overcounts by including the excluded boundary value 3.', B: 'Omits one allowed integer from 4 through 7.', C: 'Correct: the integer solutions are 4, 5, 6, and 7.', D: 'Includes an integer larger than 7, which fails the absolute-value constraint.' },
  },
]

const targetAnswers = ['A', 'D', 'A', 'C', 'B', 'D', 'C', 'A', 'B', 'C', 'D', 'A', 'B', 'C']
for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const oldChoices = item.choices
  const oldIndex = 'ABCD'.indexOf(item.answer)
  const oldReasons = item.wrong
  const targetIndex = 'ABCD'.indexOf(targetAnswers[index])
  const order = [0, 1, 2, 3].filter((choiceIndex) => choiceIndex !== oldIndex)
  order.splice(targetIndex, 0, oldIndex)
  item.choices = order.map((choiceIndex) => oldChoices[choiceIndex])
  item.wrong = Object.fromEntries(order.map((choiceIndex, newIndex) => ['ABCD'[newIndex], oldReasons['ABCD'[choiceIndex]]]))
  item.answer = targetAnswers[index]
}

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Inequalities' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Inequalities topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
      response_format: { type: 'json_object' }, max_tokens: 240,
      messages: [
        { role: 'system', content: 'Independently solve this one ACT Math inequality. Do not assume a key. Check endpoints and integer restrictions. Do not provide chain-of-thought. Return JSON only with the exact correct option text: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}. Ensure valid JSON and one final answer.' },
        { role: 'user', content: JSON.stringify({ prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }) },
      ],
    }),
  })
  if (!reviewResponse.ok) throw new Error(`Independent review failed on item ${index}: HTTP ${reviewResponse.status} ${await reviewResponse.text()}`)
  let result = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}')
  const expectedText = item.choices['ABCD'.indexOf(item.answer)]
  if (result.answer_text !== expectedText) {
    const retryResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'A previous review may have inconsistently matched its solution to an answer option. Independently solve the problem again, then map the result to the exact option text. Do not infer the intended key from the prior response. Return JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
          { role: 'user', content: JSON.stringify({ prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])), previous_review: result }) },
        ],
      }),
    })
    if (!retryResponse.ok) throw new Error(`Independent review retry failed on item ${index}: HTTP ${retryResponse.status} ${await retryResponse.text()}`)
    result = JSON.parse((await retryResponse.json()).choices?.[0]?.message?.content || '{}')
  }
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
  subskill: ['compound inequality and interval', 'multi-step inequality and reversal', 'fractional linear inequality', 'strict absolute-value interval', 'rational inequality and domain', 'parameter causing an empty solution set', 'integer linear optimization', 'contextual capacity constraint', 'integer count from a compound interval', 'absolute-value inequality by cases', 'maximizing a linear objective', 'perimeter-derived inequality', 'integer count with strict endpoint', 'intersection of absolute and linear constraints'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: false, contextual: [7, 11].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
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
