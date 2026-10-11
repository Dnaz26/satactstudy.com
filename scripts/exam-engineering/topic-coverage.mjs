import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const topics = checked(await db.from('topics')
  .select('id, name, categories(name, sections(name, tests(name)))'))
const questions = []
for (let start = 0; start < 20000; start += 1000) {
  const page = checked(await db.from('questions')
    .select('id, topic_id, active, approved, difficulty, difficulty_score, question_text, choice_a, choice_b, choice_c, choice_d, question_type, source_type, source_rights_status, image_url, test_type, section_name')
    .range(start, start + 999))
  questions.push(...page)
  if (page.length < 1000) break
}
const metadata = []
for (let start = 0; start < 20000; start += 1000) {
  const page = checked(await db.from('exam_item_metadata')
    .select('question_id, validation_status, graphic_type, graphic_data')
    .range(start, start + 999))
  metadata.push(...page)
  if (page.length < 1000) break
}
const metaByQuestion = new Map(metadata.map((row) => [row.question_id, row]))

const byTopic = new Map()
for (const row of questions) {
  if (!row.active || !row.approved || !row.topic_id) continue
  const prompt = String(row.question_text ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
  const choices = [row.choice_a, row.choice_b, row.choice_c, row.choice_d]
    .filter((choice) => choice != null && String(choice).trim())
    .map((choice) => String(choice).normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase())
    .sort()
  const contentKey = prompt
    ? createHash('sha256').update(JSON.stringify([prompt, row.question_type ?? '', choices])).digest('hex')
    : null
  const value = byTopic.get(row.topic_id) ?? { approvedActive: 0, distinctQuestionCount: 0, originalDistinctQuestionCount: 0, hardLabeled: 0, validatedDistinct: 0, graphicDistinct: 0, unverifiableActive: 0, seen: new Map() }
  value.approvedActive += 1
  if (!contentKey) {
    value.unverifiableActive += 1
    byTopic.set(row.topic_id, value)
    continue
  }
  const isOriginal = ['original', 'original_derived_reference'].includes(row.source_type)
    && ['owned', 'original'].includes(row.source_rights_status)
  const previous = value.seen.get(contentKey)
  const meta = metaByQuestion.get(row.id)
  const isHard = row.difficulty === 'Hard' && Number(row.difficulty_score ?? 0) >= 0.72
  const isValidated = meta?.validation_status === 'validated'
  const isGraphic = Boolean(row.image_url) || Boolean(meta?.graphic_type) || (meta?.graphic_data != null && Object.keys(meta.graphic_data).length > 0)
  if (previous) {
    if (!previous.isOriginal && isOriginal) {
      previous.isOriginal = true
      value.originalDistinctQuestionCount += 1
    }
    if (previous.isOriginal && !previous.hard && isHard) {
      previous.hard = true
      value.hardLabeled += 1
    }
    if (previous.isOriginal && !previous.validated && isValidated) {
      previous.validated = true
      value.validatedDistinct += 1
    }
    if (previous.isOriginal && !previous.graphic && isGraphic) {
      previous.graphic = true
      value.graphicDistinct += 1
    }
    byTopic.set(row.topic_id, value)
    continue
  }
  value.seen.set(contentKey, { hard: isOriginal && isHard, isOriginal, validated: isOriginal && isValidated, graphic: isOriginal && isGraphic })
  value.distinctQuestionCount += 1
  if (isOriginal) value.originalDistinctQuestionCount += 1
  if (isOriginal && isHard) value.hardLabeled += 1
  if (isOriginal && isValidated) value.validatedDistinct += 1
  if (isOriginal && isGraphic) value.graphicDistinct += 1
  byTopic.set(row.topic_id, value)
}

const rows = topics.map((topic) => {
  const counts = byTopic.get(topic.id) ?? { approvedActive: 0, distinctQuestionCount: 0, originalDistinctQuestionCount: 0, hardLabeled: 0, validatedDistinct: 0, graphicDistinct: 0, unverifiableActive: 0, seen: new Map() }
  return {
    id: topic.id,
    exam: topic.categories?.sections?.tests?.name ?? null,
    section: topic.categories?.sections?.name ?? null,
    domain: topic.categories?.name ?? null,
    topic: topic.name,
    approvedActive: counts.approvedActive,
    distinctQuestionCount: counts.distinctQuestionCount,
    exactDuplicateRows: counts.approvedActive - counts.distinctQuestionCount - counts.unverifiableActive,
    originalDistinctQuestionCount: counts.originalDistinctQuestionCount,
    unverifiableActive: counts.unverifiableActive,
    hardLabeled: counts.hardLabeled,
    validatedDistinct: counts.validatedDistinct,
    graphicDistinct: counts.graphicDistinct,
    missingTo75: Math.max(0, 75 - counts.originalDistinctQuestionCount),
    missingTo100: Math.max(0, 100 - counts.originalDistinctQuestionCount),
    hardLabeledMissingTo100: Math.max(0, 100 - counts.hardLabeled),
  }
}).sort((a, b) => b.missingTo100 - a.missingTo100 || a.topic.localeCompare(b.topic))

const activeApproved = questions.filter((row) => row.active && row.approved)
const originalActive = activeApproved.filter((row) => ['original', 'original_derived_reference'].includes(row.source_type) && ['owned', 'original'].includes(row.source_rights_status))
const graphicRows = activeApproved.filter((row) => {
  const meta = metaByQuestion.get(row.id)
  return Boolean(row.image_url) || Boolean(meta?.graphic_type) || (meta?.graphic_data != null && Object.keys(meta.graphic_data).length > 0)
})
function median(values) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const report = {
  generatedAt: new Date().toISOString(),
  targetPerTopic: 100,
  interimTargetPerTopic: 75,
  caveat: 'Distinctness is exact normalized question text plus question type and sorted answer choices; near-duplicates still require editorial review. Original counts also require source_type original/original_derived_reference and source_rights_status owned/original. Unverifiable records without question text are excluded. A Hard label does not prove actual exam difficulty or independent validation. Validated means exam_item_metadata.validation_status is validated on at least one original copy of that distinct item. Graphic means an image URL or nonempty graphic metadata.',
  summary: {
    totalQuestionRows: questions.length,
    activeApproved: activeApproved.length,
    activeOriginalRows: originalActive.length,
    activeOriginalDistinct: rows.reduce((sum, row) => sum + row.originalDistinctQuestionCount, 0),
    topicCount: rows.length,
    topicsAt75: rows.filter((row) => row.originalDistinctQuestionCount >= 75).length,
    topicsAt100: rows.filter((row) => row.originalDistinctQuestionCount >= 100).length,
    topicsBelow75: rows.filter((row) => row.originalDistinctQuestionCount < 75).length,
    topicsBelow100: rows.filter((row) => row.originalDistinctQuestionCount < 100).length,
    topicsAtZero: rows.filter((row) => row.originalDistinctQuestionCount === 0).length,
    totalDistinctQuestionDeficit: rows.reduce((sum, row) => sum + row.missingTo100, 0),
    totalDistinctDeficitTo75: rows.reduce((sum, row) => sum + row.missingTo75, 0),
    exactDuplicateRows: rows.reduce((sum, row) => sum + row.exactDuplicateRows, 0),
    topicsWith100HardLabeled: rows.filter((row) => row.hardLabeled >= 100).length,
    topicsWith25HardLabeled: rows.filter((row) => row.hardLabeled >= 25).length,
    satTopicMedianOriginalDistinct: median(rows.filter((row) => row.exam === 'SAT').map((row) => row.originalDistinctQuestionCount)),
    actTopicMedianOriginalDistinct: median(rows.filter((row) => row.exam === 'ACT').map((row) => row.originalDistinctQuestionCount)),
    validatedOriginalDistinct: rows.reduce((sum, row) => sum + row.validatedDistinct, 0),
    graphicActiveRows: graphicRows.length,
    graphicOriginalDistinct: rows.reduce((sum, row) => sum + row.graphicDistinct, 0),
    actEnglishValidatedDistinct: rows.filter((row) => row.exam === 'ACT' && row.section === 'English').reduce((sum, row) => sum + row.validatedDistinct, 0),
    actReadingValidatedDistinct: rows.filter((row) => row.exam === 'ACT' && row.section === 'Reading').reduce((sum, row) => sum + row.validatedDistinct, 0),
  },
  topics: rows,
}
const output = process.argv[2]
if (output) writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report.summary, null, 2))
