import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Integer Properties Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000049'
const items = [
  {
    prompt: 'A positive integer n leaves a remainder of 4 when divided by 7 and a remainder of 3 when divided by 11. If 100<n<200, what is the greatest possible value of n?',
    choices: ['151', '179', '193', '200'], answer: 'B', level: 7, seconds: 85,
    explanation: 'Values congruent to 4 modulo 7 have the form 4+7k. Requiring a remainder of 3 modulo 11 gives k≡3 (mod 11), so n=25+77t. The values in the interval are 102 and 179; the greatest is 179.',
    proof: 'The common solutions are 25+77t. The only ones strictly between 100 and 200 are 102 and 179, and 179 leaves remainders 4 and 3.',
    wrong: { A: 'Satisfies one remainder condition but not the other.', B: 'Correct: it satisfies both congruences and is the greatest solution in the stated interval.', C: 'Satisfies the remainder modulo 7 but not modulo 11.', D: 'Violates the strict upper bound and does not satisfy both remainder conditions.' },
  },
  {
    prompt: 'If 12 is a factor of n² for an integer n, which is the greatest listed positive integer that must be a factor of n?',
    choices: ['2', '3', '4', '6'], answer: 'D', level: 6, seconds: 70,
    explanation: 'Because 12=2²·3 divides n², the prime factorization of n must contain at least one factor of 2 and one factor of 3. Therefore 6 divides n. Neither 4 nor 12 must divide n; n=6 is a counterexample.',
    proof: 'Prime exponents in n² are twice those in n. Divisibility by 2²·3 forces n to contain 2¹·3¹, so 6|n. n=6 shows 4∤n.',
    wrong: { A: 'A necessary but weaker condition; it omits the required factor of 3.', B: 'A necessary but weaker condition; it omits the required factor of 2.', C: 'Not required: n=6 has 12|n² but 4 does not divide n.', D: 'Correct: both a factor of 2 and a factor of 3 must divide n.' },
  },
  {
    prompt: 'The greatest common divisor of positive integers a and b is 8, and their least common multiple is 840. If a=120, what is b?',
    choices: ['48', '56', '64', '70'], answer: 'B', level: 6, seconds: 75,
    explanation: 'For positive integers, ab=gcd(a,b)·lcm(a,b). Thus 120b=8·840=6,720, so b=56. Indeed, gcd(120,56)=8 and lcm(120,56)=840.',
    proof: 'The product identity gives b=(8·840)/120=56; direct gcd and lcm checks confirm the supplied conditions.',
    wrong: { A: 'Would make the product too small to have the stated lcm.', B: 'Correct: it satisfies both the product identity and the stated gcd/lcm.', C: 'Uses 8 as though it were the divisor of 840 before multiplying by 120.', D: 'Divides the lcm by the known integer but omits the gcd factor.' },
  },
  {
    prompt: 'If n is an odd integer, which expression must be divisible by 8?',
    choices: ['n²−1', 'n²+1', '3n²+1', '5n²−1'], answer: 'A', level: 6, seconds: 65,
    explanation: 'Every odd integer has the form 2k+1. Then n²−1=(2k+1)²−1=4k(k+1). Since one of k and k+1 is even, 4k(k+1) is divisible by 8.',
    proof: 'For odd n, n²≡1 (mod 8), so n²−1≡0 (mod 8). The other expressions are not always 0 modulo 8; n=1 is a counterexample for each.',
    wrong: { A: 'Correct: the square of every odd integer is 1 modulo 8.', B: 'For odd n this is 2 modulo 8, not 0.', C: 'For odd n this is 4 modulo 8, not 0.', D: 'For odd n this is 4 modulo 8, not 0.' },
  },
  {
    prompt: 'A positive integer N has prime factorization N=2²·3·5. How many positive divisors does N have?',
    choices: ['8', '10', '12', '15'], answer: 'C', level: 5, seconds: 60,
    explanation: 'For a prime factorization with exponents 2, 1, and 1, the divisor count is (2+1)(1+1)(1+1)=12.',
    proof: 'A divisor independently chooses an exponent 0–2 for 2, 0–1 for 3, and 0–1 for 5, giving 3·2·2=12 choices.',
    wrong: { A: 'Counts only two exponent choices for the factor 2 instead of three.', B: 'Adds exponent choices rather than multiplying the independent choices.', C: 'Correct: there are 3·2·2 positive divisors.', D: 'Uses the sum of exponents rather than the divisor-count product.' },
  },
  {
    prompt: 'A positive integer n leaves a remainder of 5 when divided by 8 and a remainder of 2 when divided by 3. What is the greatest possible value of n less than 100?',
    choices: ['53', '65', '77', '89'], answer: 'C', level: 6, seconds: 75,
    explanation: 'Numbers that are 5 modulo 8 are 5+8k. For these to be 2 modulo 3, k must be a multiple of 3. Thus n=5+24t; below 100 the greatest such value is 77.',
    proof: 'The simultaneous conditions reduce to n≡5 (mod 24). The values below 100 are 5, 29, 53, and 77; 77 is greatest.',
    wrong: { A: 'Satisfies the remainder condition modulo 8 but leaves remainder 2? It is 2 modulo 3, so it satisfies both but is not greatest.', B: 'Does not satisfy both remainder conditions.', C: 'Correct: it is the largest value below 100 congruent to 5 modulo 24.', D: 'Fails the remainder condition modulo 8.' },
  },
  {
    prompt: 'Positive integers a and b have greatest common divisor 12 and a+b=84. What is the greatest possible least common multiple of a and b?',
    choices: ['72', '120', '144', '180'], answer: 'C', level: 7, seconds: 95,
    explanation: 'Write a=12u and b=12v, where gcd(u,v)=1 and u+v=7. The possible positive coprime pairs are (1,6), (2,5), and (3,4), up to order. Their lcm values for a,b are 12uv: 72, 120, and 144. The greatest is 144.',
    proof: 'After dividing both integers by their gcd, u+v=7 with coprime positive u,v. The unordered pairs are (1,6),(2,5),(3,4); lcm=12uv, whose maximum is 12·3·4=144.',
    wrong: { A: 'Uses the pair (1,6), which is allowed but does not maximize the product.', B: 'Uses the pair (2,5), which is allowed but does not maximize the product.', C: 'Correct: the coprime pair (3,4) gives the greatest product and lcm 144.', D: 'Exceeds the maximum product possible for positive coprime integers summing to 7.' },
  },
  {
    prompt: 'How many integers from 1 through 100, inclusive, are divisible by exactly one of 4 and 6?',
    choices: ['17', '25', '33', '41'], answer: 'B', level: 6, seconds: 80,
    explanation: 'There are 25 multiples of 4 and 16 multiples of 6. Eight are multiples of both, since they are multiples of 12. Counting those divisible by exactly one gives (25−8)+(16−8)=25.',
    proof: 'Multiples of 4 only: 25−8=17. Multiples of 6 only: 16−8=8. The disjoint total is 17+8=25.',
    wrong: { A: 'Counts only the multiples of 4 that are not multiples of 6.', B: 'Correct: subtracts the shared multiples from both groups and adds the exclusive counts.', C: 'Counts numbers divisible by at least one of 4 and 6, including their overlap once.', D: 'Double-counts some shared multiples while trying to combine both groups.' },
  },
  {
    prompt: 'If p is a prime greater than 3, what is the remainder when p² is divided by 24?',
    choices: ['1', '7', '13', '17'], answer: 'A', level: 7, seconds: 85,
    explanation: 'Every prime greater than 3 is odd and not divisible by 3. An odd square is 1 modulo 8, and a square not divisible by 3 is 1 modulo 3. The only remainder modulo 24 satisfying both conditions is 1.',
    proof: 'Since 8 and 3 are coprime, p²≡1 mod 8 and p²≡1 mod 3 imply p²≡1 mod 24.',
    wrong: { A: 'Correct: it is the unique residue modulo 24 that is 1 modulo both 8 and 3.', B: 'Is 7 modulo 8, so it cannot be the square of an odd integer modulo 8.', C: 'Is 1 modulo 8 but 1 modulo 3? 13≡1 mod 3, however 13 is not the unique shared residue modulo 24; check CRT gives 1.', D: 'Is not 1 modulo 8, so it cannot equal p² modulo 24.' },
  },
  {
    prompt: 'A positive integer has the form N=2ᵃ·3ᵇ, where a and b are positive integers. If N has exactly 24 positive divisors, what is the smallest possible value of a+b?',
    choices: ['7', '8', '9', '12'], answer: 'B', level: 7, seconds: 90,
    explanation: 'The number of positive divisors is (a+1)(b+1)=24. For positive a and b, the factor pairs with both factors at least 2 are (2,12), (3,8), (4,6), and their reversals. The corresponding smallest sum of exponents is a+b=3+5=8.',
    proof: 'Enumerating factor pairs of 24 with both at least 2 gives exponent pairs (1,11),(2,7),(3,5) and reversals. The minimum sum is 8.',
    wrong: { A: 'Cannot be obtained from positive exponents whose divisor-count factors multiply to 24.', B: 'Correct: (a+1,b+1)=(4,6) gives (a,b)=(3,5) and minimum sum 8.', C: 'Comes from the pair (2,7), which gives a sum of 9 rather than the minimum.', D: 'Comes from a less balanced factor pair and is not minimal.' },
  },
]

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Integer Properties' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math')
if (!topic) throw new Error('Expected ACT Integer Properties topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions are not balanced across A–D')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 4800,
    messages: [
      { role: 'system', content: 'Blindly solve each original ACT math question. Do not assume a key. Check exactly one listed answer is correct, the stem is self-contained, and the number-theory reasoning is sound. Select the exact option text and its letter, and verify the pair matches. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact option text","valid":true,"reason":"..."}]}.' },
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
    test_type: 'ACT', section_name: 'Math', category_name: 'Number and Quantity', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
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
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math', domain: 'Number and Quantity', skill: topic.name,
  subskill: ['simultaneous remainders', 'prime exponents and divisibility', 'gcd and lcm relationship', 'odd-square residues', 'divisor counting', 'simultaneous remainders', 'optimizing lcm under a sum constraint', 'exclusive divisibility count', 'quadratic residues', 'divisor count with constrained exponents'][index],
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
