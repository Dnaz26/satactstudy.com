import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

function contentKey(row) {
  const prompt = String(row.question_text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
  if (!prompt) return null
  const choices = [row.choice_a, row.choice_b, row.choice_c, row.choice_d]
    .filter((choice) => choice != null && String(choice).trim())
    .map((choice) => String(choice).normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase())
    .sort()
  return createHash('sha256').update(JSON.stringify([prompt, row.question_type ?? '', choices])).digest('hex')
}

function score(row, meta) {
  let value = 0
  if (meta?.validation_status === 'validated') value += 100
  if (row.difficulty === 'Hard' && Number(row.difficulty_score ?? 0) >= 0.72) value += 20
  if (row.image_url || meta?.graphic_type) value += 15
  const explanation = String(row.official_explanation ?? '')
  if (explanation.length > 40) value += 10
  value += Math.min(20, Math.floor(explanation.length / 80))
  return value
}

const questions = []
for (let start = 0; start < 20000; start += 1000) {
  const page = checked(await db.from('questions')
    .select('id, topic_id, topic_name, active, approved, difficulty, difficulty_score, question_text, choice_a, choice_b, choice_c, choice_d, question_type, source_type, source_rights_status, official_explanation, image_url')
    .eq('active', true)
    .eq('approved', true)
    .range(start, start + 999))
  questions.push(...page)
  if (page.length < 1000) break
}
const metadata = []
for (let start = 0; start < 20000; start += 1000) {
  const page = checked(await db.from('exam_item_metadata').select('question_id, validation_status, graphic_type').range(start, start + 999))
  metadata.push(...page)
  if (page.length < 1000) break
}
const metaByQuestion = new Map(metadata.map((row) => [row.question_id, row]))
const groups = new Map()
for (const row of questions) {
  const key = contentKey(row)
  if (!key) continue
  const isOriginal = ['original', 'original_derived_reference'].includes(row.source_type)
    && ['owned', 'original'].includes(row.source_rights_status)
  if (!isOriginal) continue
  const groupKey = `${row.topic_id}:${key}`
  const list = groups.get(groupKey) ?? []
  list.push(row)
  groups.set(groupKey, list)
}

const deactivate = []
const kept = []
for (const list of groups.values()) {
  if (list.length < 2) continue
  const ranked = list.slice().sort((a, b) => {
    const delta = score(b, metaByQuestion.get(b.id)) - score(a, metaByQuestion.get(a.id))
    if (delta !== 0) return delta
    return a.id.localeCompare(b.id)
  })
  const winner = ranked[0]
  kept.push({ id: winner.id, topic: winner.topic_name, copies: list.length, score: score(winner, metaByQuestion.get(winner.id)) })
  for (const loser of ranked.slice(1)) deactivate.push({ id: loser.id, keptId: winner.id, topic: loser.topic_name })
}

const apply = process.argv.includes('--apply')
if (apply) {
  for (let start = 0; start < deactivate.length; start += 100) {
    const ids = deactivate.slice(start, start + 100).map((row) => row.id)
    const saved = checked(await db.from('questions').update({ active: false }).in('id', ids).select('id'))
    if (saved.length !== ids.length) throw new Error(`Deactivated ${saved.length} of ${ids.length}`)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  applied: apply,
  method: 'Exact normalized prompt, question type, and sorted choices. The highest-scoring active original copy stays active. Ties keep the lowest id. Other copies are set inactive and are not deleted.',
  duplicateGroups: kept.length,
  kept: kept.length,
  deactivated: deactivate.length,
  sample: kept.slice(0, 12),
  deactivatedIds: deactivate.map((row) => row.id),
}
writeFileSync('supabase/exam-engineering/duplicate-cleanup-latest.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ applied: apply, duplicateGroups: kept.length, deactivated: deactivate.length }, null, 2))
