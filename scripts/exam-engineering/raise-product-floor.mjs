import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricBand, rubricTotal } from './difficulty-rubric.mjs'

const scene = /^the [a-z]+ [^.]{8,180}? using the [^.]{3,80}?\.\s*/i
const oneStep = [
  /right triangle has legs \d+ and \d+/i,
  /what is the median/i,
  /cut in half at the end of each interval/i,
  /miles per hour\. how many miles/i,
  /model predicts y\s*=/i,
  /planner sets /i,
  /circle has center/i,
  /quadratic has roots/i,
  /two counts satisfy/i,
  /rule sends t to/i,
  /similar floors/i,
  /line graph records \d+ units/i,
  /review table lists group/i,
  /unordered list is/i,
  /ladder leans against a wall/i,
  /kite string is \d+/i,
  /wheelchair ramp rises/i,
  /cable runs in a straight line from/i,
  /what value of .?x.? satisfies \d/i,
  /opposite\s*=\s*\d+ and hypotenuse\s*=\s*\d+/i,
  /angle of elevation to the roof is 60/i,
  /makes a 30 degree angle with level ground/i,
]

function belowFloor(text) {
  return scene.test(text) || oneStep.some((pattern) => pattern.test(text))
}

const keepSources = new Set([
  'True-hard originals 2026-10-06',
  'True-hard originals batch 2 2026-10-06',
  'SAT trig step-up 2026-10-06',
  'Elite science form 2026-10-06',
  'Above-floor originals 2026-10-06',
])

const exams = checked(await db.from('practice_exams').select('exam_number, question_ids, math_module2_hard_ids').in('exam_number', [39, 40, 41]))
const protectedIds = new Set(exams.flatMap((exam) => [...(exam.question_ids ?? []), ...(exam.math_module2_hard_ids ?? [])]))

const rows = []
for (let from = 0; ; from += 1000) {
  const page = checked(await db.from('questions').select('id, source, question_text, active').eq('active', true).range(from, from + 999))
  rows.push(...page)
  if (page.length < 1000) break
}

const drop = rows.filter((row) => !protectedIds.has(row.id) && !keepSources.has(row.source) && belowFloor(row.question_text ?? '')).map((row) => row.id)

const monumentText = 'A surveyor stands on level ground. The tangent of the angle of elevation to the top of a monument is 3/4. She walks 20 meters straight toward the monument, and the tangent of the new angle of elevation is 3/2. How many meters tall is the monument?'
const monument = checked(await db.from('questions').select('id').eq('question_text', monumentText).eq('active', true))
if (monument.length !== 1) throw new Error(`monument rows ${monument.length}`)
const floorRubric = {
  steps: 2, abstraction: 1, hiddenSetup: 1, conceptMixing: 1, graphInference: 1,
  passageComplexity: 1, choiceCloseness: 1, distractorRealism: 1, timePressure: 1,
}
const floorTotal = rubricTotal(floorRubric)
if (rubricBand(floorTotal) !== 'medium') throw new Error(`floor band ${floorTotal}`)

checked(await db.from('questions').update({
  difficulty: 'Medium',
  difficulty_score: 0.5,
}).eq('id', monument[0].id))
const meta = checked(await db.from('exam_item_metadata').select('validation_evidence').eq('question_id', monument[0].id))
if (meta.length !== 1) throw new Error('monument metadata missing')
checked(await db.from('exam_item_metadata').update({
  difficulty_level: 4,
  difficulty_basis: 'editorial',
  validation_evidence: {
    ...(meta[0].validation_evidence ?? {}),
    difficulty_review: true,
    difficulty_rubric: { ...floorRubric, total: floorTotal, band: 'medium' },
    rescore_note: 'Product floor for trigonometry. Two tangent readings are medium-easy on a real exam and the easiest trigonometry item in this bank.',
  },
}).eq('question_id', monument[0].id))

for (let start = 0; start < drop.length; start += 100) {
  checked(await db.from('questions').update({ active: false, difficulty: 'Easy', difficulty_score: 0.25 }).in('id', drop.slice(start, start + 100)))
}

const report = {
  generatedAt: new Date().toISOString(),
  scanned: rows.length,
  deactivatedBelowFloor: drop.length,
  protectedKept: protectedIds.size,
  monumentId: monument[0].id,
  monumentBand: 'medium',
  monumentRubric: floorTotal,
}
writeFileSync('supabase/exam-engineering/raise-product-floor-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
