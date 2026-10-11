import { writeFileSync } from 'node:fs'
import { isChallengeQuestion } from '../../src/lib/practice/complexity'
import { db, checked } from '../digital-sat/db.mjs'

type BankRow = {
  id: string
  topic_id: string | null
  test_type: string | null
  section_name: string | null
  exam_name: string | null
  difficulty: string | null
  difficulty_score: number | null
  question_text: string | null
  choice_a: string | null
  choice_b: string | null
  choice_c: string | null
  choice_d: string | null
  correct_answer: string | null
  official_explanation: string | null
  ai_explanation: string | null
  question_type: string | null
  passage_id: string | null
}

const rows: BankRow[] = []
for (let start = 0; start < 20000; start += 1000) {
  const page = checked(await db.from('questions')
    .select('id,topic_id,test_type,section_name,exam_name,difficulty,difficulty_score,question_text,choice_a,choice_b,choice_c,choice_d,correct_answer,official_explanation,ai_explanation,question_type,passage_id')
    .eq('active', true).eq('approved', true).range(start, start + 999)) as BankRow[]
  rows.push(...page)
  if (page.length < 1000) break
}
const passageIds = [...new Set(rows.flatMap(row => row.passage_id ? [row.passage_id] : []))]
const passageWords = new Map<string, string>()
for (let start = 0; start < passageIds.length; start += 100) {
  const chunk = checked(await db.from('passages').select('id,content').in('id', passageIds.slice(start, start + 100)))
  for (const passage of chunk) passageWords.set(passage.id, passage.content)
}
const eligible = rows.filter(row => isChallengeQuestion({ ...row, passage_content: row.passage_id ? passageWords.get(row.passage_id) : null }))
const bySection: Record<string, number> = {}
const byTopic: Record<string, number> = {}
for (const row of eligible) {
  const key = `${row.test_type ?? '?'}:${row.section_name ?? '?'}`
  bySection[key] = (bySection[key] ?? 0) + 1
  if (row.topic_id) byTopic[row.topic_id] = (byTopic[row.topic_id] ?? 0) + 1
}
const report = {
  generatedAt: new Date().toISOString(),
  caveat: 'Structural eligibility is not independent mathematical or editorial validation.',
  approvedActive: rows.length,
  challengeEligible: eligible.length,
  bySection,
  topicCounts: byTopic,
}
if (process.argv[2]) writeFileSync(process.argv[2], `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ approvedActive: report.approvedActive, challengeEligible: report.challengeEligible, bySection }, null, 2))
