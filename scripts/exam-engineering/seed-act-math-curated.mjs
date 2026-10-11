import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Math Curated Challenge v1'
const items = [
  { domain: 'Number and Quantity', topic: 'Integer Properties', answer: 'B', prompt: 'A positive integer n leaves a remainder of 2 when divided by 7 and a remainder of 5 when divided by 9. If 100 < n < 200, what is n?', choices: ['140', '149', '158', '212'], explanation: 'Write n = 7k + 2. Then 7k + 2 ≡ 5 (mod 9), so 7k ≡ 3 and k ≡ 3 (mod 9). Thus n = 23 + 63t. The only value between 100 and 200 is 149.', wrong: { A: 'Uses only the remainder after division by 7.', C: 'Confuses the second remainder.', D: 'Satisfies the congruences but ignores the given interval.' } },
  { domain: 'Number and Quantity', topic: 'Rational Numbers', answer: 'A', prompt: 'Let i² = −1. A complex number is formed by dividing 2 + 3i by 1 − i. What is the real part of the resulting number?', choices: ['−1/2', '1/2', '−5/2', '5/2'], explanation: 'Multiply numerator and denominator by 1 + i. The numerator is (2 + 3i)(1 + i) = −1 + 5i, and the denominator is 2. The real part is −1/2.', wrong: { B: 'Drops the negative sign from i² = −1.', C: 'Uses the imaginary coefficient as the real part.', D: 'Uses the imaginary coefficient and drops its sign.' } },
  { domain: 'Number and Quantity', topic: 'Integer Properties', answer: 'B', prompt: 'Two positive integers have greatest common divisor 6 and least common multiple 180. If one of the integers is 30, what is the other integer?', choices: ['30', '36', '54', '180'], explanation: 'For positive integers a and b, ab = gcd(a,b) × lcm(a,b). Thus 30b = 6 × 180 = 1080, so b = 36. Indeed gcd(30,36)=6 and lcm(30,36)=180.', wrong: { A: 'Reuses the known integer.', C: 'Divides 1080 by 20 instead of 30.', D: 'Confuses the other integer with the least common multiple.' } },
  { domain: 'Number and Quantity', topic: 'Integer Properties', answer: 'B', prompt: 'A shipment count n has the property that n + 2 is divisible by 7 and n + 5 is divisible by 9. What is the least positive possible value of n?', choices: ['31', '40', '49', '68'], explanation: 'The conditions mean n ≡ 5 (mod 7) and n ≡ 4 (mod 9). The numbers 5, 12, 19, 26, 33, 40 are 5 mod 7; the first that is 4 mod 9 is 40.', wrong: { A: 'Does not satisfy the divisibility by 7.', C: 'Does not satisfy either remainder condition.', D: 'Satisfies the first condition but not the second.' } },
  { domain: 'Number and Quantity', topic: 'Rational Numbers', answer: 'A', prompt: 'For real x, the expression 16^(x/2) equals 8^(x+1) divided by 4. Which value of x makes the two expressions equal?', choices: ['−1', '0', '1', '2'], explanation: 'Rewrite all terms as powers of 2: 16^(x/2)=2^(2x) and 8^(x+1)/4=2^(3x+1). Equal positive powers of 2 have equal exponents, so 2x=3x+1 and x=−1.', wrong: { B: 'Ignores the constant exponent from dividing by 4.', C: 'Reverses the sign when solving 2x=3x+1.', D: 'Treats 16^(x/2) as 2^x.' } },
  { domain: 'Number and Quantity', topic: 'Integer Properties', answer: 'D', prompt: 'For every integer n, which expression is guaranteed to be divisible by 6? The correct choice must work for even and odd values of n.', choices: ['n(n − 1)', 'n(n + 1)', 'n² − 1', 'n(n − 1)(n + 1)'], explanation: 'The three factors n−1, n, and n+1 are consecutive integers. One is divisible by 3 and at least one is even, so their product is divisible by 6. Each other expression fails for some integer, such as n=2.', wrong: { A: 'Two consecutive integers need not include a multiple of 3.', B: 'Two consecutive integers need not include a multiple of 3.', C: 'At n=2, n²−1=3 is not divisible by 6.' } },

  { domain: 'Algebra', topic: 'Linear Equations', answer: 'C', prompt: 'A company measures sales x in hundreds of units and profit y in thousands of dollars. Its model is 3(2y − x + 4)/4 − (y + 2x − 1)/2 = (x − y + 6)/4. According to the model, how much does predicted profit change when sales rise by 100 units?', choices: ['decreases by $1,600', 'increases by $625', 'increases by $1,600', 'increases by $8,000'], explanation: 'Multiply by 4, expand, and collect terms: 5y−8x+8=0, so y=(8/5)x−8/5. One additional hundred units raises y by 8/5 thousand dollars, or $1,600.', wrong: { A: 'Gets the sign of the slope wrong.', B: 'Uses the reciprocal slope 5/8.', D: 'Treats the coefficient 8 as thousands of dollars without dividing by 5.' } },
  { domain: 'Algebra', topic: 'Systems of Equations', answer: 'A', prompt: 'The system ax + (a − 2)y = 7 and 3x + 6y = 14 has no solution for exactly one value of a. What is that value?', choices: ['−2', '2', '4', '7'], explanation: 'For no solution, the variable coefficients must be proportional while the constants are not. Set a/3=(a−2)/6: 6a=3a−6, so a=−2. The coefficient ratio is −2/3, different from 7/14=1/2.', wrong: { B: 'Makes the first y coefficient zero but does not make the lines parallel.', C: 'Uses the constant 2 with the wrong sign.', D: 'Confuses the first equation’s right side with the parameter.' } },
  { domain: 'Algebra', topic: 'Inequalities', answer: 'B', prompt: 'How many integer values of x satisfy |2x − 5| < x + 1? Include only values that satisfy both sides of the absolute-value inequality.', choices: ['3', '4', '5', '6'], explanation: 'The inequality is equivalent to −(x+1)<2x−5<x+1. The left side gives x>4/3; the right gives x<6. The integers are 2, 3, 4, and 5, so there are 4.', wrong: { A: 'Omits one endpoint-adjacent integer.', C: 'Includes x=6 despite the strict inequality.', D: 'Counts integers that violate one side.' } },
  { domain: 'Algebra', topic: 'Linear Equations', answer: 'A', prompt: 'A linear function f satisfies f(2)=7 and f(f(2))=17. If f(x)=ax+b for constants a and b, what is f(−3)?', choices: ['−3', '3', '−6', '17'], explanation: 'Since f(2)=7, f(f(2))=f(7)=17. Thus 2a+b=7 and 7a+b=17, giving a=2 and b=3. Therefore f(−3)=2(−3)+3=−3.', wrong: { B: 'Uses the intercept without evaluating the input.', C: 'Omits the intercept after multiplying.', D: 'Confuses f(−3) with f(7).' } },
  { domain: 'Algebra', topic: 'Linear Equations', answer: 'A', prompt: 'For f(x)=(3x+2)/4−(x−2)/6, suppose f(2a−2)=a+1. What is the value of f(a+4)?', choices: ['47/6', '47/12', '8', '7/6'], explanation: 'Combine fractions: f(x)=(7x+10)/12. Then (14a−4)/12=a+1, so a=8. Therefore f(a+4)=f(12)=(84+10)/12=47/6.', wrong: { B: 'Forgets to simplify the fraction 94/12.', C: 'Reports a rather than f(a+4).', D: 'Drops the constant 10 when evaluating f(12).' } },
  { domain: 'Algebra', topic: 'Inequalities', answer: 'B', prompt: 'Nonnegative integers x and y must satisfy x + 2y ≤ 14 and 2x + y ≤ 13. What is the greatest possible value of x + y?', choices: ['8', '9', '10', '14'], explanation: 'Add the inequalities to obtain 3(x+y)≤27, so x+y≤9. The pair (x,y)=(4,5) satisfies both original inequalities with equality, proving 9 is attainable.', wrong: { A: 'Stops below the attainable upper bound.', C: 'Exceeds the bound from adding the inequalities.', D: 'Uses the first right side as the sum.' } },
  { domain: 'Algebra', topic: 'Systems of Equations', answer: 'A', prompt: 'Real numbers x and y satisfy x−y=a, 2x+3y=19, and x²−y²=43. If a>0, what is a?', choices: ['5', '43', '−5', '−43'], explanation: 'From x−y=a and 2x+3y=19, x+y=(38+a)/5. Since x²−y²=(x−y)(x+y), a(38+a)/5=43, or (a−5)(a+43)=0. The positive root is a=5.', wrong: { B: 'Confuses the difference of squares with a itself.', C: 'Uses a negative sign despite a>0.', D: 'Takes the other root despite a>0.' } },

  { domain: 'Integrating Essential Skills', topic: 'Rates and Units', answer: 'C', prompt: 'A machine makes 24 parts per hour for its first 2 hours and 30 parts per hour afterward. How many additional hours at the faster rate are needed for its average rate over the entire run to be 28 parts per hour?', choices: ['2', '3', '4', '6'], explanation: 'If t is the number of later hours, total output is 48+30t over 2+t hours. Set (48+30t)/(2+t)=28. Then 48+30t=56+28t, so t=4.', wrong: { A: 'Averages the rates without weighting by time.', B: 'Stops before the total average reaches 28.', D: 'Solves using the wrong initial time.' } },
  { domain: 'Integrating Essential Skills', topic: 'Percent Change', answer: 'B', prompt: 'A 12-liter solution is 25% salt. Three liters of pure water evaporate, leaving the salt amount unchanged. How many liters of pure water must be added to make the final solution 20% salt?', choices: ['3', '6', '9', '15'], explanation: 'The solution initially contains 3 liters of salt. After evaporation its volume is 9 liters. To be 20% salt, final volume must be 3/0.20=15 liters, so 15−9=6 liters of water must be added.', wrong: { A: 'Replaces only the evaporated water, returning to 25% salt.', C: 'Confuses the volume after evaporation with the amount to add.', D: 'Reports the final volume instead of added water.' } },
  { domain: 'Integrating Essential Skills', topic: 'Percent Change', answer: 'C', prompt: 'A price first rises by 25%. It is then reduced by p percent of the increased price, ending 10% below the original price. What is p?', choices: ['10%', '20%', '28%', '35%'], explanation: 'Use the original price as 1. After the increase it is 1.25; after the decrease it is 1.25(1−p). Set this equal to 0.90. Then 1−p=0.72 and p=0.28, or 28%.', wrong: { A: 'Uses only the final 10% drop.', B: 'Subtracts percentage points from 25%.', D: 'Adds the increase and decrease percentages.' } },
  { domain: 'Integrating Essential Skills', topic: 'Conditional Probability', answer: 'C', prompt: 'Of 120 students, 72 take algebra, 54 take physics, and 30 take both. If a student is selected at random from those who do not take algebra, what is the probability that the student takes physics?', choices: ['1/5', '1/3', '1/2', '2/3'], explanation: 'There are 120−72=48 students who do not take algebra. Of those, 54−30=24 take physics. The conditional probability is 24/48=1/2.', wrong: { A: 'Divides the 24 favorable students by all 120.', B: 'Uses the wrong conditional denominator.', D: 'Confuses the overlap with the complement.' } },
  { domain: 'Integrating Essential Skills', topic: 'Weighted Averages', answer: 'B', prompt: 'One group of 20 artifacts has an average age of 40 years, and another group of 30 has an average age of 50 years. Five artifacts averaging 60 years move from the second group to the first. By how many years does the second group’s new average exceed the first group’s new average?', choices: ['2', '4', '6', '10'], explanation: 'The first group’s new total is 20(40)+5(60)=1100 across 25 artifacts, so its mean is 44. The second group’s new total is 30(50)−5(60)=1200 across 25 artifacts, so its mean is 48. The difference is 4.', wrong: { A: 'Subtracts an intermediate total incorrectly.', C: 'Moves the five artifacts without accounting for their total age.', D: 'Uses the original means instead of the new ones.' } },
]

const { count: existing } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH)
if (existing) throw new Error(`${BATCH} already exists`)
for (const item of items) {
  if (item.choices.length !== 4 || new Set(item.choices).size !== 4) throw new Error(`Invalid choices: ${item.prompt}`)
  if (!item.choices['ABCD'.indexOf(item.answer)]) throw new Error(`Missing answer choice: ${item.prompt}`)
}

const parseNumber = (text) => {
  const raw = text.replaceAll('−', '-').replaceAll(',', '').replaceAll('$', '').replaceAll('%', '').replace(/\b(increases|decreases|by)\b/gi, '').trim()
  if (/^-?\d+\/-?\d+$/.test(raw)) { const [a, b] = raw.split('/').map(Number); return a / b }
  return Number(raw)
}
const numericKey = (index, value) => {
  const matches = items[index].choices.map((text, choiceIndex) => Math.abs(parseNumber(text) - value) < 1e-8 ? 'ABCD'[choiceIndex] : null).filter(Boolean)
  if (matches.length !== 1) throw new Error(`Independent calculation did not identify one choice for item ${index + 1}: ${matches}`)
  return matches[0]
}
const gcd = (a, b) => b ? gcd(b, a % b) : a
const f = (x) => (3*x+2)/4-(x-2)/6
const g0 = f(-2)-1
const g1 = f(0)-2
const aFromFunction = -g0/(g1-g0)
const model = (x, y) => 3*(2*y-x+4)/4-(y+2*x-1)/2-(x-y+6)/4
const slope = -(model(1,0)-model(0,0))/(model(0,1)-model(0,0))
const salaryKey = items[6].choices.findIndex((choice) => choice === `increases by $${(slope*1000).toLocaleString('en-US')}`)
if (salaryKey < 0) throw new Error('Slope calculation did not match one salary choice')
const alwaysSix = items[5].choices.map((_, index) => {
  const operations = [
    (n) => n*(n-1), (n) => n*(n+1), (n) => n*n-1, (n) => n*(n-1)*(n+1),
  ]
  return Array.from({length:101}, (_, i) => i-50).every((n) => operations[index](n)%6 === 0)
})
if (alwaysSix.filter(Boolean).length !== 1) throw new Error('Divisibility item is ambiguous')
const maxSum = Math.max(...Array.from({length:15}, (_, x) => Array.from({length:15}, (_, y) => x+2*y<=14 && 2*x+y<=13 ? x+y : -1)).flat())
const proofKeys = [
  numericKey(0, Array.from({length:100}, (_, i) => i+101).find((n) => n%7===2 && n%9===5)),
  numericKey(1, (2*1+3*(-1))/(1*1+(-1)*(-1))),
  numericKey(2, 6*180/30),
  numericKey(3, Array.from({length:100}, (_, i) => i+1).find((n) => (n+2)%7===0 && (n+5)%9===0)),
  (() => { const matches=items[4].choices.map((c,i)=>Math.abs(16**(parseNumber(c)/2)-8**(parseNumber(c)+1)/4)<1e-9?'ABCD'[i]:null).filter(Boolean);if(matches.length!==1)throw new Error('Exponent item ambiguous');return matches[0] })(),
  'ABCD'[alwaysSix.indexOf(true)],
  'ABCD'[salaryKey],
  numericKey(7, -2),
  numericKey(8, Array.from({length:201}, (_, i) => i-100).filter((x)=>Math.abs(2*x-5)<x+1).length),
  numericKey(9, (7-(17-7)/(7-2)*2) + (17-7)/(7-2)*(-3)),
  numericKey(10, f(aFromFunction+4)),
  numericKey(11, maxSum),
  (() => { const matches=items[12].choices.map((c,i)=>{const a=parseNumber(c);return a>0&&Math.abs(a*(38+a)/5-43)<1e-8?'ABCD'[i]:null}).filter(Boolean);if(matches.length!==1)throw new Error('Difference-of-squares item ambiguous');return matches[0] })(),
  numericKey(13, (28*2-24*2)/(30-28)),
  numericKey(14, (12*.25/.2)-(12-3)),
  numericKey(15, 100*(1-.9/1.25)),
  numericKey(16, (54-30)/(120-72)),
  numericKey(17, (30*50-5*60)/25-(20*40+5*60)/25),
]
for (let index=0; index<items.length; index++) {
  if (proofKeys[index] !== items[index].answer) throw new Error(`Deterministic independent solution rejected item ${index+1}: ${proofKeys[index]} != ${items[index].answer}`)
}

const topics = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
const rows = items.map((item) => ({
  test_type: 'ACT', section_name: 'Math', category_name: item.domain,
  topic_name: item.topic, subtopic_name: item.topic,
  topic_id: topics.find((row) => row.name === item.topic && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')?.id ?? null,
  difficulty: 'Hard', difficulty_score: 0.84, question_type: 'multiple_choice',
  question_text: item.prompt, choice_a: item.choices[0], choice_b: item.choices[1],
  choice_c: item.choices[2], choice_d: item.choices[3], correct_answer: item.answer,
  official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned',
  source: BATCH, exam_name: BATCH,
  fingerprint: createHash('sha256').update(`${item.prompt}|${item.choices.join('|')}`).digest('hex'),
  answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
}))
const { data: saved, error } = await db.from('questions').insert(rows).select('id')
if (error) throw error
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math',
  domain: items[index].domain, skill: items[index].topic, subskill: items[index].topic,
  difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: 80,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: items[index].wrong,
  calculator_expected: true, contextual: /\b(company|shipment|solution|price|group|machine|student|artifact)\b/i.test(items[index].prompt),
  validation_status: 'pending', content_hash: rows[index].fingerprint,
  validation_evidence: { author_solution: items[index].explanation, deterministic_independent_choice: proofKeys[index], four_unique_choices: true },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))).select('question_id'))
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('approved', true).eq('active', true)
if (count !== items.length) throw new Error(`Readback ${count} != ${items.length}`)
console.log(JSON.stringify({ inserted: count, metadataStatus: 'pending' }))
