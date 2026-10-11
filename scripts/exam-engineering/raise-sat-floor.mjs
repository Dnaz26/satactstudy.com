import { existsSync, writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const reportPath = 'supabase/exam-engineering/raise-sat-floor-report.json'
if (existsSync(reportPath)) {
  console.log(JSON.stringify({ skipped: true, reason: 'already applied' }))
  process.exit(0)
}

function loadAll(table, columns, filters) {
  return (async () => {
    const rows = []
    for (let from = 0; ; from += 1000) {
      let query = db.from(table).select(columns).range(from, from + 999)
      for (const [key, value] of filters) query = query.eq(key, value)
      const page = checked(await query)
      rows.push(...page)
      if (page.length < 1000) break
    }
    return rows
  })()
}

const exams = checked(await db.from('practice_exams').select('question_ids, reading_ids, english_ids, math_ids, math_module1_ids, math_module2_easy_ids, math_module2_hard_ids').in('exam_number', [39, 40, 41]))
const protectedIds = new Set(exams.flatMap((exam) => [
  ...(exam.question_ids ?? []),
  ...(exam.reading_ids ?? []),
  ...(exam.english_ids ?? []),
  ...(exam.math_ids ?? []),
  ...(exam.math_module1_ids ?? []),
  ...(exam.math_module2_easy_ids ?? []),
  ...(exam.math_module2_hard_ids ?? []),
]))

const rows = await loadAll('questions', 'id, difficulty, source', [['test_type', 'SAT'], ['active', true]])
const easy = []
const medium = []
const hard = []
for (const row of rows) {
  if (protectedIds.has(row.id)) continue
  if (/Elite hard insane floor/i.test(row.source || '')) continue
  if (row.difficulty === 'Easy') easy.push(row.id)
  else if (row.difficulty === 'Medium') medium.push(row.id)
  else if (row.difficulty === 'Hard') hard.push(row.id)
}

async function writeChunks(ids, patch) {
  for (let start = 0; start < ids.length; start += 80) {
    checked(await db.from('questions').update(patch).in('id', ids.slice(start, start + 80)))
  }
}

await writeChunks(easy, { active: false })
await writeChunks(medium, { difficulty: 'Easy', difficulty_score: 0.35 })
await writeChunks(hard, { difficulty: 'Medium', difficulty_score: 0.55 })

const report = {
  generatedAt: new Date().toISOString(),
  protectedSkipped: rows.filter((row) => protectedIds.has(row.id)).length,
  formerEasyDeactivated: easy.length,
  formerMediumNowEasy: medium.length,
  formerHardNowMedium: hard.length,
}
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
