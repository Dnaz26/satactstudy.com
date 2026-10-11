import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

const apply = process.argv.includes('--apply')
const keepPerTopic = 2

function frameKey(text) {
  let value = String(text ?? '').toLowerCase()
  value = value.replace(/^the [a-z]+ [^.]{8,180}? using the [^.]{3,80}?\.\s*/u, '')
  value = value.replace(/[0-9]+(?:\.[0-9]+)?/g, '#')
  value = value.replace(/\b(coastal archive|reef lab|night clinic|print loft|glass studio|seed vault|bell tower|map depot|canoe shed|lens bench|ticket booth|wool shed|radio booth|spice vault|puppet loft|ferry dock|kiln yard|choir room|harbor office|orchard barn|clock shop|paper mill|bike co-op|planetarium|pottery shed|weather loft|binding room|signal hut|tea warehouse|marble yard|salted plaster|worn rope|faded ink|old varnish|dusty linen|brittle cable|cheap cloth|blunt blade|damp paper|green copper|cracked glaze|loose gut|cedar shingle|tin solder|raw honey|clay slip|oak peg|silk thread|graphite dust|river silt|beeswax|lime wash|iron oxide|pine pitch|glass frit|wool batting|lead type|cane webbing|bone folder|chalk line)\b/g, ' ')
  value = value.replace(/[^a-z#]+/g, ' ').replace(/\s+/g, ' ').trim()
  return value.slice(0, 180)
}

const rows = []
for (let from = 0; ; from += 1000) {
  const page = checked(await db.from('questions').select('id, topic_id, question_text, official_explanation, source, active').eq('active', true).range(from, from + 999))
  rows.push(...page)
  if (page.length < 1000) break
}
const exams = checked(await db.from('practice_exams').select('question_ids, math_module2_hard_ids').in('exam_number', [39, 40]))
const protectedIds = new Set(exams.flatMap((exam) => [...(exam.question_ids ?? []), ...(exam.math_module2_hard_ids ?? [])]))

const groups = new Map()
for (const row of rows) {
  const key = `${row.topic_id}|${frameKey(row.question_text)}`
  const list = groups.get(key) ?? []
  list.push(row)
  groups.set(key, list)
}

const families = [...groups.values()].filter((list) => list.length > keepPerTopic)
families.sort((a, b) => b.length - a.length)
const drop = []
for (const list of families) {
  const ranked = [...list].sort((a, b) => {
    const aProtected = protectedIds.has(a.id) ? 1 : 0
    const bProtected = protectedIds.has(b.id) ? 1 : 0
    if (aProtected !== bProtected) return bProtected - aProtected
    return (b.official_explanation?.length ?? 0) - (a.official_explanation?.length ?? 0)
  })
  for (const row of ranked.slice(keepPerTopic)) {
    if (!protectedIds.has(row.id)) drop.push(row.id)
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  activeRowsScanned: rows.length,
  familiesOverCap: families.length,
  largestFamily: families[0]?.length ?? 0,
  redundantCopies: drop.length,
  keptPerTopicFrame: keepPerTopic,
  protectedExamQuestions: protectedIds.size,
  sampleFrames: families.slice(0, 12).map((list) => ({
    size: list.length,
    source: list[0].source,
    frame: frameKey(list[0].question_text).slice(0, 140),
  })),
}
writeFileSync('supabase/exam-engineering/near-duplicate-family-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))

if (!apply) process.exit(0)
for (let start = 0; start < drop.length; start += 100) {
  checked(await db.from('questions').update({ active: false }).in('id', drop.slice(start, start + 100)))
}
console.log(JSON.stringify({ deactivated: drop.length }))
