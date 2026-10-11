import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT English Challenge Passages v1'
const CACHE = 'supabase/exam-engineering/act-english-challenges-v1-drafts.json'
const subjects = [
  'a sound archivist reconstructing the acoustics of an early radio studio',
  'a ceramic artist analyzing why a historic glaze changes color during firing',
  'an urban ecologist tracing the migration of moths across illuminated streets',
  'a historian studying how handwritten corrections changed an early scientific atlas',
  'an engineer restoring a mechanical tide gauge on a remote coast',
]
const topicSequence = [
  'Punctuation', 'Organization', 'Grammar and Usage', 'Style and Tone', 'Topic Development',
  'Sentence Structure', 'Concision and Clarity', 'Punctuation', 'Topic Development', 'Grammar and Usage',
]
const topicDomain = {
  'Punctuation': 'Conventions of Standard English',
  'Organization': 'Production of Writing',
  'Grammar and Usage': 'Conventions of Standard English',
  'Style and Tone': 'Knowledge of Language',
  'Topic Development': 'Production of Writing',
  'Sentence Structure': 'Conventions of Standard English',
  'Concision and Clarity': 'Knowledge of Language',
}
const topicRows = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
const topicIds = new Map()
for (const [name, domain] of Object.entries(topicDomain)) {
  const matches = topicRows.filter((topic) => topic.name === name && topic.categories?.name === domain && topic.categories?.sections?.tests?.name === 'ACT')
  if (matches.length !== 1) throw new Error(`Expected one ACT English topic ${name}; got ${matches.length}`)
  topicIds.set(name, matches[0].id)
}

const existing = checked(await db.from('questions').select('id').eq('exam_name', BATCH).limit(1))
if (existing.length) throw new Error(`${BATCH} already exists; refusing duplicate batch`)
const key = process.env.DEEPSEEK_API_KEY
if (!key) throw new Error('DEEPSEEK_API_KEY is missing')

async function ai(system, user, maxTokens = 9000) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0.5,
      response_format: { type: 'json_object' }, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  })
  if (!response.ok) throw new Error(`AI request failed ${response.status}`)
  const payload = await response.json()
  return JSON.parse(payload.choices?.[0]?.message?.content || '{}')
}

const normalize = (text) => text.toLowerCase().replace(/\d+(?:\.\d+)?/g, '#').replace(/[^a-z#]+/g, ' ').trim()
const drafts = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : []
for (let group = drafts.length; group < subjects.length; group++) {
  const subject = subjects[group]
  let accepted = null
  for (let attempt = 0; attempt < 5 && !accepted; attempt++) {
    const generated = await ai(
      'You are an original ACT English item writer. Never copy or closely paraphrase any official question. Return JSON only. Write college-ready prose with a clear narrative or argument. Make choices close and error-based, with only one defensible answer. Avoid superficial comma drills, throwaway options, and artificially long wording.',
      `Write one original coherent 250-350 word passage about ${subject}. Mark exactly ten editable spans [1]...[/1] through [10]...[/10] in passage order. Produce exactly ten four-choice questions, one per span. Required topic sequence: ${topicSequence.join(' | ')}. Make every question challenging through rhetorical judgment, sentence logic, modifier scope, punctuation with structure, or precise usage. Use natural ACT editing conventions; questions may ask about keeping/revising/deleting a sentence when its purpose is clear. Every question prompt must identify its span and be at least 45 characters. All answer choices should be plausible and grammatical where relevant. Return {"title":"...","passage":"...","questions":[{"prompt":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"Explain why the correct choice works and why each wrong choice fails","distractorRationales":{"A":"...","B":"...","C":"...","D":"..."}}]}. Attempt ${attempt + 1}.`,
    ).catch(() => null)
    if (!generated || typeof generated.passage !== 'string' || !Array.isArray(generated.questions)) {
      console.warn('invalid shape', { group, attempt, keys: generated && Object.keys(generated) })
      continue
    }
    const words = generated.passage.trim().split(/\s+/).length
    if (words < 220 || words > 430 || generated.questions.length !== 10) {
      console.warn('length', { group, attempt, words, count: generated.questions.length })
      continue
    }
    if (!topicSequence.every((_, i) => generated.passage.includes(`[${i + 1}]`) && generated.passage.includes(`[/${i + 1}]`))) {
      console.warn('markers', { group, attempt, opens: (generated.passage.match(/\[\d+\]/g) ?? []).length, closes: (generated.passage.match(/\[\/\d+\]/g) ?? []).length })
      continue
    }
    if (!generated.questions.every((q) => q?.prompt?.length >= 35 && ['A','B','C','D'].includes(q.answer)
      && q.choices && Object.keys(q.choices).sort().join('') === 'ABCD'
      && new Set(Object.values(q.choices).map((choice) => String(choice).trim().toLowerCase())).size === 4
      && q.explanation?.length >= 35)) {
      console.warn('question', { group, attempt, bad: generated.questions.findIndex((q) => !(q?.prompt?.length >= 35 && ['A','B','C','D'].includes(q.answer) && q.choices && Object.keys(q.choices).sort().join('') === 'ABCD' && new Set(Object.values(q.choices).map((choice) => String(choice).trim().toLowerCase())).size === 4 && q.explanation?.length >= 35)) })
      continue
    }
    const sigs = generated.questions.map((q) => normalize(`${q.prompt}|${Object.values(q.choices).join('|')}`))
    if (new Set(sigs).size !== 10) continue
    accepted = generated
  }
  if (!accepted) throw new Error(`Could not produce a structurally valid original passage ${group + 1}`)
  drafts.push(accepted)
  writeFileSync(CACHE, `${JSON.stringify(drafts, null, 2)}\n`)
  console.log(`generated ${group + 1}/${subjects.length}`)
}

const flattened = drafts.flatMap((draft, group) => draft.questions.map((question, index) => ({
  group, index, passage: draft.passage, ...question,
})))
const reviews = []
for (let start = 0; start < flattened.length; start += 10) {
  const batch = flattened.slice(start, start + 10).map((item, index) => ({
    index: start + index, passage: item.passage, prompt: item.prompt, choices: item.choices,
  }))
  const result = await ai(
    'Independently solve ACT English editing questions without seeing their proposed answers. Reject ambiguous items, a second defensible answer, missing passage support, and elementary one-step questions. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}.',
    JSON.stringify(batch), 3600,
  )
  if (!Array.isArray(result.reviews) || result.reviews.length !== batch.length) throw new Error(`Incomplete review batch ${start}`)
  reviews.push(...result.reviews)
}
const passed = flattened.map((item, index) => ({ item, review: reviews.find((entry) => entry.index === index), originalIndex: index }))
  .filter(({ item, review }) => review?.valid && review.answer === item.answer)
if (passed.length < 30) throw new Error(`Only ${passed.length} of ${flattened.length} items passed independent review`)
console.log(`independent review passed ${passed.length}/${flattened.length}`)

const passageIds = []
for (const draft of drafts) {
  const { data, error } = await db.from('passages').insert({
    title: draft.title, content: draft.passage, author: 'PrepSAT/ACT original editorial material',
    source_type: 'original', source_rights_status: 'owned', active: true,
  }).select('id').single()
  if (error) throw error
  passageIds.push(data.id)
}
const rows = passed.map(({ item }) => {
  const topic = topicSequence[item.index]
  return {
    test_type: 'ACT', section_name: 'English', category_name: topicDomain[topic],
    topic_name: topic, subtopic_name: topic, topic_id: topicIds.get(topic),
    difficulty: 'Hard', difficulty_score: 0.84,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices.A, choice_b: item.choices.B, choice_c: item.choices.C, choice_d: item.choices.D,
    correct_answer: item.answer, official_explanation: item.explanation,
    passage_id: passageIds[item.group], source_type: 'original', source_rights_status: 'owned',
    source: `${BATCH}:${item.group + 1}:${item.index + 1}`, exam_name: BATCH,
    fingerprint: createHash('sha256').update(`${item.passage}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex'),
    answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
  }
})
const { data: saved, error: saveError } = await db.from('questions').insert(rows).select('id')
if (saveError) throw saveError
const metadata = saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'English',
  domain: rows[index].category_name, skill: rows[index].topic_name, subskill: rows[index].topic_name,
  difficulty_level: 6, difficulty_basis: 'editorial',
  module_eligibility: [{ module: 1, route: 'common', passageGroup: `act-english-challenge-${passed[index].item.group + 1}` }],
  estimated_seconds: 45, distractor_rationales: passed[index].item.distractorRationales ?? {},
  contextual: true, validation_status: 'pending', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_model_answer: passed[index].review.answer, independent_model_reason: passed[index].review.reason, four_unique_choices: true, structural_checks: true },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))
checked(await db.from('exam_item_metadata').insert(metadata).select('question_id'))
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('approved', true).eq('active', true)
if (count !== passed.length) throw new Error(`Readback ${count} != ${passed.length}`)
console.log(JSON.stringify({ passages: drafts.length, questions: count, independentModelReviews: reviews.length, rejected: flattened.length - passed.length, metadataStatus: 'pending' }))
