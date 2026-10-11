import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Reading Challenge Extensions v1'
const CACHE = 'supabase/exam-engineering/act-reading-challenges-v1-drafts.json'
const titles = ['Counting Steps on Salt', 'The Last Picking', 'The Palace on Main', 'First Light in the Nursery']
const topicDomain = {
  'Main Idea and Details': 'Key Ideas and Details',
  'Inference': 'Key Ideas and Details',
  'Vocabulary in Context': 'Craft and Structure',
  'Author Purpose': 'Craft and Structure',
  'Comparing Texts': 'Integration of Knowledge and Ideas',
}
const topicRows = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
const topicIds = new Map()
for (const [name, domain] of Object.entries(topicDomain)) {
  const matches = topicRows.filter((row) => row.name === name && row.categories?.name === domain && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Reading')
  if (matches.length !== 1) throw new Error(`Expected one ACT Reading topic ${name}; got ${matches.length}`)
  topicIds.set(name, matches[0].id)
}
const prior = checked(await db.from('questions').select('id').eq('exam_name', BATCH).limit(1))
if (prior.length) throw new Error(`${BATCH} already exists`)
const passages = checked(await db.from('passages').select('id, title, content').in('title', titles))
if (passages.length !== titles.length) throw new Error('Missing target passage')
const passageByTitle = new Map(passages.map((row) => [row.title, row]))
const key = process.env.DEEPSEEK_API_KEY
if (!key) throw new Error('Missing DEEPSEEK_API_KEY')

async function ai(system, user, maxTokens = 3000) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0.4,
      response_format: { type: 'json_object' }, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  })
  if (!response.ok) throw new Error(`AI HTTP ${response.status}`)
  return JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
}

const drafts = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : []
for (let group = drafts.length; group < titles.length; group++) {
  const passage = passageByTitle.get(titles[group])
  const existing = checked(await db.from('questions').select('question_text')
    .eq('passage_id', passage.id).eq('test_type', 'ACT').eq('section_name', 'Reading'))
  let accepted = null
  for (let attempt = 0; attempt < 4 && !accepted; attempt++) {
    const response = await ai(
      'Write completely original upper-range ACT Reading questions. Do not reuse or paraphrase existing question stems. Each answer must require a close reading of the supplied passage; three plausible alternatives must fail for precise textual reasons. Reject generic or merely literal questions. Return JSON only.',
      `Passage title: ${passage.title}\nPassage:\n${passage.content}\nAvoid these existing stems: ${existing.map((q) => q.question_text).join(' | ')}\nWrite FOUR new questions with topics from: Main Idea and Details, Inference, Vocabulary in Context, Author Purpose. At least one must require synthesizing two distant parts of the passage and one must probe the author’s use of a specific detail. Prompts at least 45 characters. Return {"questions":[{"topic":"Inference","prompt":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"explain evidence and each wrong choice","distractorRationales":{"A":"...","B":"...","C":"...","D":"..."}}]}. Attempt ${attempt + 1}.`,
      4000,
    ).catch(() => null)
    if (!Array.isArray(response?.questions) || response.questions.length !== 4) continue
    if (!response.questions.every((q) => topicIds.has(q.topic) && q.prompt?.length >= 45 && ['A','B','C','D'].includes(q.answer)
      && q.choices && Object.keys(q.choices).sort().join('') === 'ABCD'
      && new Set(Object.values(q.choices).map((value) => String(value).trim().toLowerCase())).size === 4
      && q.explanation?.length >= 50)) continue
    accepted = response.questions
  }
  if (!accepted) throw new Error(`Could not produce four valid items for ${passage.title}`)
  drafts.push(accepted)
  writeFileSync(CACHE, `${JSON.stringify(drafts, null, 2)}\n`)
  console.log(`generated ${group + 1}/${titles.length}`)
}

const all = drafts.flatMap((questions, group) => questions.map((question, index) => ({ group, index, ...question })))
const reviews = []
for (let start = 0; start < all.length; start += 8) {
  const batch = all.slice(start, start + 8).map((item, offset) => ({
    index: start + offset, passage: passageByTitle.get(titles[item.group]).content,
    prompt: item.prompt, choices: item.choices,
  }))
  const response = await ai(
    'Independently solve each ACT Reading item without seeing the proposed key. Reject a second defensible choice, a claim unsupported by the text, or a trivial question. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}.',
    JSON.stringify(batch), 3500,
  )
  if (!Array.isArray(response.reviews) || response.reviews.length !== batch.length) throw new Error('Incomplete reviewer response')
  reviews.push(...response.reviews)
}
const passed = all.map((item, index) => ({ item, review: reviews.find((entry) => entry.index === index) }))
  .filter(({ item, review }) => review?.valid && review.answer === item.answer)
const perPassage = titles.map((_, group) => passed.filter(({ item }) => item.group === group).length)
if (perPassage.some((count) => count < 3)) throw new Error(`Too few verified items per passage: ${perPassage.join(', ')}`)

const rows = passed.map(({ item }) => {
  const passage = passageByTitle.get(titles[item.group])
  return {
    test_type: 'ACT', section_name: 'Reading', category_name: topicDomain[item.topic],
    topic_name: item.topic, subtopic_name: item.topic, topic_id: topicIds.get(item.topic),
    difficulty: 'Hard', difficulty_score: 0.85, question_type: 'multiple_choice',
    question_text: item.prompt, choice_a: item.choices.A, choice_b: item.choices.B,
    choice_c: item.choices.C, choice_d: item.choices.D, correct_answer: item.answer,
    official_explanation: item.explanation, passage_id: passage.id,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint: createHash('sha256').update(`${passage.content}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex'),
    answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
  }
})
const { data: saved, error } = await db.from('questions').insert(rows).select('id')
if (error) throw error
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Reading',
  domain: rows[index].category_name, skill: rows[index].topic_name, subskill: rows[index].topic_name,
  difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: 75,
  module_eligibility: [{ module: 1, route: 'common', passageGroup: `act-reading-challenge-${passed[index].item.group + 1}` }],
  distractor_rationales: passed[index].item.distractorRationales ?? {}, contextual: true,
  validation_status: 'pending', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_model_answer: passed[index].review.answer, independent_model_reason: passed[index].review.reason, four_unique_choices: true },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))).select('question_id'))
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('approved', true).eq('active', true)
if (count !== passed.length) throw new Error(`Readback ${count} != ${passed.length}`)
console.log(JSON.stringify({ inserted: count, perPassage, rejected: all.length - count, metadataStatus: 'pending' }))
