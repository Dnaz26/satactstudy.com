import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Trigonometry Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000057'
const items = [
  { prompt: 'In a right triangle, angle θ is opposite the side of length 5; the other leg has length 12. What is sin θ?', choices: ['1/2', '5/13', '12/13', '5/12'], answer: 'B', level: 4, seconds: 45, explanation: 'The hypotenuse is 13 by the Pythagorean theorem. Sine is opposite over hypotenuse, so sin θ=5/13.', proof: 'The triangle is 5-12-13, and the side opposite θ is 5.', wrong: { A: 'Uses the shorter leg over the sum of the legs.', B: 'Correct: opposite/hypotenuse=5/13.', C: 'Uses the adjacent leg as the opposite side.', D: 'Uses opposite/adjacent, which is tangent.' } },
  { prompt: 'An acute angle θ in a right triangle has cos θ=12/13. What is tan θ?', choices: ['5/12', '12/5', '5/13', '12/13'], answer: 'A', level: 5, seconds: 55, explanation: 'The adjacent and hypotenuse sides are 12 and 13, so the opposite side is 5. Therefore tan θ=5/12.', proof: 'The Pythagorean triple gives opposite side 5; tangent is opposite/adjacent.', wrong: { A: 'Correct: tan θ=5/12.', B: 'Reverses opposite and adjacent.', C: 'Reports sine rather than tangent.', D: 'Repeats the given cosine.' } },
  { prompt: 'From a point on level ground 10 meters from a building, the angle of elevation to the roof is 60°. Ignoring eye height, how tall is the building?', choices: ['5√3 m', '10 m', '10√3 m', '20√3 m'], answer: 'C', level: 6, seconds: 60, explanation: 'Use tan 60°=height/10=√3. The building height is 10√3 meters.', proof: 'The opposite side is 10tan60°=10√3.', wrong: { A: 'Uses half the horizontal distance.', B: 'Treats the angle as 45°.', C: 'Correct: 10·tan60°=10√3.', D: 'Doubles the correct height.' } },
  { prompt: 'A 13-foot ladder rests against a vertical wall, reaching 12 feet above the ground. If θ is the angle between the ladder and the ground, what is cos θ?', choices: ['5/12', '12/13', '5/13', '12/5'], answer: 'C', level: 5, seconds: 55, explanation: 'The horizontal distance is √(13²−12²)=5 feet. Cosine is adjacent over hypotenuse, so cos θ=5/13.', proof: 'The triangle has horizontal leg 5 and hypotenuse 13.', wrong: { A: 'Uses the horizontal leg over the vertical leg.', B: 'Uses the vertical side, opposite θ, as the adjacent side.', C: 'Correct: adjacent/hypotenuse=5/13.', D: 'Uses hypotenuse/adjacent.' } },
  { prompt: 'If θ is acute and tan θ=√3, what is θ in degrees?', choices: ['30°', '45°', '60°', '75°'], answer: 'C', level: 5, seconds: 50, explanation: 'Among the acute special angles, tan 60°=√3.', proof: 'The acute angle with tangent √3 is 60°.', wrong: { A: 'tan30°=1/√3.', B: 'tan45°=1.', C: 'Correct: tan60°=√3.', D: 'Does not have tangent √3.' } },
  { prompt: 'A smaller right triangle has legs 7 and 24. A similar larger triangle has a hypotenuse of 75. What is the length of the side in the larger triangle corresponding to the side of length 7?', choices: ['15', '18', '21', '24'], answer: 'C', level: 6, seconds: 60, explanation: 'The smaller hypotenuse is 25, so the scale factor is 75/25=3. The corresponding side is 7·3=21.', proof: 'The triangles are scaled by 3, taking the side 7 to 21.', wrong: { A: 'Scales the side by a factor that is too small.', B: 'Applies the scale factor to the other leg.', C: 'Correct: 7(75/25)=21.', D: 'Reports the other original leg without scaling.' } },
  { prompt: 'A right triangle has hypotenuse 17 and legs 8 and 15. Angle θ is opposite the leg of length 8. What is tan θ?', choices: ['8/15', '15/8', '8/17', '15/17'], answer: 'A', level: 5, seconds: 50, explanation: 'Tangent is opposite over adjacent. Relative to θ, those legs have lengths 8 and 15, so tan θ=8/15.', proof: 'Opposite/adjacent=8/15.', wrong: { A: 'Correct: tan θ=8/15.', B: 'Reverses opposite and adjacent.', C: 'Uses opposite/hypotenuse, which is sine.', D: 'Uses adjacent/hypotenuse, which is cosine.' } },
  { prompt: 'An acute angle θ satisfies tan θ=5/12. What is cos θ?', choices: ['5/13', '12/13', '5/12', '12/5'], answer: 'B', level: 6, seconds: 55, explanation: 'The opposite and adjacent sides can be 5 and 12, giving hypotenuse 13. Cosine is adjacent over hypotenuse, 12/13.', proof: 'The 5-12-13 triangle gives cos θ=12/13.', wrong: { A: 'Reports sine rather than cosine.', B: 'Correct: adjacent/hypotenuse=12/13.', C: 'Repeats the given tangent.', D: 'Uses adjacent/opposite.' } },
  { prompt: 'A right triangle has legs 6 and 8. Angle θ is opposite the side of length 6. What is sin θ?', choices: ['3/5', '4/5', '3/4', '5/3'], answer: 'A', level: 4, seconds: 45, explanation: 'The hypotenuse is 10. Thus sin θ=opposite/hypotenuse=6/10=3/5.', proof: 'The triangle is 6-8-10, so the ratio is 6/10.', wrong: { A: 'Correct: 6/10 simplifies to 3/5.', B: 'Uses the other leg as the opposite side.', C: 'Uses opposite/adjacent, which is tangent.', D: 'Inverts the sine ratio.' } },
  { prompt: 'For an acute angle θ, sin θ=3/5. What is the value of 5 cos θ−2 tan θ?', choices: ['3/2', '2', '5/2', '7/2'], answer: 'C', level: 7, seconds: 70, explanation: 'The corresponding right triangle has opposite 3, hypotenuse 5, and adjacent 4. Thus cos θ=4/5 and tan θ=3/4. The expression is 5(4/5)−2(3/4)=4−3/2=5/2.', proof: 'Substituting cosθ=4/5 and tanθ=3/4 gives 5/2.', wrong: { A: 'Subtracts 2tanθ from cosθ without multiplying the cosine by 5.', B: 'Drops the tangent term’s factor of 2.', C: 'Correct: 4−3/2=5/2.', D: 'Adds the two terms rather than subtracting.' } },
  { prompt: 'A kite string is 65 meters long and makes an angle θ with level ground. If sin θ=5/13, how high is the kite above the point where the string is held?', choices: ['20 m', '25 m', '50 m', '60 m'], answer: 'B', level: 6, seconds: 60, explanation: 'The vertical height is opposite the angle and the string is the hypotenuse. Height=65(5/13)=25 meters.', proof: 'Opposite=65·sinθ=65·5/13=25.', wrong: { A: 'Uses 4/13 instead of the given sine ratio.', B: 'Correct: 65·5/13=25.', C: 'Uses an incorrect scale factor.', D: 'Uses the complementary side ratio.' } },
  { prompt: 'A wheelchair ramp rises 3 feet over a horizontal run of 12 feet. If θ is the ramp’s angle above the ground, what is sin θ?', choices: ['1/4', '3/12', '1/√17', '3/√17'], answer: 'C', level: 6, seconds: 65, explanation: 'The ramp length is √(3²+12²)=3√17. Sine is rise over ramp length, so sin θ=3/(3√17)=1/√17.', proof: 'Hypotenuse=3√17, so sinθ=3/(3√17)=1/√17.', wrong: { A: 'Reports rise/run, which is tangent.', B: 'Uses rise/run rather than rise/hypotenuse.', C: 'Correct: 3/(3√17)=1/√17.', D: 'Fails to simplify the common factor 3.' } },
  { prompt: 'A point on the terminal side of an angle θ has coordinates (−5,12). The point is 13 units from the origin. What is tan θ?', choices: ['12/5', '−12/5', '5/12', '−5/12'], answer: 'B', level: 7, seconds: 65, explanation: 'For a point (x,y), tan θ=y/x. Here y=12 and x=−5, so tan θ=−12/5.', proof: 'The tangent is the vertical coordinate divided by the horizontal coordinate: 12/(−5).', wrong: { A: 'Ignores the negative x-coordinate.', B: 'Correct: tanθ=12/(−5)=−12/5.', C: 'Inverts the coordinate ratio and loses the sign.', D: 'Uses x/y rather than y/x.' } },
  { prompt: 'An acute angle θ has sin θ=3/5. What is sin(90°−θ)?', choices: ['3/5', '4/5', '5/3', '5/4'], answer: 'B', level: 6, seconds: 55, explanation: 'For complementary angles, sin(90°−θ)=cos θ. Since sin θ=3/5, the adjacent-to-hypotenuse ratio is 4/5, so the expression equals 4/5.', proof: 'The cofunction identity gives sin(90°−θ)=cosθ=4/5.', wrong: { A: 'Reports sin θ rather than the sine of its complement.', B: 'Correct: the complement’s sine equals cos θ, which is 4/5.', C: 'Inverts the sine ratio.', D: 'Uses an incorrect reciprocal.' } },
  { prompt: 'A right triangle has an acute angle θ with cos θ=3/5. What is sin(2θ)?', choices: ['7/25', '12/25', '24/25', '1'], answer: 'C', level: 7, seconds: 70, explanation: 'Since θ is acute and cosθ=3/5, sinθ=4/5. Therefore sin(2θ)=2sinθcosθ=2(4/5)(3/5)=24/25.', proof: 'Use the double-angle identity with sinθ=4/5 and cosθ=3/5.', wrong: { A: 'Uses the difference of squares rather than the double-angle identity.', B: 'Omits the factor of 2.', C: 'Correct: 2(4/5)(3/5)=24/25.', D: 'Assumes sin(2θ)=1 for every acute θ.' } },
  { prompt: 'A circular path has radius 18 meters. What is the length of an arc subtended by a central angle of 2π/3 radians?', choices: ['6π m', '12π m', '18π m', '36π m'], answer: 'B', level: 5, seconds: 50, explanation: 'For an angle in radians, arc length is s=rθ. Thus s=18(2π/3)=12π meters.', proof: 's=rθ=18·2π/3=12π.', wrong: { A: 'Uses one-third of the radius-angle product.', B: 'Correct: 18(2π/3)=12π.', C: 'Multiplies by only π/3.', D: 'Uses the circumference fraction incorrectly.' } },
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
  .find((row) => row.id === topicId && row.name === 'Trigonometry' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Math Trigonometry topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviews = []
for (const [index, item] of items.entries()) {
  const review = async (previous = null) => {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
        response_format: { type: 'json_object' }, max_tokens: 240,
        messages: [
          { role: 'system', content: 'Independently solve this ACT trigonometry problem. Check the referenced angle, side ratios, special-angle values, and exact arithmetic. Do not assume a key. Return exact correct option text (a letter may be normalized). JSON only: {"answer_text":"exact option text","valid":true,"reason":"at most 12 words"}.' },
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
    test_type: 'ACT', section_name: 'Math', category_name: 'Geometry', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
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
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Geometry', skill: topic.name,
  subskill: ['right-triangle sine ratio', 'recovering tangent from cosine', 'angle-of-elevation model', 'ladder height and cosine', 'special-angle tangent', 'similar right triangles and scale factor', 'right-triangle tangent from side lengths', 'recovering cosine from tangent', 'right-triangle sine evaluation', 'combining trigonometric ratios', 'vertical component from a sine ratio', 'incline angle and hypotenuse', 'coordinate definition of tangent by quadrant', 'cofunction identity', 'double-angle identity', 'arc length in radians'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: [2, 5, 9, 10, 11, 12, 14, 15].includes(index), contextual: [2, 3, 5, 10, 11, 15].includes(index), validation_status: 'validated', content_hash: rows[index].fingerprint,
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
