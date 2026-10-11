import { db, checked } from '../digital-sat/db.mjs'

const apply = process.argv.includes('--apply')
const rows = checked(await db.from('questions')
  .select('id, active, approved')
  .eq('exam_name', 'StudentQuest expanded original bank'))
const forms = checked(await db.from('practice_exams')
  .select('question_ids, reading_ids, english_ids, math_ids, math_module1_ids, math_module2_easy_ids, math_module2_hard_ids'))
const fields = ['question_ids', 'reading_ids', 'english_ids', 'math_ids', 'math_module1_ids', 'math_module2_easy_ids', 'math_module2_hard_ids']
const referenced = new Set(forms.flatMap((form) => fields.flatMap((field) => form[field] ?? [])))
const candidates = rows.filter((row) => row.active && row.approved && !referenced.has(row.id))

if (apply) {
  for (let i = 0; i < candidates.length; i += 100) {
    const ids = candidates.slice(i, i + 100).map((row) => row.id)
    checked(await db.from('questions').update({
      active: false,
      approved: false,
      review_status: 'requires_review',
    }).in('id', ids).select('id'))
  }
}

const { count: remaining } = await db.from('questions')
  .select('id', { count: 'exact', head: true })
  .eq('exam_name', 'StudentQuest expanded original bank')
  .eq('active', true).eq('approved', true)

console.log(JSON.stringify({
  applied: apply,
  reviewed: rows.length,
  formReferenced: rows.filter((row) => referenced.has(row.id)).length,
  quarantined: apply ? candidates.length : 0,
  eligibleToQuarantine: candidates.length,
  remainingApprovedActive: remaining,
}, null, 2))
