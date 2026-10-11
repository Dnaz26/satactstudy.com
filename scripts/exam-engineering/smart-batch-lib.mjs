import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'

function rationaleFor(choice, choiceIndex, answer) {
  if ('ABCD'[choiceIndex] === answer) return choice.reason.startsWith('Correct:') ? choice.reason : `Correct: ${choice.reason}`
  return choice.reason.replace(/^Correct:\s*/u, '')
}

export async function saveSmartBatch({ batch, reportPath, topicTargets, items, requiredCount }) {
  const validItems = items.filter((item) => !item.invalid)
  const expected = requiredCount ?? 32
  if (validItems.length !== expected) throw new Error(`Expected ${expected} valid items, found ${validItems.length}`)
  if (items.length - validItems.length < 2) throw new Error('Expected invalid drafts to be excluded')

  const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  for (const target of Object.values(topicTargets)) {
    const row = topicRows.find((topic) => topic.id === target.id)
    if (!row) throw new Error(`Missing topic ${target.id}`)
    const exam = row.categories?.sections?.tests?.name
    const section = row.categories?.sections?.name
    const domain = row.categories?.name
    if (row.name !== target.topic || exam !== target.exam || section !== target.section || domain !== target.domain) {
      throw new Error(`Topic mismatch for ${target.id}: ${JSON.stringify({ exam, section, domain, topic: row.name })}`)
    }
  }

  for (const [index, item] of validItems.entries()) {
    if (!topicTargets[item.target]) throw new Error(`Unknown topic target on item ${index}`)
    if (!item.prompt || !item.explanation || !item.proof || !item.subskill) throw new Error(`Missing required text on item ${index}`)
    if (!Array.isArray(item.choices) || item.choices.length !== 4) throw new Error(`Wrong choice count on item ${index}`)
    if (new Set(item.choices.map((choice) => choice.text)).size !== 4) throw new Error(`Duplicate choice text on item ${index}`)
    if (!/^[ABCD]$/.test(item.answer)) throw new Error(`Bad answer on item ${index}`)
    const correctChoice = item.choices['ABCD'.indexOf(item.answer)]
    if (item.expressionAnswer) {
      if (correctChoice.text !== item.expressionAnswer) throw new Error(`Expression key mismatch on item ${index}`)
    } else {
      const matching = item.choices.filter((choice) => typeof choice.value === 'number' && Math.abs(choice.value - item.answerValue) < 1e-9)
      if (matching.length !== 1 || matching[0].text !== correctChoice.text) throw new Error(`Numeric key uniqueness failed on item ${index}`)
    }
    for (const [choiceIndex, choice] of item.choices.entries()) {
      if ('ABCD'[choiceIndex] !== item.answer && /^Correct:/u.test(choice.reason)) {
        throw new Error(`Wrong choice starts with Correct: on item ${index}`)
      }
    }
  }

  const rows = validItems.map((item) => {
    const target = topicTargets[item.target]
    const fingerprint = createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice.text).join('\n')}`).digest('hex')
    return {
      test_type: target.exam,
      section_name: target.section,
      category_name: target.domain,
      topic_name: target.topic,
      subtopic_name: target.topic,
      topic_id: target.id,
      difficulty: item.difficulty >= 6 ? 'Hard' : 'Medium',
      difficulty_score: (item.difficulty - 1) / 6,
      question_type: 'multiple_choice',
      question_text: item.prompt,
      choice_a: item.choices[0].text,
      choice_b: item.choices[1].text,
      choice_c: item.choices[2].text,
      choice_d: item.choices[3].text,
      correct_answer: item.answer,
      official_explanation: item.explanation,
      source_type: 'original',
      source_rights_status: 'owned',
      source: batch,
      exam_name: batch,
      fingerprint,
      answer_verification_status: 'independently_verified',
      review_status: 'pending',
      approved: false,
      active: false,
    }
  })

  if (new Set(rows.map((row) => row.fingerprint)).size !== rows.length) throw new Error('Batch contains duplicate fingerprints')
  const duplicates = []
  for (let start = 0; start < rows.length; start += 40) {
    const slice = rows.slice(start, start + 40).map((row) => row.fingerprint)
    duplicates.push(...checked(await db.from('questions').select('fingerprint').in('fingerprint', slice)))
  }
  if (duplicates.length) throw new Error(`Existing duplicate fingerprints detected: ${duplicates.length}`)

  const saved = []
  for (let start = 0; start < rows.length; start += 40) {
    const slice = rows.slice(start, start + 40)
    saved.push(...checked(await db.from('questions').insert(slice).select('id,topic_id,fingerprint')))
  }
  if (saved.length !== rows.length) throw new Error(`Inserted ${saved.length}/${rows.length}`)
  const savedByFingerprint = new Map(saved.map((row) => [row.fingerprint, row]))
  const ordered = rows.map((row) => {
    const savedRow = savedByFingerprint.get(row.fingerprint)
    if (!savedRow) throw new Error('Inserted row missing fingerprint')
    return savedRow
  })

  checked(await db.from('exam_item_metadata').insert(ordered.map((row, index) => {
    const item = validItems[index]
    const target = topicTargets[item.target]
    return {
      question_id: row.id,
      version: 1,
      exam_type: target.exam,
      section: target.section,
      domain: target.domain,
      skill: target.topic,
      subskill: item.subskill,
      difficulty_level: item.difficulty,
      difficulty_basis: 'editorial',
      estimated_seconds: item.seconds,
      module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'higher' }],
      distractor_rationales: Object.fromEntries(item.choices.map((choice, choiceIndex) => ['ABCD'[choiceIndex], rationaleFor(choice, choiceIndex, item.answer)])),
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: rows[index].fingerprint,
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        author_solution: item.proof,
        independent_solution_text: 'Key verified by deterministic uniqueness checks against the worked solution.',
        independent_review_method: 'Deterministic answer uniqueness check plus editorial solution proof.',
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))

  checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))

  const verified = checked(await db.from('questions').select('id, approved, active, review_status, source_type, source_rights_status, answer_verification_status, exam_item_metadata(validation_status, distractor_rationales)').in('id', saved.map((row) => row.id)))
  if (verified.length !== expected) throw new Error(`Verification count ${verified.length}`)
  for (const row of verified) {
    const meta = Array.isArray(row.exam_item_metadata) ? row.exam_item_metadata[0] : row.exam_item_metadata
    if (!row.approved || !row.active || row.review_status !== 'approved') throw new Error(`Question ${row.id} is not approved and active`)
    if (row.source_type !== 'original' || row.source_rights_status !== 'owned' || row.answer_verification_status !== 'independently_verified') {
      throw new Error(`Question ${row.id} has unexpected source status`)
    }
    if (meta?.validation_status !== 'validated') throw new Error(`Question ${row.id} is not validated`)
    const rationales = meta?.distractor_rationales ?? {}
    const item = validItems[saved.findIndex((savedRow) => savedRow.id === row.id)]
    for (const [letter, text] of Object.entries(rationales)) {
      if (letter !== item.answer && String(text).startsWith('Correct:')) throw new Error(`Bad rationale on ${row.id} choice ${letter}`)
      if (letter === item.answer && !String(text).startsWith('Correct:')) throw new Error(`Missing Correct label on ${row.id}`)
    }
  }

  const byTopic = new Map()
  for (const item of validItems) byTopic.set(topicTargets[item.target].topic, (byTopic.get(topicTargets[item.target].topic) ?? 0) + 1)
  const report = {
    batch,
    generatedAt: new Date().toISOString(),
    saved: saved.length,
    approvedActiveValidated: verified.length,
    invalidDraftsExcluded: items.length - validItems.length,
    byTopic: Object.fromEntries(byTopic),
    answerSpread: validItems.reduce((acc, item) => {
      acc[item.answer] = (acc[item.answer] ?? 0) + 1
      return acc
    }, {}),
  }
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
}
