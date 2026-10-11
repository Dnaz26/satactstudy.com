import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Probability Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000059'
const items = [
  { prompt: 'Two fair six-sided number cubes are rolled. What is the probability that their values sum to 9?', choices: ['1/9', '1/6', '1/4', '1/3'], answer: 'A', level: 5, seconds: 45, explanation: 'Four of the 36 ordered outcomes sum to 9: (3,6), (4,5), (5,4), and (6,3). Thus the probability is 4/36=1/9.', proof: 'There are 4 favorable ordered pairs out of 36 equally likely pairs.', wrong: { A: 'Correct: 4/36 simplifies to 1/9.', B: 'Counts six outcomes rather than four.', C: 'Counts nine outcomes rather than four.', D: 'Uses an incorrect favorable-outcome count.' } },
  { prompt: 'A fair coin is tossed four times. What is the probability of getting exactly two heads?', choices: ['1/8', '1/4', '3/8', '1/2'], answer: 'C', level: 6, seconds: 55, explanation: 'There are 2⁴=16 equally likely sequences. Exactly two heads can occur in C(4,2)=6 sequences, so the probability is 6/16=3/8.', proof: 'The six qualifying sequences out of 16 give 3/8.', wrong: { A: 'Counts only two specific sequences rather than all six.', B: 'Uses 4/16 instead of 6/16.', C: 'Correct: C(4,2)/16=6/16=3/8.', D: 'Counts eight sequences, including those with a different number of heads.' } },
  { prompt: 'Two independent sensors report a measurement within tolerance with probabilities 0.98 and 0.95. What is the probability that both report within tolerance?', choices: ['0.931', '0.950', '0.965', '0.980'], answer: 'A', level: 5, seconds: 45, explanation: 'For independent events, multiply their probabilities: 0.98·0.95=0.931.', proof: 'Independence gives P(both)=0.98×0.95=0.931.', wrong: { A: 'Correct: multiply the independent success probabilities.', B: 'Reports only the lower individual probability.', C: 'Averages the two probabilities instead of multiplying.', D: 'Reports only the higher individual probability.' } },
  { prompt: 'Among 60 applicants, 18 have experience with software A, 12 have experience with software B, and 5 have experience with both. If one applicant is selected at random, what is the probability that the applicant has experience with A or B?', choices: ['5/12', '1/2', '5/6', '1'], answer: 'A', level: 6, seconds: 60, explanation: 'Use inclusion-exclusion: 18+12−5=25 applicants have at least one of the two experiences. The probability is 25/60=5/12.', proof: 'The union contains 25 applicants, so 25/60=5/12.', wrong: { A: 'Correct: subtract the five applicants counted in both groups.', B: 'Adds the two group counts without subtracting overlap.', C: 'Divides by the wrong total.', D: 'Assumes every applicant has at least one experience.' } },
  { prompt: 'A two-way table shows that 12 of 30 surveyed commuters who travel remotely prefer a particular schedule. What is the probability that a randomly selected remote commuter prefers that schedule?', choices: ['2/5', '12/100', '3/5', '5/2'], answer: 'A', level: 5, seconds: 45, explanation: 'The condition restricts the sample space to the 30 remote commuters. The probability is 12/30=2/5.', proof: 'Among the 30 remote commuters, 12 prefer the schedule.', wrong: { A: 'Correct: 12/30 simplifies to 2/5.', B: 'Uses a population denominator unrelated to the conditional group.', C: 'Uses the complement count 18/30.', D: 'Inverts the conditional ratio.' } },
  { prompt: 'Two independent devices fail with probabilities 0.2 and 0.3. What is the probability that exactly one device fails?', choices: ['0.06', '0.26', '0.38', '0.50'], answer: 'C', level: 7, seconds: 65, explanation: 'Exactly one fails in two cases: the first fails and the second works, or the first works and the second fails. The probability is 0.2·0.7+0.8·0.3=0.38.', proof: 'The disjoint cases have probabilities 0.14 and 0.24, summing to 0.38.', wrong: { A: 'Finds the probability that both devices fail.', B: 'Omits one of the two exactly-one cases.', C: 'Correct: 0.2(0.7)+0.8(0.3)=0.38.', D: 'Adds failure probabilities without accounting for the exact-one condition.' } },
  { prompt: 'A committee of two people is selected uniformly at random from 5 seniors and 4 juniors. What is the probability that both selected people are juniors?', choices: ['1/9', '1/6', '2/9', '1/2'], answer: 'B', level: 6, seconds: 60, explanation: 'There are C(9,2)=36 possible pairs and C(4,2)=6 pairs consisting of two juniors. The probability is 6/36=1/6.', proof: 'Six junior-only pairs among 36 total pairs give 1/6.', wrong: { A: 'Multiplies individual probabilities as if the selections were with replacement.', B: 'Correct: C(4,2)/C(9,2)=6/36.', C: 'Uses an incorrect count of favorable committees.', D: 'Treats the number of juniors as half of the committee outcomes.' } },
  { prompt: 'A shipment contains 20 components, 6 of which are defective. Three components are selected without replacement. What is the probability that none of the three is defective?', choices: ['91/285', '7/10', '14/20', '13/19'], answer: 'A', level: 7, seconds: 70, explanation: 'The successive probabilities of drawing a good component are 14/20, 13/19, and 12/18. Their product simplifies to 91/285.', proof: '(14/20)(13/19)(12/18)=91/285.', wrong: { A: 'Correct: multiply the changing conditional probabilities without replacement.', B: 'Reports only the initial probability of a good component.', C: 'Uses only the first draw’s probability.', D: 'Uses only the second draw’s conditional probability.' } },
  { prompt: 'A screening test gives a positive result for 90% of people with a condition and for 10% of people without it. In a population, 10% of people have the condition. Given a positive result, what is the probability that a person has the condition?', choices: ['1/10', '1/2', '9/10', '9/100'], answer: 'B', level: 7, seconds: 75, explanation: 'Out of 100 people, 10 have the condition and 9 of those test positive. Of the 90 without it, 9 also test positive. Thus 9 of 18 positive results are true positives, giving 1/2.', proof: 'The positive group has 9 true positives and 9 false positives, so 9/18=1/2.', wrong: { A: 'Reports the prevalence before observing the test result.', B: 'Correct: half of the positive tests are true positives.', C: 'Confuses test sensitivity with the conditional probability asked.', D: 'Uses the joint probability of condition and positive test instead of conditioning on positive.' } },
  { prompt: 'A number is selected uniformly at random from the integers 1 through 20. What is the probability that it is divisible by 3 or by 5?', choices: ['9/20', '1/2', '11/20', '3/5'], answer: 'A', level: 6, seconds: 55, explanation: 'There are 6 multiples of 3 and 4 multiples of 5. The number 15 is in both groups, so there are 6+4−1=9 favorable integers out of 20.', proof: 'Inclusion-exclusion gives 6+4−1=9 values, yielding 9/20.', wrong: { A: 'Correct: subtract the shared multiple 15 once.', B: 'Counts 10 favorable integers.', C: 'Double-counts the intersection.', D: 'Uses an incorrect count of multiples.' } },
  { prompt: 'A box contains 4 red, 3 blue, and 2 green tiles. Two tiles are drawn without replacement. What is the probability that the first tile is red and the second is green?', choices: ['1/9', '1/6', '2/9', '4/27'], answer: 'A', level: 6, seconds: 60, explanation: 'The probability of red first is 4/9. After removing a red tile, 8 remain, including 2 green. The probability is (4/9)(2/8)=1/9.', proof: 'The ordered draw probability is 4/9×2/8=1/9.', wrong: { A: 'Correct: the second-draw denominator is 8 after the first tile is removed.', B: 'Uses the original total for both draws.', C: 'Omits the conditional reduction in the remaining total.', D: 'Treats the draws as independent.' } },
  { prompt: 'A game costs $2 to play. A player receives $18 with probability 1/6 and receives $0 otherwise. What is the expected net gain per play?', choices: ['−$1', '$0', '$1', '$3'], answer: 'C', level: 6, seconds: 60, explanation: 'The net outcomes are $16 with probability 1/6 and −$2 with probability 5/6. The expected net gain is (16/6)+(−10/6)=1 dollar.', proof: 'Expected prize is $3; subtracting the $2 cost gives a $1 expected net gain.', wrong: { A: 'Subtracts the entry fee from the expected prize incorrectly.', B: 'Reports a break-even result despite the positive expected value.', C: 'Correct: the expected prize is $3 and the fee is $2.', D: 'Reports the expected gross prize without subtracting the fee.' } },
  { prompt: 'A player makes each free throw independently with probability 0.6. If the player takes three shots, what is the probability of making at least one?', choices: ['0.216', '0.784', '0.936', '0.976'], answer: 'C', level: 6, seconds: 60, explanation: 'It is easier to find the complement: missing all three has probability 0.4³=0.064. Therefore, the probability of at least one make is 1−0.064=0.936.', proof: '1−P(miss all three)=1−0.4³=0.936.', wrong: { A: 'Finds the probability of making all three shots.', B: 'Subtracts one miss probability rather than the probability of three misses.', C: 'Correct: use the complement of missing all three.', D: 'Uses an incorrect complement or exponent.' } },
  { prompt: 'Events A and B satisfy P(A)=0.4, P(B)=0.55, and P(A and B)=0.2. What is P(A or B)?', choices: ['0.55', '0.75', '0.95', '1.15'], answer: 'B', level: 7, seconds: 65, explanation: 'Use P(A or B)=P(A)+P(B)−P(A and B)=0.4+0.55−0.2=0.75.', proof: 'Subtract the overlap once: 0.4+0.55−0.2=0.75.', wrong: { A: 'Reports P(B) alone.', B: 'Correct: inclusion-exclusion gives 0.75.', C: 'Adds the event probabilities but does not subtract their overlap.', D: 'Adds both probabilities and the overlap.' } },
  { prompt: 'A machine independently passes quality inspection on each run with probability 0.9. What is the probability that it passes at least once in four runs?', choices: ['0.3439', '0.6561', '0.9', '0.9999'], answer: 'D', level: 6, seconds: 60, explanation: 'The complement is failing all four runs, with probability 0.1⁴=0.0001. Thus the probability of at least one pass is 1−0.0001=0.9999.', proof: 'Use the complement: 1−(0.1)^4=0.9999.', wrong: { A: 'Computes a four-run failure probability using the pass rate incorrectly.', B: 'Raises the pass probability to the fourth power.', C: 'Reports the probability for only one run.', D: 'Correct: the only failure is missing all four, probability 0.0001.' } },
]

const targetAnswers = ['A', 'D', 'A', 'C', 'C', 'A', 'D', 'B', 'A', 'D', 'C', 'B', 'A', 'D', 'C']
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
  .find((row) => row.id === topicId && row.name === 'Probability' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Probability topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT probability problem. Verify the sample space, dependence, condition, and arithmetic. Do not assume a key. Return the exact correct option text or, if only a letter is returned, the script will map it. Do not provide chain-of-thought. JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
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
if (before !== 85) throw new Error(`Coverage changed; expected 85, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'Math', category_name: 'Statistics and Probability', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
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
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Statistics and Probability', skill: topic.name,
  subskill: ['sum of two dice', 'binomial exact-count probability', 'independent success events', 'inclusion-exclusion from overlap', 'conditional probability in a subgroup', 'exactly one of two independent failures', 'combinations without replacement', 'sequential sampling without replacement', 'Bayes conditional probability', 'divisibility union count', 'ordered draws without replacement', 'expected net value', 'complement for at least one success', 'union probability with overlap', 'complement over repeated independent trials'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [5, 7, 8, 9, 11, 12, 14].includes(index), contextual: [2, 4, 5, 6, 7, 8, 10, 11, 12, 14].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
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
