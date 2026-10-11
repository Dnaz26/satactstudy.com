import { mkdirSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { reclassifyLabel, routingScore, scoreBankQuestion, templateSignature } from './product-rubric.mjs'

const apply = process.argv.includes('--apply')

async function pages(table, select, filter) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999)
    if (filter) query = filter(query)
    const page = checked(await query)
    rows.push(...page)
    if (page.length < 1000) break
  }
  return rows
}

function idsFrom(value, into) {
  if (!Array.isArray(value)) return
  for (const id of value) if (typeof id === 'string') into.add(id)
}

const questions = await pages(
  'questions',
  'id,test_type,section_name,category_name,topic_name,difficulty,difficulty_score,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,official_explanation,ai_explanation,passage_id,exam_name,fingerprint,image_url,question_type,active,approved',
  (query) => query.eq('active', true).eq('approved', true),
)
const passageIds = [...new Set(questions.map((row) => row.passage_id).filter(Boolean))]
const passages = new Map()
for (let start = 0; start < passageIds.length; start += 100) {
  const slice = passageIds.slice(start, start + 100)
  for (const row of checked(await db.from('passages').select('id,content').in('id', slice))) {
    passages.set(row.id, row.content ?? '')
  }
}
const metadata = new Map()
const questionIds = questions.map((row) => row.id)
for (let start = 0; start < questionIds.length; start += 100) {
  const slice = questionIds.slice(start, start + 100)
  for (const row of checked(await db.from('exam_item_metadata').select('question_id,graphic_type,estimated_seconds,distractor_rationales,validation_evidence,validation_status').in('question_id', slice))) {
    metadata.set(row.question_id, row)
  }
}

const protectedIds = new Set()
for (const exam of await pages('practice_exams', 'question_ids,math_ids,english_ids,reading_ids,math_module1_ids,math_module2_easy_ids,math_module2_hard_ids')) {
  idsFrom(exam.question_ids, protectedIds)
  idsFrom(exam.math_ids, protectedIds)
  idsFrom(exam.english_ids, protectedIds)
  idsFrom(exam.reading_ids, protectedIds)
  idsFrom(exam.math_module1_ids, protectedIds)
  idsFrom(exam.math_module2_easy_ids, protectedIds)
  idsFrom(exam.math_module2_hard_ids, protectedIds)
}
for (const row of await pages('sat_question_assignments', 'question_id')) protectedIds.add(row.question_id)
for (const row of await pages('user_practice_exams', 'assigned_question_ids,assigned_reading_ids,assigned_english_ids,math_module2_easy_snapshot,math_module2_hard_snapshot')) {
  idsFrom(row.assigned_question_ids, protectedIds)
  idsFrom(row.assigned_reading_ids, protectedIds)
  idsFrom(row.assigned_english_ids, protectedIds)
  idsFrom(row.math_module2_easy_snapshot, protectedIds)
  idsFrom(row.math_module2_hard_snapshot, protectedIds)
}

const scored = questions.map((row) => {
  const meta = metadata.get(row.id)
  const result = scoreBankQuestion({
    questionText: row.question_text,
    passage: passages.get(row.passage_id) ?? '',
    explanation: row.official_explanation || row.ai_explanation || '',
    choices: [row.choice_a, row.choice_b, row.choice_c, row.choice_d],
    rationales: meta?.distractor_rationales ?? {},
    graphic: Boolean(row.image_url || meta?.graphic_type),
    estimatedSeconds: meta?.estimated_seconds ?? null,
  })
  const next = reclassifyLabel(row.difficulty, result)
  return { row, meta, result, next, signature: templateSignature(row.question_text ?? '') }
})

const byFingerprint = new Map()
const byFrame = new Map()
for (const item of scored) {
  const fingerprint = item.row.fingerprint || ''
  if (fingerprint) {
    const group = byFingerprint.get(fingerprint) ?? []
    group.push(item)
    byFingerprint.set(fingerprint, group)
  }
  const frameKey = `${item.row.test_type}|${item.row.topic_name}|${item.signature}`
  const frame = byFrame.get(frameKey) ?? []
  frame.push(item)
  byFrame.set(frameKey, frame)
}

const quarantine = new Map()
for (const group of byFingerprint.values()) {
  if (group.length < 2) continue
  const ranked = [...group].sort((a, b) => b.result.total - a.result.total || a.row.id.localeCompare(b.row.id))
  for (const extra of ranked.slice(1)) {
    quarantine.set(extra.row.id, 'Exact duplicate fingerprint. The higher-rubric copy stays active.')
  }
}
for (const group of byFrame.values()) {
  if (group.length <= 2) continue
  const ranked = [...group].sort((a, b) => b.result.total - a.result.total || a.row.id.localeCompare(b.row.id))
  for (const extra of ranked.slice(2)) {
    if (!quarantine.has(extra.row.id)) quarantine.set(extra.row.id, 'Repeated reasoning frame beyond the two-item cap.')
  }
}
for (const item of scored) {
  const choices = [item.row.choice_a, item.row.choice_b, item.row.choice_c, item.row.choice_d].filter(Boolean)
  const produced = item.row.question_type === 'spr' || item.row.question_type === 'student_produced_response'
  if (!item.row.correct_answer) quarantine.set(item.row.id, 'Missing correct answer.')
  else if (!produced && choices.length >= 2 && new Set(choices.map((choice) => choice.trim().toLowerCase())).size < choices.length) {
    quarantine.set(item.row.id, 'Duplicate answer choices.')
  }
}

const changes = []
const keptBecauseExam = []
for (const item of scored) {
  const protectedItem = protectedIds.has(item.row.id)
  const quarantineReason = quarantine.get(item.row.id)
  if (quarantineReason && protectedItem) {
    keptBecauseExam.push({ id: item.row.id, reason: quarantineReason, exam_name: item.row.exam_name })
  }
  const nextScore = routingScore(item.result.total)
  const labelChanged = (item.row.difficulty ?? '') !== item.next.difficulty
  const scoreChanged = Number(item.row.difficulty_score ?? -1) !== nextScore
  const willQuarantine = Boolean(quarantineReason) && !protectedItem
  if (!labelChanged && !scoreChanged && !willQuarantine) continue
  changes.push({
    id: item.row.id,
    test_type: item.row.test_type,
    section: item.row.section_name,
    domain: item.row.category_name,
    topic: item.row.topic_name,
    old_difficulty: item.row.difficulty,
    new_difficulty: item.next.difficulty,
    old_score: item.row.difficulty_score,
    new_score: nextScore,
    band: item.next.band,
    rubric_total: item.result.total,
    rubric: item.result.scores,
    reason: willQuarantine ? `${item.next.reason} Quarantined: ${quarantineReason}` : item.next.reason,
    quarantined: willQuarantine,
    exam_protected: protectedItem,
    exam_name: item.row.exam_name,
  })
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: apply ? 'apply' : 'dry-run',
  activeApproved: questions.length,
  examProtectedIds: protectedIds.size,
  changed: changes.length,
  quarantined: changes.filter((row) => row.quarantined).length,
  keptOnExamsDespiteQuarantineFlag: keptBecauseExam.length,
  byBand: {},
  byOldToNew: {},
  note: 'Rubric totals are editorial structural scores, not student-performance data. They are not a literal multiple of official SAT or ACT difficulty.',
}
summary.satModulePools = { math: { easier: 0, medium: 0, harder: 0 }, reading: { easier: 0, medium: 0, harder: 0 } }
for (const item of scored) {
  summary.byBand[item.next.band] = (summary.byBand[item.next.band] ?? 0) + 1
  if (item.row.test_type !== 'SAT') continue
  const score = routingScore(item.result.total)
  const section = item.row.section_name === 'Math' ? 'math' : item.row.section_name === 'Reading and Writing' ? 'reading' : null
  if (!section) continue
  const pool = score >= 0.85 ? 'harder' : score >= 0.5 ? 'medium' : 'easier'
  summary.satModulePools[section][pool] += 1
}
for (const change of changes) {
  const key = `${change.old_difficulty} → ${change.new_difficulty} (${change.band})`
  summary.byOldToNew[key] = (summary.byOldToNew[key] ?? 0) + 1
}

const answerPositions = { A: 0, B: 0, C: 0, D: 0, other: 0 }
for (const row of questions) {
  const key = (row.correct_answer ?? '').toUpperCase()
  if (answerPositions[key] !== undefined) answerPositions[key] += 1
  else answerPositions.other += 1
}
const repeatedFrames = [...byFrame.entries()]
  .filter(([, group]) => group.length > 2)
  .map(([key, group]) => ({ frame: key.slice(0, 180), count: group.length }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 40)
const exactDuplicateGroups = [...byFingerprint.values()].filter((group) => group.length > 1).length

mkdirSync('supabase/exam-engineering', { recursive: true })
const report = {
  summary,
  answerPositions,
  exactDuplicateGroups,
  repeatedFrames,
  keptBecauseExam,
  changes,
}
writeFileSync('supabase/exam-engineering/difficulty-reclass-2026-10-10.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ ...summary, exactDuplicateGroups, repeatedFrameFamilies: repeatedFrames.length }, null, 2))

if (!apply) {
  console.log('Dry run only. Re-run with --apply to persist.')
  process.exit(0)
}

async function pool(items, worker) {
  const queue = [...items]
  const runners = Array.from({ length: 12 }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (item) await worker(item)
    }
  })
  await Promise.all(runners)
}

let metadataWrites = 0
await pool(scored, async (item) => {
  const meta = item.meta
  if (!meta || meta.validation_status !== 'validated') return
  const evidence = {
    ...(meta.validation_evidence ?? {}),
    product_audit_2026_10_10: {
      rubric: item.result.scores,
      total: item.result.total,
      recommended_band: item.next.band,
      recommended_difficulty: item.next.difficulty,
      recommended_score: routingScore(item.result.total),
      reason: item.next.reason,
      previous_difficulty: item.row.difficulty,
      previous_score: item.row.difficulty_score,
      structural_estimate: true,
      student_performance_multiple: false,
      live_label_unchanged: true,
      live_label_reason: 'Recommended labels were not written onto questions.difficulty because doing so would drop SAT Module 2 below a full module and would remove nearly all Rapid Fire items before a replacement Hard pool exists.',
    },
  }
  checked(await db.from('exam_item_metadata').update({ validation_evidence: evidence }).eq('question_id', item.row.id))
  metadataWrites += 1
})
console.log(`Stored rubric audits on ${metadataWrites} validated metadata rows. Live difficulty labels and scores were not changed.`)
