import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

// Retired: manual checks found incorrect keys and weak items in this batch.
// Its records were quarantined and must not be republished.
throw new Error('Rejected ACT Math batch; use manually verified replacements instead')

const BATCH = 'ACT Math Challenge Domains v1'
const CACHE = 'supabase/exam-engineering/act-math-challenges-v1-drafts.json'
const plans = [
  { domain: 'Number and Quantity', count: 9, topics: ['Integer Properties', 'Rational Numbers'], focus: 'divisibility and remainders, rational exponents, radical structure, complex numbers when appropriate, and units or numerical constraints' },
  { domain: 'Algebra', count: 12, topics: ['Linear Equations', 'Inequalities', 'Systems of Equations'], focus: 'equations with parameters, systems with a hidden condition, interval constraints, equivalent forms, and multistep linear modeling' },
  { domain: 'Integrating Essential Skills', count: 12, topics: ['Ratios and Rates', 'Percent Change', 'Multi-step Models'], focus: 'percent change with changing bases, ratios with two constraints, rates and units, weighted averages, and context-rich multistep models' },
]
const existing = checked(await db.from('questions').select('id').eq('exam_name', BATCH).limit(1))
if (existing.length) throw new Error(`${BATCH} already exists`)
const topicRows = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
const topicIds = new Map(topicRows.filter((row) => row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Math').map((row) => [row.name, row.id]))
const key = process.env.DEEPSEEK_API_KEY
if (!key) throw new Error('Missing DEEPSEEK_API_KEY')
async function ai(system, user, maxTokens = 6500) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0.35,
      response_format: { type: 'json_object' }, max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  })
  if (!response.ok) throw new Error(`AI HTTP ${response.status}`)
  return JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}')
}
const signature = (text) => text.toLowerCase().replace(/\d+(?:\.\d+)?/g, '#').replace(/[^a-z#+=<>*/^%-]+/g, ' ').replace(/\s+/g, ' ').trim()
const drafts = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : []
for (let group = drafts.length; group < plans.length; group++) {
  const plan = plans[group]
  const questions = []
  for (let batch = 0; batch < Math.ceil(plan.count / 6); batch++) {
    const desired = Math.min(6, plan.count - questions.length)
    let accepted = null
    for (let attempt = 0; attempt < 3 && !accepted; attempt++) {
      const result = await ai(
        'Create completely original upper-range enhanced-ACT Math questions. Never copy or closely paraphrase an official item. Each problem must require interpretation or multiple reasoning steps, not merely bigger numbers. Four plausible close distractors based on specific student errors; one defensible answer. Use plain math notation, no LaTeX. Return JSON only.',
        `Domain: ${plan.domain}. Focus: ${plan.focus}. Produce exactly ${desired} different questions. Target topic names: ${plan.topics.join(', ')}. Avoid these stems: ${questions.map((item) => item.prompt).join(' | ')}. At least half should be contextual with a meaningful mathematical model. Each prompt at least 95 characters OR at least four algebraic symbols/conditions. Require short but complete solution steps. JSON: {"questions":[{"topic":"${plan.topics[0]}","prompt":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"...","distractorRationales":{"A":"...","B":"...","C":"...","D":"..."},"estimatedSeconds":75}]}. Attempt ${attempt + 1}.`,
      ).catch(() => null)
      if (!Array.isArray(result?.questions) || result.questions.length !== desired) continue
      if (!result.questions.every((item) => plan.topics.includes(item.topic) && item.prompt?.length >= 60
        && ['A','B','C','D'].includes(item.answer) && item.choices && Object.keys(item.choices).sort().join('') === 'ABCD'
        && new Set(Object.values(item.choices).map((value) => String(value).trim().toLowerCase())).size === 4
        && item.explanation?.length >= 40)) continue
      const sigs = result.questions.map((item) => signature(item.prompt))
      if (new Set(sigs).size !== sigs.length) continue
      accepted = result.questions
    }
    if (!accepted) throw new Error(`Could not create valid ${plan.domain} batch ${batch}`)
    questions.push(...accepted)
  }
  drafts.push(questions)
  writeFileSync(CACHE, `${JSON.stringify(drafts, null, 2)}\n`)
  console.log(`generated ${plan.domain}: ${questions.length}`)
}

const all = drafts.flatMap((questions, group) => questions.map((item) => ({ ...item, domain: plans[group].domain })))
const reviews = []
for (let start = 0; start < all.length; start += 4) {
  const batch = all.slice(start, start + 4).map((item, offset) => ({ index: start + offset, prompt: item.prompt, choices: item.choices }))
  const result = await ai('Independently solve ACT Math items from the prompt alone without seeing proposed answers. Reject ambiguity, arithmetic errors, easy one-step items, and missing data. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"one equation and one conclusion; 160 characters maximum"}]}. Do not narrate reconsiderations. Calculate first, then write the final answer once.', JSON.stringify(batch), 4200)
  if (!Array.isArray(result.reviews) || result.reviews.length !== batch.length) throw new Error(`Incomplete review batch ${start}`)
  reviews.push(...result.reviews)
}
const approved = all.map((item, index) => ({ item, review: reviews.find((result) => result.index === index) }))
  .filter(({ item, review }) => review?.valid && review.answer === item.answer)
const domainCounts = Object.fromEntries(plans.map((plan) => [plan.domain, approved.filter(({ item }) => item.domain === plan.domain).length]))
if (domainCounts['Number and Quantity'] < 5 || domainCounts.Algebra < 7 || domainCounts['Integrating Essential Skills'] < 5) throw new Error(`Too few verified items: ${JSON.stringify(domainCounts)}`)

const old = []
for (let start = 0; start < 3000; start += 1000) {
  const page = checked(await db.from('questions').select('question_text').eq('test_type', 'ACT').eq('section_name', 'Math').range(start, start + 999))
  old.push(...page)
  if (page.length < 1000) break
}
const signatures = new Set(old.map((row) => signature(row.question_text)))
const unique = approved.filter(({ item }) => {
  const sig = signature(item.prompt)
  if (signatures.has(sig)) return false
  signatures.add(sig)
  return true
})
const uniqueCounts = Object.fromEntries(plans.map((plan) => [plan.domain, unique.filter(({ item }) => item.domain === plan.domain).length]))
if (uniqueCounts['Number and Quantity'] < 5 || uniqueCounts.Algebra < 7 || uniqueCounts['Integrating Essential Skills'] < 5) throw new Error(`Too few nonduplicate items: ${JSON.stringify(uniqueCounts)}`)

const rows = unique.map(({ item }) => ({
  test_type: 'ACT', section_name: 'Math', category_name: item.domain,
  topic_name: item.topic, subtopic_name: item.topic, topic_id: topicIds.get(item.topic) ?? null,
  difficulty: 'Hard', difficulty_score: 0.85, question_type: 'multiple_choice',
  question_text: item.prompt, choice_a: item.choices.A, choice_b: item.choices.B,
  choice_c: item.choices.C, choice_d: item.choices.D, correct_answer: item.answer,
  official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned',
  source: BATCH, exam_name: BATCH,
  fingerprint: createHash('sha256').update(`${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex'),
  answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
}))
const { data: saved, error } = await db.from('questions').insert(rows).select('id')
if (error) throw error
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'Math',
  domain: rows[index].category_name, skill: rows[index].topic_name, subskill: rows[index].topic_name,
  difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: Number(unique[index].item.estimatedSeconds) || 75,
  module_eligibility: [{ module: 1, route: 'common' }], distractor_rationales: unique[index].item.distractorRationales ?? {},
  calculator_expected: true, contextual: /\b(company|researcher|study|project|measurement|cost|distance|price|rate|population|group|model)\b/i.test(rows[index].question_text),
  validation_status: 'pending', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_model_answer: unique[index].review.answer, independent_model_reason: unique[index].review.reason, four_unique_choices: true, template_deduplicated: true },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))).select('question_id'))
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('approved', true).eq('active', true)
if (count !== unique.length) throw new Error(`Readback ${count} != ${unique.length}`)
console.log(JSON.stringify({ inserted: count, perDomain: uniqueCounts, rejected: all.length - count, metadataStatus: 'pending' }))
