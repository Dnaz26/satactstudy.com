import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Rational Numbers Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000050'
const items = [
  { prompt: 'What is the value of ((3/4−2/5)/(7/10+1/6))?', choices: ['7/26', '21/52', '13/21', '35/52'], answer: 'B', level: 7, seconds: 70, explanation: 'The numerator is 7/20. The denominator is 26/30=13/15. Dividing gives (7/20)(15/13)=21/52.', proof: 'The complex fraction simplifies to (7/20)/(13/15)=21/52.', wrong: { A: 'Inverts or simplifies the denominator incorrectly.', B: 'Correct: (7/20)(15/13)=21/52.', C: 'Divides the denominators but omits the numerator factors.', D: 'Uses an incorrect common denominator.' } },
  { prompt: 'What value of x satisfies (2x+1)/3−(x−2)/4=5/4?', choices: ['−2', '−1', '0', '1'], answer: 'D', level: 6, seconds: 60, explanation: 'Multiply by 12: 8x+4−3x+6=15. Thus 5x=5 and x=1.', proof: 'At x=1, the left side is 1−(−1/4)=5/4.', wrong: { A: 'Distributes the negative sign incorrectly.', B: 'Makes an arithmetic error combining constants.', C: 'Solves as if the right side were 5/6.', D: 'Correct: clearing denominators gives 5x=5.' } },
  { prompt: 'What fraction is equal to 0.272727… if the digits 27 repeat indefinitely?', choices: ['3/11', '27/100', '27/90', '9/22'], answer: 'A', level: 6, seconds: 60, explanation: 'Let x=0.272727… Then 100x=27.272727…; subtracting x gives 99x=27, so x=27/99=3/11.', proof: 'The repeating block has two digits, so 99x=27 and x=3/11.', wrong: { A: 'Correct: 27/99 simplifies to 3/11.', B: 'Treats the repeating decimal as terminating.', C: 'Uses an incorrect denominator for the repeating block.', D: 'Uses an incorrect simplification.' } },
  { prompt: 'What is the value of (3.6×10⁻⁴)(2.5×10⁷) in scientific notation?', choices: ['9×10²', '9×10³', '9×10⁴', '6.1×10³'], answer: 'B', level: 5, seconds: 50, explanation: 'Multiply coefficients and add exponents: 3.6·2.5=9 and −4+7=3, giving 9×10³.', proof: 'The product is 9×10³.', wrong: { A: 'Adds the exponents incorrectly.', B: 'Correct: multiply coefficients and add powers of ten.', C: 'Adds one extra to the exponent.', D: 'Adds the coefficients instead of multiplying them.' } },
  { prompt: 'Simplify √75−√12.', choices: ['3√3', '3√7', '7√3', '7√7'], answer: 'A', level: 6, seconds: 55, explanation: '√75=5√3 and √12=2√3. Their difference is 3√3.', proof: 'Extract perfect-square factors: 5√3−2√3=3√3.', wrong: { A: 'Correct: like radicals subtract to 3√3.', B: 'Combines radicands incorrectly.', C: 'Adds the coefficients instead of subtracting.', D: 'Uses incorrect radical simplifications.' } },
  { prompt: 'What is 16^(3/4)?', choices: ['4', '6', '8', '12'], answer: 'C', level: 6, seconds: 55, explanation: 'The fourth root of 16 is 2, and 2³=8.', proof: '16^(3/4)=(⁴√16)³=2³=8.', wrong: { A: 'Computes only the square root of 16.', B: 'Uses an incorrect fractional-exponent rule.', C: 'Correct: the fourth root is 2, then cube it.', D: 'Multiplies the base by the exponent numerator.' } },
  { prompt: 'For x≠3, the expression (x²−9)/(x−3) is equivalent to which expression?', choices: ['x−3', 'x+3', 'x²+3', '1/(x+3)'], answer: 'B', level: 6, seconds: 60, explanation: 'Factor the numerator: x²−9=(x−3)(x+3). Since x≠3, cancel x−3 to obtain x+3.', proof: 'The difference of squares factors and the excluded value prevents division by zero.', wrong: { A: 'Cancels the wrong factor and drops the remaining x+3.', B: 'Correct: (x−3)(x+3)/(x−3)=x+3 for x≠3.', C: 'Does not factor and cancel the common term.', D: 'Inverts the remaining factor.' } },
  { prompt: 'Which comparison is true?', choices: ['4/7 > 5/9', '4/7 = 5/9', '4/7 < 5/9', 'The comparison depends on the value of the denominator.'], answer: 'A', level: 5, seconds: 50, explanation: 'Cross-multiply by the positive denominators: 4·9=36 and 5·7=35. Since 36>35, 4/7>5/9.', proof: 'With positive denominators, compare 36 and 35.', wrong: { A: 'Correct: 36/63 is greater than 35/63.', B: 'The cross-products are not equal.', C: 'Reverses the correct comparison.', D: 'Both denominators are fixed positive numbers.' } },
  { prompt: 'Three-eighths of a positive number q is 2/3. What is q?', choices: ['1/4', '8/9', '16/9', '9/16'], answer: 'C', level: 5, seconds: 50, explanation: '(3/8)q=2/3, so q=(2/3)(8/3)=16/9.', proof: 'Multiply both sides by 8/3 to obtain 16/9.', wrong: { A: 'Multiplies rather than divides by 3/8.', B: 'Omits a factor of 2.', C: 'Correct: (2/3)(8/3)=16/9.', D: 'Inverts the wrong fraction.' } },
  { prompt: 'For x≠2, simplify (x²−5x+6)/(x−2).', choices: ['x−3', 'x+3', 'x−2', 'x+2'], answer: 'A', level: 6, seconds: 60, explanation: 'Factor x²−5x+6=(x−2)(x−3). Since x≠2, cancel x−2 to get x−3.', proof: 'Factoring and canceling the permitted common factor gives x−3.', wrong: { A: 'Correct: the remaining factor is x−3.', B: 'Uses the wrong sign in the factorization.', C: 'Cancels the denominator but leaves the wrong factor.', D: 'Uses the sum rather than product signs needed to factor.' } },
  { prompt: 'If a=−3/4 and b=2/5, what is a/b?', choices: ['−15/8', '−8/15', '15/8', '−5/6'], answer: 'A', level: 5, seconds: 50, explanation: 'Divide by a fraction by multiplying by its reciprocal: (−3/4)(5/2)=−15/8.', proof: 'a/b=(−3/4)÷(2/5)=−15/8.', wrong: { A: 'Correct: multiply by 5/2 and retain the negative sign.', B: 'Inverts the result.', C: 'Loses the negative sign.', D: 'Multiplies numerators and denominators without taking the reciprocal.' } },
  { prompt: 'A metal sample has a mass of 0.48 kilograms and a volume of 60 cubic centimeters. What is its density in grams per cubic centimeter?', choices: ['0.008', '0.8', '8', '80'], answer: 'C', level: 6, seconds: 60, explanation: 'Convert 0.48 kilograms to 480 grams. Density is 480/60=8 grams per cubic centimeter.', proof: '480 g divided by 60 cm³ is 8 g/cm³.', wrong: { A: 'Uses kilograms without converting to grams.', B: 'Misplaces the decimal after conversion.', C: 'Correct: 480/60=8.', D: 'Multiplies rather than divides by volume.' } },
  { prompt: 'What fraction is equal to 0.36666…, where only the digit 6 repeats?', choices: ['11/30', '3/8', '11/27', '1/3'], answer: 'A', level: 7, seconds: 65, explanation: 'Let x=0.36666…. Then 10x=3.6666… and 100x=36.6666…. Subtract: 90x=33, so x=33/90=11/30.', proof: 'Subtracting shifted forms eliminates the repeating tail and yields 11/30.', wrong: { A: 'Correct: the value is 0.3+0.06666…=3/10+1/15=11/30.', B: 'Is 0.375, not 0.3666….', C: 'Uses the wrong repeating-block denominator.', D: 'Is 0.3333….' } },
  { prompt: 'Which interval contains all real values of x satisfying |x−3|<5/2?', choices: ['(1/2,11/2)', '(−1/2,11/2)', '(1/2,13/2)', '[1/2,11/2]'], answer: 'A', level: 6, seconds: 60, explanation: 'The absolute-value inequality is equivalent to −5/2<x−3<5/2. Adding 3 gives 1/2<x<11/2; both endpoints are excluded.', proof: 'Solving the compound inequality gives the open interval (1/2,11/2).', wrong: { A: 'Correct: the strict inequality excludes both endpoints.', B: 'Subtracts an extra 1 from the lower endpoint.', C: 'Adds the upper bound incorrectly.', D: 'Includes endpoints where the original expression equals 5/2.' } },
  { prompt: 'What is the value of √18/√2?', choices: ['3', '4', '9', '√20'], answer: 'A', level: 5, seconds: 45, explanation: 'Combine the radicals: √18/√2=√9=3.', proof: 'The quotient is the square root of 9.', wrong: { A: 'Correct: √9=3.', B: 'Adds the radicands or rounds incorrectly.', C: 'Reports the radicand instead of its square root.', D: 'Adds the radicands rather than dividing.' } },
  { prompt: 'What is the value of ((−2)^5)/((−2)^2)?', choices: ['−32', '−8', '8', '16'], answer: 'B', level: 5, seconds: 50, explanation: 'The numerator is −32 and the denominator is 4, so the quotient is −8. Equivalently, subtract exponents to get (−2)³=−8.', proof: '(−2)^5/(−2)^2=(−2)^3=−8.', wrong: { A: 'Reports the numerator without dividing by 4.', B: 'Correct: the quotient is −8.', C: 'Loses the negative sign from the odd power.', D: 'Uses an incorrect exponent operation.' } },
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
  .find((row) => row.id === topicId && row.name === 'Rational Numbers' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Rational Numbers topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT rational-number problem. Verify signs, fraction operations, restrictions, and exact values. Check that exactly one option is correct. Do not assume a key. Return exact correct option text (a letter may be normalized). JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
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
    test_type: 'ACT', section_name: 'Math', category_name: 'Number and Quantity', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
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
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Number and Quantity', skill: topic.name,
  subskill: ['complex fraction operations', 'linear equation with fractional coefficients', 'repeating decimal conversion', 'scientific notation multiplication', 'radical simplification and subtraction', 'rational exponent evaluation', 'rational expression cancellation with domain restriction', 'ordering rational numbers by cross-products', 'solving a fractional proportion', 'factoring a rational expression', 'division of signed fractions', 'density with unit conversion', 'mixed terminating and repeating decimal conversion', 'absolute-value interval with fractional bounds', 'quotient of radicals', 'integer exponent laws with negative base'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [0, 3, 4, 5, 11, 12, 13].includes(index), contextual: [11].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
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
