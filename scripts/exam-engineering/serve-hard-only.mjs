import { existsSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const reportPath = 'supabase/exam-engineering/serve-hard-only-report.json'
if (existsSync(reportPath)) {
  console.log(JSON.stringify({ skipped: true }))
  process.exit(0)
}

const exams = checked(await db.from('practice_exams').select('question_ids, reading_ids, english_ids, math_ids, math_module2_hard_ids').in('exam_number', [39, 40, 41]))
const protectedIds = new Set(exams.flatMap((exam) => [
  ...(exam.question_ids ?? []),
  ...(exam.reading_ids ?? []),
  ...(exam.english_ids ?? []),
  ...(exam.math_ids ?? []),
  ...(exam.math_module2_hard_ids ?? []),
]))

const rows = []
for (let from = 0; ; from += 1000) {
  const page = checked(await db.from('questions').select('id, test_type, difficulty, source').eq('active', true).range(from, from + 999))
  rows.push(...page)
  if (page.length < 1000) break
}

const quality = /Elite hard|Fifty percent harder|Above-floor|True-hard|trig step-up/i
const promote = []
const retire = []
for (const row of rows) {
  if (protectedIds.has(row.id)) continue
  if (row.test_type !== 'SAT') continue
  if (quality.test(row.source || '') && row.difficulty !== 'Hard') promote.push(row.id)
  else if (!quality.test(row.source || '') && row.difficulty !== 'Hard') retire.push(row.id)
}

async function writeChunks(ids, patch) {
  for (let start = 0; start < ids.length; start += 80) {
    checked(await db.from('questions').update(patch).in('id', ids.slice(start, start + 80)))
  }
}

await writeChunks(promote, { difficulty: 'Hard', difficulty_score: 1 })
await writeChunks(retire, { active: false })

const report = {
  generatedAt: new Date().toISOString(),
  promotedToHard: promote.length,
  retiredBelowHard: retire.length,
  protectedSkipped: rows.filter((row) => protectedIds.has(row.id)).length,
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
