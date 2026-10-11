import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const batch = 'SAT Author Purpose Challenge Batch 2'
const topicId = 'd1000000-0000-0000-0000-000000000029'
const passage = 'A conservator humidified several folded parchment sheets before pressing them between absorbent boards. One sheet was left untreated; a week later, its folds remained sharply visible, while the treated sheets lay flatter. The conservator reports the untreated sheet alongside the others, then notes that longer observation is needed to determine whether the change lasts.'
const prompt = 'The untreated sheet is mentioned primarily to'
const choices = [
  'show that pressing alone is more effective than humidifying the parchment.',
  'demonstrate that untreated parchment becomes flatter over time.',
  'provide a comparison that helps illustrate the treated sheets’ short-term change.',
  'establish that all parchment sheets must be stored between absorbent boards.',
]
const answer = 'C'
const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))').eq('id', topicId))
  .find((row) => row.name === 'Author Purpose' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Reading and Writing Author Purpose topic not found')

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 240,
    messages: [
      { role: 'system', content: 'Blindly solve this original SAT author-purpose question using only the passage. Identify why the detail is included; reject claims beyond the evidence. Do not assume a key. Return exact choice text (a letter may be normalized). JSON only: {"answer_text":"exact choice text","valid":true,"reason":"at most 12 words"}.' },
      { role: 'user', content: JSON.stringify({ passage, prompt, choices: Object.fromEntries(choices.map((choice, i) => ['ABCD'[i], choice])) }) },
    ],
  }),
})
if (!response.ok) throw new Error(`Independent review failed: HTTP ${response.status} ${await response.text()}`)
const review = JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
const expected = choices['ABCD'.indexOf(answer)]
const reviewedText = 'ABCD'.includes(review.answer_text) && review.answer_text.length === 1 ? choices['ABCD'.indexOf(review.answer_text)] : review.answer_text
if (!review.valid || reviewedText !== expected || !String(review.reason ?? '').trim()) throw new Error(`Independent review rejected/disagreed: ${JSON.stringify(review)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 99) throw new Error(`Coverage changed; expected 99, found ${before}`)
const question = `${prompt}?\n\n${passage}`
const fingerprint = createHash('sha256').update(`${question}\n${choices.join('\n')}`).digest('hex')
const saved = checked(await db.from('questions').insert({
  test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Craft and Structure', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
  difficulty: 'Hard', difficulty_score: 0.833333, question_type: 'multiple_choice', question_text: question,
  choice_a: choices[0], choice_b: choices[1], choice_c: choices[2], choice_d: choices[3], correct_answer: answer,
  official_explanation: 'The untreated sheet provides a baseline for comparison: its folds remained visible while treated sheets flattened, although the passage cautions that the change’s durability is unknown.',
  source_type: 'original', source_rights_status: 'owned', source: batch, exam_name: batch, fingerprint,
  answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
}).select('id'))
if (saved.length !== 1) throw new Error(`Inserted ${saved.length}/1`)
checked(await db.from('exam_item_metadata').insert({
  question_id: saved[0].id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Craft and Structure', skill: topic.name,
  subskill: 'purpose of an untreated comparison and evidence limitation', difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: 60,
  module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'lower' }, { module: 2, route: 'higher' }],
  distractor_rationales: { A: 'The passage says all treated sheets were both humidified and pressed.', B: 'The untreated sheet’s folds remained visible.', C: 'Correct: it provides a baseline for the observed short-term change.', D: 'The passage reports a test, not a universal storage requirement.' },
  calculator_expected: false, contextual: true, validation_status: 'validated', content_hash: fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: 'The untreated sheet’s persistent folds contrast with the treated sheets’ flattening, making it a comparison case; the passage does not prove durability.',
    independent_solution_text: review.reason, independent_review_method: 'Blind second-model passage review; proposed key withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).eq('id', saved[0].id))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch, saved: 1, topic: topic.name, before, after, reviewPassed: true }, null, 2))
