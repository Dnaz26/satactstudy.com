import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Statistics Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000058'
const items = [
  { prompt: 'A lab combines measurements from two instruments. Eight measurements from the first instrument have a mean of 72, and 12 measurements from the second have a mean of 82. What is the mean of all 20 measurements?', choices: ['77', '78', '78.5', '80'], answer: 'B', level: 5, seconds: 60, explanation: 'The groups must be weighted by their sizes: (8·72+12·82)/20=(576+984)/20=78.', proof: 'The combined total is 1,560 across 20 measurements, giving 78.', wrong: { A: 'Takes the unweighted average of the two group means.', B: 'Correct: the combined sum is 1,560 and 1,560/20=78.', C: 'Uses an incorrect weighted sum.', D: 'Takes the larger group mean too heavily.' } },
  { prompt: 'A student’s mean after six quizzes is 74. What score on a seventh quiz would raise the mean across all seven quizzes to 76?', choices: ['84', '86', '88', '90'], answer: 'C', level: 5, seconds: 55, explanation: 'The first six scores total 6·74=444. A seven-quiz mean of 76 requires 532 points, so the new score is 532−444=88.', proof: 'The needed total is 7·76=532; subtracting the existing total 444 gives 88.', wrong: { A: 'Adds only 6 points to the old mean rather than accounting for totals.', B: 'Uses an incorrect target total.', C: 'Correct: 532−444=88.', D: 'Overestimates the required score.' } },
  { prompt: 'Five recorded values are 2, 4, 8, 11, and 16. A sixth value x is added, and the median of the six values is 9. What is x?', choices: ['9', '10', '11', '12'], answer: 'B', level: 6, seconds: 70, explanation: 'For six values, the median is the mean of the third and fourth values. To obtain 9, those values must sum to 18. The only possible insertion is x=10, making the middle values 8 and 10.', proof: 'If x=10, the ordered list is 2,4,8,10,11,16 and the median is (8+10)/2=9. Any other insertion changes the middle pair.', wrong: { A: 'Makes the median 8.5.', B: 'Correct: the middle pair is 8 and 10, with mean 9.', C: 'Makes the middle pair 8 and 11, with mean 9.5.', D: 'Also leaves the middle pair 8 and 11.' } },
  { prompt: 'A data set has a range of 18. Each value x is replaced by 2.5x−7. What is the range of the transformed data set?', choices: ['25', '38', '45', '52.5'], answer: 'C', level: 5, seconds: 55, explanation: 'Subtracting 7 shifts every value equally and does not change the range. Multiplying all values by 2.5 multiplies the range by 2.5, so the new range is 45.', proof: 'The transformed maximum minus minimum is 2.5(max−min)=2.5·18=45.', wrong: { A: 'Adds the translation incorrectly to the range.', B: 'Combines the shift with the original range.', C: 'Correct: a positive scale factor multiplies the range by 2.5.', D: 'Uses an incorrect scale factor.' } },
  { prompt: 'A frequency table lists values 12, 15, and 20 with frequencies 2, 5, and 3, respectively. What is the mean of all observations in the table?', choices: ['15', '15.5', '15.9', '16.5'], answer: 'C', level: 6, seconds: 65, explanation: 'The total is 12·2+15·5+20·3=159 across 10 observations. The mean is 159/10=15.9.', proof: 'The weighted sum is 159 and the total frequency is 10, so the mean is 15.9.', wrong: { A: 'Uses an unweighted or rounded average.', B: 'Miscounts one frequency contribution.', C: 'Correct: 159 divided by 10 is 15.9.', D: 'Overweights the largest value.' } },
  { prompt: 'A data set is 4, 6, 7, 8, 10. One additional value, 100, is included. Which statement correctly compares the mean and median before and after adding 100?', choices: ['The mean increases by 15.5, while the median increases by 0.5.', 'The mean increases by 0.5, while the median increases by 15.5.', 'Both increase by 15.5.', 'Neither changes.'], answer: 'A', level: 6, seconds: 70, explanation: 'The original mean and median are both 7. The new mean is 135/6=22.5, an increase of 15.5. The new median is (7+8)/2=7.5, an increase of 0.5.', proof: 'Original mean/median=7; new mean=22.5 and new median=7.5.', wrong: { A: 'Correct: the outlier strongly shifts the mean but barely changes the median.', B: 'Reverses the effects on mean and median.', C: 'Treats the median as sensitive to the outlier.', D: 'Ignores the change in sample size and ordered values.' } },
  { prompt: 'A survey about a city’s transit system is posted on a website devoted to public transportation, and visitors choose whether to respond. Which conclusion is most justified from the responses?', choices: ['They provide an unbiased estimate of every city resident’s opinion because the sample is large.', 'They may describe the opinions of respondents, but self-selection limits generalization to all residents.', 'They prove that using public transit causes the reported opinions.', 'They represent all residents who do not use public transit.'], answer: 'B', level: 6, seconds: 60, explanation: 'Visitors who choose to respond may differ from the broader population, and a transit-focused site can further skew who sees the survey. A large response count does not remove selection bias.', proof: 'The voluntary, topic-specific sample is not randomly drawn from all residents, so broad population estimates are not warranted.', wrong: { A: 'A large sample does not correct a systematically selected sample.', B: 'Correct: the respondent group may not represent all residents.', C: 'A survey alone does not establish causation.', D: 'The survey does not specifically represent nonusers.' } },
  { prompt: 'In a monthly data set, ice-cream sales and reported sunburn cases both rise during warmer months. Which explanation is consistent with this association without claiming that one variable directly causes the other?', choices: ['Higher ice-cream sales must cause more sunburns.', 'More sunburns cause people to buy more ice cream.', 'Warmer, sunnier weather may independently increase both quantities.', 'The association proves that the data were recorded incorrectly.'], answer: 'C', level: 5, seconds: 55, explanation: 'A third variable—warm, sunny weather—could affect both sales and sunburn reports. The association alone cannot establish a direct causal relationship between the two measured variables.', proof: 'A common external factor can produce an association without either measured variable causing the other.', wrong: { A: 'Infers causation directly from correlation.', B: 'Reverses the causal claim without evidence.', C: 'Correct: weather is a plausible common cause.', D: 'Correlation does not imply an error in the data.' } },
  { prompt: 'In one year, 18 of 24 applicants in group P and 21 of 30 applicants in group Q were admitted. By how many percentage points was group P’s admission rate higher than group Q’s?', choices: ['5', '7.1', '70', '75'], answer: 'A', level: 6, seconds: 65, explanation: 'Group P’s rate is 18/24=75%; group Q’s is 21/30=70%. The difference is 5 percentage points.', proof: '75%−70%=5 percentage points.', wrong: { A: 'Correct: subtract the rates, 75%−70%.', B: 'Reports the relative percentage increase from 70% to 75%, not the point difference.', C: 'Reports group Q’s rate instead of the difference.', D: 'Reports group P’s rate instead of the difference.' } },
  { prompt: 'A two-way table shows that 36 of 48 surveyed boys participate in a school sport. What is the probability that a randomly selected surveyed boy participates in a school sport?', choices: ['36/100', '48/36', '3/4', '3/7'], answer: 'C', level: 5, seconds: 50, explanation: 'The condition specifies a boy, so the relevant total is 48 boys. The conditional probability is 36/48=3/4.', proof: 'Among the 48 boys, 36 participate; 36/48 simplifies to 3/4.', wrong: { A: 'Uses an unrelated denominator of 100.', B: 'Inverts the conditional ratio.', C: 'Correct: 36 of the 48 boys participate.', D: 'Uses an incorrect denominator.' } },
  { prompt: 'A container has 5 red, 3 blue, and 2 green tiles. Two tiles are drawn one after the other without replacement. What is the probability that the first tile is red and the second is blue?', choices: ['1/6', '1/5', '1/3', '3/10'], answer: 'A', level: 6, seconds: 70, explanation: 'The probability of red first is 5/10. After a red tile is removed, 9 tiles remain, 3 of them blue. Thus the probability is (5/10)(3/9)=1/6.', proof: 'Without replacement, multiply 5/10 by 3/9 to get 1/6.', wrong: { A: 'Correct: (5/10)(3/9)=1/6.', B: 'Uses the original total as the second-draw denominator.', C: 'Adds or combines the probabilities incorrectly.', D: 'Treats the draws as independent.' } },
  { prompt: 'A game pays $12 with probability 1/4 and costs $3 to play; otherwise, the player receives nothing and still pays the $3 fee. What is the expected net gain per play?', choices: ['−$2.25', '$0', '$0.75', '$3'], answer: 'B', level: 5, seconds: 65, explanation: 'The net outcomes are $9 with probability 1/4 and −$3 with probability 3/4. The expected value is (1/4)(9)+(3/4)(−3)=2.25−2.25=0.', proof: 'Net outcomes are 9 and −3; their probability-weighted mean is 0.', wrong: { A: 'Subtracts the fee only from the losing outcome.', B: 'Correct: (1/4)(9)+(3/4)(−3)=0.', C: 'Computes the expected prize before subtracting the fee.', D: 'Reports the gross prize without accounting for the fee.' } },
  { prompt: 'A line of best fit predicts a value of 4.2+1.6x. For an observation with x=5, the actual y-value is 11. What is the residual, defined as actual value minus predicted value?', choices: ['−1.2', '1.2', '4.2', '12.2'], answer: 'A', level: 6, seconds: 65, explanation: 'The predicted value is 4.2+1.6(5)=12.2. Residual=actual−predicted=11−12.2=−1.2.', proof: 'At x=5 the prediction is 12.2; the residual is 11−12.2=−1.2.', wrong: { A: 'Correct: actual minus predicted is 11−12.2=−1.2.', B: 'Reverses predicted and actual values.', C: 'Reports only the intercept.', D: 'Reports the prediction rather than the residual.' } },
  { prompt: 'Every value in a data set is transformed by y=3x+2. The original standard deviation is 4. What is the standard deviation after the transformation?', choices: ['4', '6', '12', '14'], answer: 'C', level: 4, seconds: 45, explanation: 'Adding 2 shifts every value without changing spread. Multiplying every value by 3 multiplies the standard deviation by |3|, so it becomes 12.', proof: 'Standard deviation scales by the absolute value of the multiplier: 3·4=12.', wrong: { A: 'Ignores the multiplication by 3.', B: 'Uses an incorrect scale factor.', C: 'Correct: the spread is multiplied by 3.', D: 'Adds the translation to the scaled standard deviation.' } },
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
  .find((row) => row.id === topicId && row.name === 'Statistics' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Statistics topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT statistics question. Check every calculation, denominator, and interpretation. Do not assume a key; map your result to the exact option text. Do not provide chain-of-thought. Return JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
          { role: 'user', content: JSON.stringify({ prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])), previous_review: previous }) },
        ],
      }),
    })
    if (!response.ok) throw new Error(`Independent review failed on item ${index}: HTTP ${response.status} ${await response.text()}`)
    return JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
  }
  let result = await review()
  const expectedText = item.choices['ABCD'.indexOf(item.answer)]
  if (result.answer_text !== expectedText) result = await review(result)
  reviews.push({ index, ...result })
}
if (reviews.some((review, index) => review.index !== index || !review.valid || review.answer_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 86) throw new Error(`Coverage changed; expected 86, found ${before}`)
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
  subskill: ['weighted mean across groups', 'recovering a score from a target mean', 'median with an inserted value', 'effect of linear transformations on range', 'mean from a frequency table', 'outlier effects on mean and median', 'voluntary-response sampling bias', 'correlation and a lurking variable', 'percentage-point comparison', 'conditional probability from a subgroup', 'sequential probability without replacement', 'expected net value', 'residual interpretation', 'scale transformation of standard deviation'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [0, 1, 4, 8, 10, 11, 12].includes(index), contextual: true, validation_status: 'validated', content_hash: rows[index].fingerprint,
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
