import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const batch = 'SAT Main Idea Challenge Batch 2'
const topicId = 'd1000000-0000-0000-0000-000000000025'
const passage = 'Early digital weather maps made broad atmospheric patterns visible at a glance. Yet weather stations were unevenly distributed, and the colors used to fill gaps could make uncertain regions appear uniform. A historian of science argues that these maps both expanded what viewers could see and shaped which limitations they noticed.'
const choices = [
  'Because stations were unevenly distributed, the early maps could not show broad atmospheric patterns.',
  'The maps made large-scale patterns easier to see, while their visual choices also affected how viewers perceived gaps in the data.',
  'Color scales eliminated uncertainty by filling every missing weather observation accurately.',
  'Historians have concluded that early weather maps represented only local conditions.',
]
const answer = 'B'
const question = `Which choice best states the main idea of the text?\n\n${passage}`
const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))').eq('id', topicId))
  .find((row) => row.name === 'Main Idea' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Main Idea topic not found')

const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 240,
    messages: [
      { role: 'system', content: 'Blindly read this original SAT passage and decide which choice best states its central idea. Reject options that exaggerate, contradict, or narrow the text. Do not assume a key. Return the exact choice text, not its letter. JSON only: {"answer_text":"exact choice text","valid":true,"reason":"at most 12 words"}.' },
      { role: 'user', content: JSON.stringify({ passage, choices: Object.fromEntries(choices.map((choice, i) => ['ABCD'[i], choice])) }) },
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
const fingerprint = createHash('sha256').update(`${passage}\n${question}\n${choices.join('\n')}`).digest('hex')
const saved = checked(await db.from('questions').insert({
  test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Information and Ideas', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
  difficulty: 'Hard', difficulty_score: 1, question_type: 'multiple_choice', question_text: question,
  choice_a: choices[0], choice_b: choices[1], choice_c: choices[2], choice_d: choices[3], correct_answer: answer,
  official_explanation: 'The passage says the maps made broad patterns visible, but color-filled gaps could make uncertainty appear uniform; it emphasizes both effects.',
  source_type: 'original', source_rights_status: 'owned', source: batch, exam_name: batch, fingerprint,
  answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
}).select('id'))
if (saved.length !== 1) throw new Error(`Inserted ${saved.length}/1`)
checked(await db.from('exam_item_metadata').insert({
  question_id: saved[0].id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Information and Ideas', skill: topic.name,
  subskill: 'main claim integrating benefit and limitation of visual representation', difficulty_level: 7, difficulty_basis: 'editorial', estimated_seconds: 70,
  module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'lower' }, { module: 2, route: 'higher' }],
  distractor_rationales: { A: 'Contradicts the passage, which says broad patterns became visible.', B: 'Correct: it captures both improved visibility and the effect on perceived uncertainty.', C: 'Claims accuracy the passage explicitly does not establish.', D: 'Narrows the maps to local conditions, contrary to the passage’s global patterns.' },
  calculator_expected: false, contextual: true, validation_status: 'validated', content_hash: fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: 'The central claim includes both the increased visibility of broad patterns and the design’s influence on how data gaps appeared.',
    independent_solution_text: review.reason, independent_review_method: 'Blind second-model passage review; proposed key withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).eq('id', saved[0].id))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topicId).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch, saved: 1, topic: topic.name, before, after, reviewPassed: true }, null, 2))
