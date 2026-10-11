import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { scoreBankQuestion, templateSignature } from './product-rubric.mjs'

// Editorial candidates are reviewed independently before they become active.
// Re-running resumes the draft cache and never inserts an existing fingerprint.
const batch = 'Topic challenge pool 2026-10-11 v1'
const directory = 'supabase/exam-engineering'
const cachePath = `${directory}/topic-challenge-pool-drafts.json`
const reportPath = `${directory}/topic-challenge-pool-report.json`
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? Infinity)
const publish = process.argv.includes('--publish')
if (publish) throw new Error('Automatic publication is disabled: sampled model items failed the hard-question review. Curate and verify drafts before database activation.')
const key = process.env.DEEPSEEK_API_KEY
if (!key) throw new Error('DEEPSEEK_API_KEY is required')
mkdirSync(directory, { recursive: true })

async function ai(system, user, maxTokens = 5500) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat',
        temperature: 0.35,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (response.ok) {
      const result = await response.json()
      try { return JSON.parse(result.choices?.[0]?.message?.content ?? '{}') } catch { /* retry */ }
    }
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)))
  }
  throw new Error('Question generation or review failed after retries')
}

const topics = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .filter((topic) => ['SAT', 'ACT'].includes(topic.categories?.sections?.tests?.name))
  .slice(0, limit)
const allQuestions = []
for (let offset = 0; ; offset += 1000) {
  const page = checked(await db.from('questions').select('test_type,topic_id,question_text,fingerprint').eq('active', true).eq('approved', true).range(offset, offset + 999))
  allQuestions.push(...page)
  if (page.length < 1000) break
}
const fingerprints = new Set(allQuestions.map((item) => item.fingerprint).filter(Boolean))
const existingFrames = new Set(allQuestions.map((item) => `${item.test_type}|${item.topic_id}|${templateSignature(item.question_text ?? '')}`))
const drafts = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const outcomes = []

async function processTopic(topic) {
  const exam = topic.categories.sections.tests.name
  const section = topic.categories.sections.name
  const domain = topic.categories.name
  const cacheKey = `${exam}|${section}|${topic.id}`
  let draft = drafts[cacheKey]
  if (!draft) {
    const recent = allQuestions.filter((item) => item.topic_id === topic.id).slice(0, 4).map((item) => item.question_text)
    draft = await ai(
      'You write original advanced SAT/ACT training items, not copies of official questions. Return only JSON. Mathematical validity and one defensible answer matter more than apparent complexity. Do not inflate difficulty with large numbers or irrelevant prose. Use genuinely different reasoning architectures. Every wrong choice must result from a plausible specific mistake. Do not reuse a sample stem. No logarithms unless the topic itself requires them.',
      JSON.stringify({ instruction: `Create exactly THREE genuinely difficult questions for ${exam} ${section}, domain ${domain}, topic ${topic.name}. These are advanced TRAINING questions, allowed to take longer than an official item. Each needs at least THREE distinct reasoning decisions, a non-obvious setup, and a second constraint or concept that materially changes the solution. Avoid direct function substitution, two-point slope, point-slope with perpendicular line, simple one-step equations, obvious grammar agreement, and passage questions resolved by one quoted sentence. A question that a strong student can solve in one routine formula application FAILS. Make the three reasoning architectures different. For ${exam} Reading or English, each question needs its own original passage; SAT passages 40-150 words, ACT Reading 250-500 words, ACT English 200-350 words. For ACT Science use an original data table or experiment in passage of at least 140 words. Provide every data point needed. For grammar, include the exact sentence being edited and make only one answer correct. Return {"items":[{"passage":"... or empty for math","prompt":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","solution":"full reasoning","wrong":{"A":"reason","B":"reason","C":"reason","D":"reason"},"subskill":"...","reasoning_steps":3,"estimated_seconds":120}]}.`, examplesToAvoid: recent }),
      7200,
    )
    drafts[cacheKey] = draft
    writeFileSync(cachePath, `${JSON.stringify(drafts, null, 2)}\n`)
  }
  const candidates = Array.isArray(draft.items) ? draft.items : []
  const structurallyValid = candidates.length === 3 && candidates.every((item) => {
    const choices = item.choices && Object.values(item.choices)
    const passageWords = String(item.passage ?? '').trim().split(/\s+/).filter(Boolean).length
    const minWords = section === 'Reading' ? 180 : section === 'English' ? 140 : section === 'Science' ? 100 : section === 'Reading and Writing' ? 30 : 0
    return typeof item.prompt === 'string' && item.prompt.length >= 45
      && Array.isArray(choices) && choices.length === 4
      && Object.keys(item.choices).sort().join('') === 'ABCD'
      && choices.every((choice) => typeof choice === 'string' && choice.trim().length > 0)
      && new Set(choices.map((choice) => choice.trim().toLowerCase())).size === 4
      && ['A', 'B', 'C', 'D'].includes(item.answer)
      && String(item.solution ?? '').length >= 55
      && Number(item.reasoning_steps) >= 2
      && passageWords >= minWords
  })
  if (!structurallyValid) {
    outcomes.push({ topic: cacheKey, status: 'rejected_structure', generated: candidates.length })
    return
  }
  const review = await ai(
    'Independently solve each question WITHOUT seeing its proposed answer or solution. Return JSON only. Reject any item if more than one choice can be defended, details are missing, math is invalid, it is a one-step routine item, or its passage does not support the answer. For math, calculate the result yourself; for verbal, cite the decisive passage words. Format {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"...","steps":3}]} .',
    JSON.stringify(candidates.map((item, index) => ({ index, passage: item.passage, prompt: item.prompt, choices: item.choices }))),
    3500,
  )
  const accepted = []
  for (const [index, item] of candidates.entries()) {
    const verdict = review.reviews?.find((row) => row.index === index)
    if (!verdict?.valid || verdict.answer !== item.answer || Number(verdict.steps) < 2 || String(verdict.reason ?? '').length < 25) continue
    const rubric = scoreBankQuestion({ questionText: item.prompt, passage: item.passage,
      explanation: item.solution, choices: Object.values(item.choices), rationales: item.wrong,
      estimatedSeconds: item.estimated_seconds })
    if (rubric.total < 12 || rubric.scores.steps < 2) continue
    const fingerprint = createHash('sha256').update(`${item.passage}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex')
    const frame = `${exam}|${topic.id}|${templateSignature(item.prompt)}`
    if (fingerprints.has(fingerprint) || existingFrames.has(frame)) continue
    fingerprints.add(fingerprint)
    existingFrames.add(frame)
    accepted.push({ item, fingerprint, verdict })
  }
  if (!publish || accepted.length === 0) {
    outcomes.push({ topic: cacheKey, status: publish ? 'rejected_review' : 'reviewed_draft', accepted: accepted.length })
    console.log(`${outcomes.length}/${topics.length} ${cacheKey}: ${accepted.length} reviewed`)
    return
  }
  // Insert inactive; metadata and readback must succeed before activation.
  const passageIds = []
  for (const { item } of accepted) {
    if (!item.passage) { passageIds.push(null); continue }
    const passage = checked(await db.from('passages').insert({ title: `${topic.name} original stimulus`, content: item.passage, author: 'PrepSAT/ACT original', source_type: 'original', source_rights_status: 'owned', active: true }).select('id').single())
    passageIds.push(passage.id)
  }
  const rows = accepted.map(({ item, fingerprint }, index) => ({
    test_type: exam, section_name: section, category_name: domain, topic_name: topic.name,
    subtopic_name: item.subskill || topic.name, topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: 0.9, question_type: 'multiple_choice',
    question_text: item.prompt, choice_a: item.choices.A, choice_b: item.choices.B,
    choice_c: item.choices.C, choice_d: item.choices.D, correct_answer: item.answer,
    official_explanation: item.solution, passage_id: passageIds[index],
    source_type: 'original', source_rights_status: 'owned', source: batch,
    exam_name: batch, fingerprint, answer_verification_status: 'model_cross_checked',
    review_status: 'pending', approved: false, active: false,
  }))
  const prior = checked(await db.from('questions').select('id,fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)).eq('exam_name', batch))
  const priorHashes = new Set(prior.map((row) => row.fingerprint))
  const newRows = rows.filter((row) => !priorHashes.has(row.fingerprint))
  const inserted = newRows.length ? checked(await db.from('questions').insert(newRows).select('id,fingerprint')) : []
  const savedByHash = new Map([...prior, ...inserted].map((row) => [row.fingerprint, row]))
  const saved = rows.map((row) => savedByHash.get(row.fingerprint))
  checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
    question_id: row.id, version: 1, exam_type: exam, section, domain, skill: topic.name,
    subskill: accepted[index].item.subskill || topic.name,
    difficulty_level: 6, difficulty_basis: 'editorial',
    estimated_seconds: Number(accepted[index].item.estimated_seconds) || 120,
    module_eligibility: exam === 'SAT' ? [{ module: 2, route: 'harder' }] : [],
    distractor_rationales: accepted[index].item.wrong,
    contextual: Boolean(accepted[index].item.passage), validation_status: 'pending',
    content_hash: row.fingerprint,
    validation_evidence: { independent_model_answer: accepted[index].verdict.answer,
      independent_model_reason: accepted[index].verdict.reason, independent_model_steps: accepted[index].verdict.steps,
      one_correct_answer_model_check: true, empirically_calibrated: false },
    originality_evidence: { original_generation: true, official_item_comparison_completed: false },
  }))))
  checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
  const readback = checked(await db.from('questions').select('id').in('id', saved.map((row) => row.id)).eq('approved', true).eq('active', true))
  if (readback.length !== saved.length) throw new Error(`Activation readback failed for ${cacheKey}`)
  outcomes.push({ topic: cacheKey, status: 'published_model_reviewed', count: saved.length, ids: saved.map((row) => row.id) })
  writeFileSync(reportPath, `${JSON.stringify({ batch, generatedAt: new Date().toISOString(), outcomes }, null, 2)}\n`)
  console.log(`${outcomes.length}/${topics.length} ${cacheKey}: published ${saved.length}`)
}
let nextTopic = 0
await Promise.all(Array.from({ length: Math.min(6, topics.length) }, async () => {
  while (nextTopic < topics.length) {
    const topic = topics[nextTopic++]
    await processTopic(topic)
  }
}))
writeFileSync(reportPath, `${JSON.stringify({ batch, generatedAt: new Date().toISOString(), outcomes }, null, 2)}\n`)
console.log(JSON.stringify({ topics: topics.length, published: outcomes.reduce((sum, row) => sum + (row.count ?? 0), 0), rejected: outcomes.filter((row) => row.status.startsWith('rejected')).length }))
