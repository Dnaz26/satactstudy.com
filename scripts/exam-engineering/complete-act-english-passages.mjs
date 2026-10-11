import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT English Challenge Passage Completions v1'
const items = [
  {
    title: 'Moths Under Streetlights',
    prompt: 'At [4], which choice states the finding most precisely while maintaining the passage’s analytical tone?',
    choices: {
      A: 'The surprising results challenged the assumption that moths are drawn only to the brightest light.',
      B: 'The results totally overturned the old idea that moths just chase the biggest lights.',
      C: 'The results, which surprised everyone, challenged the assumption that moths are drawn only to the brightest light.',
      D: 'The surprising results proved that moths are never drawn to bright lights.',
    }, answer: 'A',
    explanation: 'A keeps the evidence limited to challenging the “only brightest” assumption and uses precise academic language. B is informal; C claims universal surprise without support; D turns a limited finding into an absolute claim.',
    distractors: { B: 'Colloquial wording clashes with the passage’s analytical style.', C: 'Claims that everyone was surprised without evidence.', D: 'Overstates the finding as proof that moths never approach bright lights.' },
  },
  {
    title: 'The Annotated Atlas',
    prompt: 'At [4], which choice most clearly describes both effects of the corrector’s revision without overstating its value?',
    choices: {
      A: 'improving the map’s accuracy and adding a warning about a dangerous reef.',
      B: 'making the old map perfect while adding a warning about a dangerous reef.',
      C: 'which was an improvement, and the reef was dangerous.',
      D: 'fixing a reef that had been dangerous and improving the coastline.',
    }, answer: 'A',
    explanation: 'A clearly links the revised coastline to increased accuracy and the added reef note to a warning. B overstates perfection; C is vague and does not express the added note; D incorrectly says the corrector fixed the reef itself.',
    distractors: { B: 'Perfect is an unsupported absolute claim.', C: 'Does not express that the corrector added a warning.', D: 'Confuses warning about a reef with physically fixing it.' },
  },
]
const { count: existing } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH)
if (existing) throw new Error(`${BATCH} already exists`)
const passages = checked(await db.from('passages').select('id, title, content').in('title', items.map((item) => item.title)))
const byTitle = new Map(passages.map((passage) => [passage.title, passage]))
const topic = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
  .find((row) => row.name === 'Style and Tone' && row.categories?.sections?.tests?.name === 'ACT')
if (!topic) throw new Error('Style and Tone topic missing')
const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 800,
    messages: [
      { role: 'system', content: 'Independently answer the ACT English items without seeing the proposed key. Reject ambiguity. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: byTitle.get(item.title)?.content, prompt: item.prompt, choices: item.choices }))) },
    ] }),
})
if (!response.ok) throw new Error(`Review HTTP ${response.status}`)
const reviews = JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== 2 || reviews.some((result, index) => !result.valid || result.answer !== items[index].answer)) throw new Error('Independent review failed')

for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const passage = byTitle.get(item.title)
  if (!passage) throw new Error(`Missing passage ${item.title}`)
  const hash = createHash('sha256').update(`${passage.content}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex')
  const { data: row, error } = await db.from('questions').insert({
    test_type: 'ACT', section_name: 'English', category_name: 'Knowledge of Language', topic_name: 'Style and Tone',
    subtopic_name: 'Style and Tone', topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: 0.84, question_type: 'multiple_choice',
    question_text: item.prompt, choice_a: item.choices.A, choice_b: item.choices.B,
    choice_c: item.choices.C, choice_d: item.choices.D, correct_answer: item.answer,
    official_explanation: item.explanation, passage_id: passage.id,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint: hash, answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
  }).select('id').single()
  if (error) throw error
  checked(await db.from('exam_item_metadata').insert({
    question_id: row.id, version: 1, exam_type: 'ACT', section: 'English',
    domain: 'Knowledge of Language', skill: 'Style and Tone', subskill: 'Style and Tone',
    difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: 45,
    module_eligibility: [{ module: 1, route: 'common', passageGroup: `act-english-challenge-${item.title}` }],
    distractor_rationales: item.distractors, contextual: true,
    validation_status: 'pending', content_hash: hash,
    validation_evidence: { independent_model_answer: reviews[index].answer, independent_model_reason: reviews[index].reason },
    originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
  }).select('question_id'))
}
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('active', true).eq('approved', true)
if (count !== 2) throw new Error(`Readback ${count} != 2`)
console.log(JSON.stringify({ inserted: count, metadataStatus: 'pending' }))
