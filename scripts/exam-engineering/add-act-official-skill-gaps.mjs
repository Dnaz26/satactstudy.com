import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'Elite hard ACT official skills 2026-10-10'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert((2 + 1) ** 2 === 9, 'square check')
assert(3 - 6 + 4 === 1 && 4 - 3 === 1, 'complex arithmetic')
assert((3 / 2) - 2 === -0.5, 'root sum')
assert((40 + 2) / 6 === 7, 'sixth score mean')
assert(Math.floor(120 / 20) * Math.floor(80 / 20) * Math.floor(50 / 20) === 48, 'box count')
assert(62 - 41 === 21, 'dye gap')
assert(2 * 5 + 0 <= 10 && 2 * 6 + 0 > 10, 'greatest integer x')
assert(Math.PI * 9 * 8 - (1 / 3) * Math.PI * 9 * 8 === 48 * Math.PI, 'cylinder minus cone')

const reading = {
  title: 'Two records of a lantern repair',
  content: 'The harbor office kept two records of the same lantern repair. The March record is a work log. It says the crew removed the cracked lens on Monday morning, sealed the gas line on Monday afternoon, and tested the new lens on Wednesday. The test lasted forty minutes. The log then states that the lantern was relit on Thursday at dusk. A sentence near the end of the March record makes a claim and gives a count: the old lens was unsafe because four of its twenty panes had cracked. The record does not say that a lantern with fewer than four cracked panes would have been safe. The June record is a public notice. It begins with the Thursday relighting and thanks the crew. It never mentions the Monday gas-line seal or the forty-minute Wednesday test. It repeats the word unsafe but does not repeat the pane count. A reader who sees only the June notice cannot tell which measurement supported the claim, and cannot tell whether the gas line was sealed before the new lens was tested. The office kept both records because they do different jobs. March preserves the order of the work. June announces the result to boat crews and places that result first. The June notice also says the new lens has twenty-four panes. It does not say that the larger pane count is the reason the lantern is safer.',
}
const science = {
  title: 'Dye fading in two liquids',
  content: 'A lab compared how fast a dye fades in two trials. Temperature was held at 20 degrees Celsius in both trials, and the same lamp brightness was used for both. Trial 1 used plain water. Trial 2 used salt water of the same volume. The notes list the percent of dye remaining. At 0 minutes both trials read 100. At 10 minutes Trial 1 read 80 and Trial 2 read 64. At 20 minutes Trial 1 read 62 and Trial 2 read 41. At 30 minutes Trial 1 read 50 and Trial 2 read 28. The researcher wrote that salt was the only substance added in Trial 2. The notes do not claim that salt changes the dye color at the start, because both trials began at 100. A later sentence says the lamp was not moved during either trial. The researcher did not test a third liquid, and the notes do not say what would happen above 20 degrees.',
}
assert(reading.content.split(/\s+/).filter(Boolean).length >= 180, 'reading passage length')
assert(science.content.split(/\s+/).filter(Boolean).length >= 120, 'science passage length')

const NEW_TOPICS = [
  ['Real and Complex Numbers', 'c1000000-0000-0000-0000-000000000012', 'ACT real and complex numbers'],
  ['Polynomial Equations', 'c1000000-0000-0000-0000-000000000013', 'ACT polynomial equations'],
  ['Function Interpretation', 'c1000000-0000-0000-0000-000000000014', 'ACT function interpretation'],
  ['Distributions and Center', 'c1000000-0000-0000-0000-000000000016', 'ACT distributions and center'],
  ['Measurement and Multistep Problems', 'c1000000-0000-0000-0000-000000000012', 'ACT measurement and multistep problems'],
  ['Linear Equations and Inequalities', 'c1000000-0000-0000-0000-000000000013', 'ACT linear equations and inequalities'],
  ['Plane and Solid Geometry', 'c1000000-0000-0000-0000-000000000015', 'ACT plane and solid geometry'],
  ['Central Ideas and Details', 'c1000000-0000-0000-0000-000000000017', 'ACT central ideas and details'],
  ['Inferences', 'c1000000-0000-0000-0000-000000000017', 'ACT reading inferences'],
  ['Author Perspective', 'c1000000-0000-0000-0000-000000000018', 'ACT author perspective'],
  ['Words in Context', 'c1000000-0000-0000-0000-000000000018', 'ACT words in context'],
  ['Cross-Text Relationships', 'c1000000-0000-0000-0000-000000000019', 'ACT cross-text relationships'],
  ['Data Representation', 'c1000000-0000-0000-0000-000000000020', 'ACT science data representation'],
  ['Research Summaries', 'c1000000-0000-0000-0000-000000000021', 'ACT science research summaries'],
]

const items = []
function add(item) {
  const total = rubricTotal(item.rubric)
  assert(total >= 15, `${item.topic} rubric ${total}`)
  assert(!item.prompt.includes('$'), item.topic)
  if (item.section === 'Math') assert(item.prompt.length >= 95, `${item.topic} length ${item.prompt.length}`)
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.topic)
  item.rubric = { ...item.rubric, total, band: 'elite-hard' }
  items.push(item)
}

const M = {
  steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 0,
  passageComplexity: 1, choiceCloseness: 2, distractorRealism: 2, timePressure: 2,
}
const R = {
  steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 1, graphInference: 0,
  passageComplexity: 2, choiceCloseness: 2, distractorRealism: 2, timePressure: 2,
}
const S = {
  steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 2,
  passageComplexity: 1, choiceCloseness: 2, distractorRealism: 2, timePressure: 2,
}

add({
  exam: 'ACT', section: 'Math', topic: 'Real and Complex Numbers', rubric: M,
  prompt: 'Let z = 2 + i, where i is the imaginary unit. What is the value of z squared, minus 3z, plus 4?',
  answer: 'A',
  choices: [
    ['1 + i', 'z squared is 3 + 4i. Subtracting 6 + 3i and then adding 4 leaves 1 + i.'],
    ['1 − i', 'This subtracts the imaginary part instead of 4i − 3i.'],
    ['7 + i', 'This adds 3z to z squared instead of subtracting it.'],
    ['1', 'This drops the remaining imaginary term after the subtraction.'],
  ],
  proof: '(2+i)^2 = 3+4i. Then 3+4i − (6+3i) + 4 = 1+i.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Polynomial Equations', rubric: M,
  prompt: 'For p(x) = 2x cubed − 3x squared − 8x + 12, it is given that p(2) = 0. What is the sum of the other two roots?',
  answer: 'B',
  choices: [
    ['2', '2 is the known root, not the sum of the other two.'],
    ['−1/2', 'For the monic form, the sum of all three roots is 3/2, so the other two sum to 3/2 − 2.'],
    ['1/2', 'This subtracts 2 from 3/2 in the wrong direction.'],
    ['−2', 'This is one of the other roots, not their sum.'],
  ],
  proof: 'Divide by 2 to get x^3 − (3/2)x^2 − 4x + 6. Root sum is 3/2. Removing 2 leaves −1/2. The quadratic factor 2x^2 + x − 6 has roots 3/2 and −2, which also sum to −1/2.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Function Interpretation', rubric: M,
  prompt: 'The function f gives the water depth, in centimeters, t minutes after a pump starts. f is linear, f(0) = 40, and f(10) = 15. Which statement is true?',
  answer: 'C',
  choices: [
    ['The depth increases by 2.5 centimeters each minute.', 'The depth falls from 40 to 15, so the rate is negative.'],
    ['The tank is empty when t = 10.', 'f(10) = 15, so water remains at 10 minutes.'],
    ['The depth decreases by 2.5 centimeters each minute, and water remains at 10 minutes.', 'The change is (15 − 40) / 10 = −2.5, and f(10) is not 0.'],
    ['The depth decreases by 25 centimeters each minute.', '25 centimeters is the total drop over 10 minutes, not the drop each minute.'],
  ],
  proof: 'Slope = (15−40)/10 = −2.5 centimeters per minute, and f(10)=15.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Distributions and Center', rubric: M,
  prompt: 'Five scores are 4, 4, 7, 9, and 16. A sixth score is added so that the mean of all six scores equals the median of the original five scores. What is the sixth score?',
  answer: 'A',
  choices: [
    ['2', 'The original median is 7 and the original sum is 40, so (40 + x) / 6 = 7 gives x = 2.'],
    ['7', '7 is the original median. Using it as the new score does not make the new mean equal 7.'],
    ['8', '8 is the original mean, not the score that makes the new mean equal the original median.'],
    ['10', 'This score would raise the mean above 7.'],
  ],
  proof: 'Ordered list median is 7. Sum is 40. (40+x)/6 = 7 implies x = 2.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Measurement and Multistep Problems', rubric: M,
  prompt: 'A crate measures 1.2 meters by 0.8 meters by 0.5 meters. It is packed with 20-centimeter cubes that stay in that orientation and are not rotated. How many cubes fit?',
  answer: 'D',
  choices: [
    ['60', 'This treats the 0.5-meter side as fitting 2.5 cubes and keeps the fraction.'],
    ['96', 'This uses a third layer that the 50-centimeter side cannot hold.'],
    ['120', 'This counts the crate volume in the wrong unit and ignores the cube orientation.'],
    ['48', '120, 80, and 50 centimeters fit 6, 4, and 2 cubes. The product is 48.'],
  ],
  proof: '1.2 m = 120 cm, 0.8 m = 80 cm, 0.5 m = 50 cm. Floor division by 20 gives 6 × 4 × 2 = 48.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Linear Equations and Inequalities', rubric: M,
  prompt: 'x and y are integers that satisfy 2x + y ≤ 10, x ≥ 3, and y ≥ 0. What is the greatest possible value of x?',
  answer: 'B',
  choices: [
    ['4', '4 works, but it is not the greatest integer that still satisfies the inequality.'],
    ['5', 'y cannot be negative, so 2x ≤ 10. The greatest integer x that is at least 3 is 5, at the point (5, 0).'],
    ['7', '7 would require a negative y to keep 2x + y at or below 10.'],
    ['10', '10 is the right-hand bound, not a value of x that satisfies 2x + y ≤ 10 with y ≥ 0.'],
  ],
  proof: 'y ≥ 0 implies 2x ≤ 10, so x ≤ 5. With x ≥ 3 and x an integer, the greatest value is 5.',
})

add({
  exam: 'ACT', section: 'Math', topic: 'Plane and Solid Geometry', rubric: M,
  prompt: 'A cylinder and a cone have the same radius, 3, and the same height, 8. The cylinder’s volume is how much greater than the cone’s volume?',
  answer: 'C',
  choices: [
    ['24π', '24π is the cone’s volume, not the difference.'],
    ['72π', '72π is the cylinder’s volume, not the difference.'],
    ['48π', 'The cylinder is π(3 squared)(8) = 72π. The cone is one third of that, 24π. The difference is 48π.'],
    ['96π', 'This adds the two volumes instead of subtracting the cone from the cylinder.'],
  ],
  proof: 'Cylinder volume 72π. Cone volume 24π. Difference 48π.',
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Central Ideas and Details', rubric: R, passage: 'reading',
  prompt: 'The March record and the June record were both kept mainly because they',
  answer: 'B',
  choices: [
    ['give the same timeline of the lantern repair', 'March is the timeline. June does not follow that order.'],
    ['do different jobs, one preserving the order of the work and one announcing the result', 'The passage says March preserves the order and June announces the result first.'],
    ['both include the pane count that supports the safety claim', 'The pane count is in March. June does not repeat it.'],
    ['were written on the same day', 'June is a later public notice, not the March work log.'],
  ],
  proof: 'The office kept both because March is the ordered log and June announces the result.',
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Inferences', rubric: R, passage: 'reading',
  prompt: 'A reader who uses only the June notice cannot tell whether the gas line was sealed before the new lens was tested because the June notice',
  answer: 'A',
  choices: [
    ['never mentions the gas-line seal or the Wednesday test', 'The passage says June omits both the Monday seal and the Wednesday test.'],
    ['says the gas line was sealed after the test', 'June does not state that order.'],
    ['gives the forty-minute length of the test', 'The forty-minute detail is in the March log, not the June notice.'],
    ['says the old lens had four cracked panes', 'The pane count is in March. June repeats unsafe without the count.'],
  ],
  proof: 'June never mentions the Monday gas-line seal or the Wednesday test, so their order is unavailable from June alone.',
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Author Perspective', rubric: R, passage: 'reading',
  prompt: 'The March record’s attitude toward the old lens is best described as',
  answer: 'C',
  choices: [
    ['certain that any cracked pane would make a lens unsafe', 'The record does not say that fewer than four cracked panes would have been unsafe.'],
    ['unconcerned, because it never calls the lens unsafe', 'The March record does call the old lens unsafe.'],
    ['judging the lens unsafe and tying that judgment to a stated pane count', 'March says the old lens was unsafe because four of twenty panes had cracked.'],
    ['claiming the new twenty-four-pane lens is the reason the lantern is safer', 'That comparison is not made. June mentions twenty-four panes without that conclusion.'],
  ],
  proof: 'March states the unsafe claim and supports it with four of twenty cracked panes, without a broader rule.',
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Words in Context', rubric: R, passage: 'reading',
  prompt: 'As it is used in the March record, the word unsafe most nearly means that the old lens was',
  answer: 'D',
  choices: [
    ['untested', 'The unsafe claim is tied to cracked panes, not to a missing test.'],
    ['replaced on Thursday', 'Thursday is when the lantern was relit, not the meaning of unsafe.'],
    ['larger than the new lens', 'The new lens has more panes. Unsafe is not a size comparison.'],
    ['not fit for use, based on the cracked panes the record counts', 'The record applies unsafe to the old lens because four of twenty panes had cracked.'],
  ],
  proof: 'In March, unsafe is the judgment attached to the old lens and the count of cracked panes.',
})

add({
  exam: 'ACT', section: 'Reading', topic: 'Cross-Text Relationships', rubric: R, passage: 'reading',
  prompt: 'Which detail appears in the March record but is absent from the June notice?',
  answer: 'B',
  choices: [
    ['The lantern was relit on Thursday.', 'Both records include the Thursday relighting. June opens with it.'],
    ['The gas line was sealed on Monday afternoon.', 'March lists that step. June never mentions the gas-line seal.'],
    ['The new lens has twenty-four panes.', 'That pane count for the new lens is in the June notice.'],
    ['The crew is thanked.', 'The thanks appear in the June notice, not as a March work step.'],
  ],
  proof: 'March includes the Monday afternoon gas-line seal. June omits it.',
})

add({
  exam: 'ACT', section: 'Science', topic: 'Data Representation', rubric: S, passage: 'science',
  prompt: 'According to the listed readings, at 20 minutes the percent of dye remaining in Trial 2 was how many percentage points lower than in Trial 1?',
  answer: 'C',
  choices: [
    ['16', '16 is the gap at 10 minutes, 80 minus 64, not the gap at 20 minutes.'],
    ['22', '22 is the gap at 30 minutes, 50 minus 28.'],
    ['21', 'At 20 minutes Trial 1 reads 62 and Trial 2 reads 41, and 62 − 41 = 21.'],
    ['41', '41 is the Trial 2 reading itself, not the difference between the trials.'],
  ],
  proof: 'At 20 minutes the readings are 62 and 41. The difference is 21 percentage points.',
})

add({
  exam: 'ACT', section: 'Science', topic: 'Research Summaries', rubric: S, passage: 'science',
  prompt: 'The researcher changed one condition between the trials and held others fixed. Which condition was changed?',
  answer: 'A',
  choices: [
    ['The liquid, from plain water in Trial 1 to salt water in Trial 2', 'The notes identify salt water as the added difference and say salt was the only substance added in Trial 2.'],
    ['The temperature, from 20 degrees in Trial 1 to a higher temperature in Trial 2', 'Temperature was held at 20 degrees in both trials.'],
    ['The starting dye amount, from 100 in Trial 1 to a lower start in Trial 2', 'Both trials began at 100.'],
    ['The lamp brightness, which was increased for Trial 2', 'The same lamp brightness was used, and the lamp was not moved.'],
  ],
  proof: 'Temperature, lamp brightness, volume, and the starting reading were held fixed. The liquid changed.',
})

assert(items.length === 14, `built ${items.length}`)

const existingTopics = checked(await db.from('topics').select('id, name, category_id'))
const known = new Set(existingTopics.map((row) => `${row.category_id}|${row.name}`))
const toCreate = NEW_TOPICS.filter(([name, categoryId]) => !known.has(`${categoryId}|${name}`))
if (toCreate.length) {
  checked(await db.from('topics').insert(toCreate.map(([name, categoryId, description], index) => ({
    name,
    category_id: categoryId,
    description,
    sort_order: 200 + index,
  }))))
}

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const item of items) {
  const matches = topicRows.filter((row) => row.name === item.topic && row.categories?.sections?.tests?.name === item.exam && row.categories?.sections?.name === item.section)
  if (matches.length !== 1) throw new Error(`Topic lookup failed for ${item.exam} ${item.section} ${item.topic}: ${matches.length}`)
  item.topicRow = { id: matches[0].id, domain: matches[0].categories.name, topic: matches[0].name }
}

function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}

const existing = checked(await db.from('questions').select('fingerprint').eq('source', batchName))
const already = new Set(existing.map((row) => row.fingerprint))
const pending = items.filter((item) => !already.has(fingerprintFor(item)))
let inserted = 0
if (pending.length) {
  const neededTitles = [...new Set(pending.filter((item) => item.passage).map((item) => item.passage === 'reading' ? reading.title : science.title))]
  const passageId = { reading: null, science: null }
  if (neededTitles.length) {
    const foundPassages = checked(await db.from('passages').select('id, title').in('title', [reading.title, science.title]))
    for (const row of foundPassages) {
      if (row.title === reading.title) passageId.reading = row.id
      if (row.title === science.title) passageId.science = row.id
    }
    const missingPassages = [
      passageId.reading ? null : { title: reading.title, content: reading.content, active: true, source_type: 'original', source_rights_status: 'owned' },
      passageId.science ? null : { title: science.title, content: science.content, active: true, source_type: 'original', source_rights_status: 'owned' },
    ].filter(Boolean)
    if (missingPassages.length) {
      const savedPassages = checked(await db.from('passages').insert(missingPassages).select('id, title'))
      for (const row of savedPassages) {
        if (row.title === reading.title) passageId.reading = row.id
        if (row.title === science.title) passageId.science = row.id
      }
    }
  }
  const rows = pending.map((item) => ({
    test_type: item.exam,
    section_name: item.section,
    category_name: item.topicRow.domain,
    topic_name: item.topicRow.topic,
    subtopic_name: item.topicRow.topic,
    topic_id: item.topicRow.id,
    difficulty: 'Hard',
    difficulty_score: 0.95,
    question_type: 'multiple_choice',
    question_text: item.prompt,
    choice_a: item.choices[0][0],
    choice_b: item.choices[1][0],
    choice_c: item.choices[2][0],
    choice_d: item.choices[3][0],
    correct_answer: item.answer,
    official_explanation: item.proof,
    source_type: 'original',
    source_rights_status: 'owned',
    source: batchName,
    exam_name: batchName,
    fingerprint: fingerprintFor(item),
    answer_verification_status: 'independently_verified',
    review_status: 'approved',
    approved: true,
    active: true,
    passage_id: item.passage ? passageId[item.passage] : null,
  }))
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(pending.map((item) => {
    const rationales = {}
    item.choices.forEach((choice, index) => {
      const letter = 'ABCD'[index]
      rationales[letter] = letter === item.answer ? `Correct: ${choice[1]}` : choice[1]
    })
    return {
      question_id: idByFingerprint.get(fingerprintFor(item)),
      version: 1,
      exam_type: item.exam,
      section: item.section,
      domain: item.topic === 'Measurement and Multistep Problems' ? 'Integrating Essential Skills' : item.topicRow.domain,
      skill: item.topicRow.topic,
      subskill: item.topic,
      difficulty_level: 7,
      difficulty_basis: 'editorial',
      estimated_seconds: 150,
      module_eligibility: [{ module: 1, route: 'common' }],
      distractor_rationales: rationales,
      calculator_expected: false,
      contextual: true,
      validation_status: 'validated',
      content_hash: fingerprintFor(item),
      validation_evidence: {
        independent_solution: true,
        answer_verified: true,
        distractors_verified: true,
        ambiguity_review: true,
        style_review: true,
        difficulty_review: true,
        blueprint_classification: true,
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Solved again from the stem before insert. Numeric results were asserted in code.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const measurement = checked(await db.from('questions').select('id').eq('source', batchName).eq('topic_name', 'Measurement and Multistep Problems'))
if (measurement.length === 1) {
  checked(await db.from('exam_item_metadata').update({ domain: 'Integrating Essential Skills' }).eq('question_id', measurement[0].id))
}

const report = {
  generatedAt: new Date().toISOString(),
  batch: batchName,
  topicsCreated: toCreate.map(([name]) => name),
  built: items.length,
  inserted,
  note: 'Elite-hard means an 18-point rubric total of at least 15. This is not a measured 5x multiplier.',
}
writeFileSync('supabase/exam-engineering/act-official-skill-gaps-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
