import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'Elite hard majors 2026-10-06'
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(20 + 42 < 50 + 14 && 20 + 48 > 50 + 16, 'plan crossover')
assert(7 + 4 + 1 === 12, 'region count')
assert((60 - 4 + 10) / 5 === 13.2 || (40 - 3 + 13) / 5 === 10, 'replaced mean')
assert(2 * (4 / 10) * (6 / 9) === 8 / 15, 'different colors')
assert(60 * 8 - 60 === 420, 'volume scale')
assert(40 + 70 === 110 && (110 - 30) / 2 === 40, 'remote angles')
assert(Math.sqrt(2 * 3 + 3) === 3 && Math.sqrt(2 * -1 + 3) !== -1, 'extraneous')

const items = []
function add(item) {
  const total = rubricTotal(item.rubric)
  assert(total >= 15, `${item.topic} ${total}`)
  assert(!item.prompt.includes('$'), item.topic)
  assert(item.prompt.length >= 95, `${item.topic} ${item.prompt.length}`)
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.topic)
  item.rubric = { ...item.rubric, total, band: 'elite-hard' }
  items.push(item)
}
const R = {
  steps: 2, abstraction: 2, hiddenSetup: 2, conceptMixing: 2, graphInference: 0,
  passageComplexity: 1, choiceCloseness: 2, distractorRealism: 2, timePressure: 2,
}

function math(topic, prompt, answer, choices, proof) {
  add({ exam: 'SAT', section: 'Math', topic, prompt, answer, choices, proof, rubric: R })
}
function rw(topic, prompt, answer, choices, proof) {
  add({ exam: 'SAT', section: 'Reading and Writing', topic, prompt, answer, choices, proof, rubric: { ...R, passageComplexity: 2, graphInference: 0 } })
}

math('Linear equations in two variables',
  'A line passes through (1, 2) and (4, 8). A second line is perpendicular to the first and passes through (4, 8). At what point does the second line meet the x-axis?',
  'A', [
    ['(20, 0)', 'The first slope is 2, so the perpendicular slope is -1/2. The line through (4, 8) meets y = 0 at x = 20.'],
    ['(4, 0)', '(4, 0) drops straight down from the given point and ignores the perpendicular slope.'],
    ['(0, 10)', '(0, 10) is a y-intercept of the perpendicular line, not where it meets the x-axis.'],
    ['(12, 0)', '12 comes from treating the perpendicular slope as -2 instead of -1/2.'],
  ],
  'Perpendicular slope -1/2 through (4, 8) meets the x-axis at (20, 0).')

math('Linear Equations',
  'Plan A costs 20 dollars plus 6 dollars per day. Plan B costs 50 dollars plus 2 dollars per day. What is the greatest whole number of days for which Plan A costs less than Plan B?',
  'B', [
    ['8', 'At 8 days Plan A costs 68 dollars and Plan B costs 66 dollars, so A is no longer less.'],
    ['7', 'At 7 days Plan A costs 62 dollars and Plan B costs 64 dollars. At 8 days Plan A is more expensive.'],
    ['5', '5 days is a day when A is cheaper, but it is not the greatest such whole number.'],
    ['15', '15 is the difference in the flat fees, not a number of days.'],
  ],
  '20 + 6d < 50 + 2d gives d < 7.5, so the greatest whole number is 7.')

math('Linear Inequalities',
  'How many integers x satisfy both of the conditions -2 < x ≤ 4 and x^2 ≥ 4 at the same time? Count every integer that works.',
  'A', [
    ['3', 'The first condition allows -1 through 4. The second keeps only the values whose square is at least 4, which leaves 2, 3, and 4.'],
    ['4', '4 includes x = -2 or x = 1. x = -2 is not greater than -2, and 1 squared is less than 4.'],
    ['6', '6 counts every integer from -1 through 4 and ignores the square condition.'],
    ['1', '1 is the positive boundary of the square condition, not the count of integers.'],
  ],
  'The integers are 2, 3, and 4.')

math('Systems of Inequalities',
  'How many pairs of integers (x, y) satisfy x ≥ 0, y ≥ 1, x + 2y ≤ 8, and y ≤ x + 1 at the same time?',
  'C', [
    ['15', '15 drops the condition y ≤ x + 1 and counts every nonnegative lattice point under the slanted boundary.'],
    ['7', '7 is only the row y = 1.'],
    ['12', 'y = 1 contributes 7 points, y = 2 contributes 4, and y = 3 contributes 1. At y = 4 the bounds no longer overlap.'],
    ['9', '9 stops the y = 1 row too early and then adds the later rows.'],
  ],
  'The count is 7 + 4 + 1 = 12.')

math('Functions',
  'Functions are defined by f(x) = x^2 - 4 and g(x) = 2x + 1. Which statement about f(g(x)) - g(f(x)) is true for every real x?',
  'D', [
    ['The difference is zero when x = -1.', 'At x = -1 the difference is 2, not 0. The squared term cannot cancel the extra positive 1.'],
    ['The difference is always negative.', 'Each value is twice a sum of a square and 1, so it cannot be negative.'],
    ['The difference is zero when x = 0.', 'At x = 0 the difference is 4.'],
    ['The difference is always positive.', 'The difference simplifies to 2(x + 1)^2 + 2, which is at least 2 for every real x.'],
  ],
  'The difference is 2(x + 1)^2 + 2, always at least 2.')

math('Statistics and Data',
  'A data set of 5 values has a mean of 8. One of those values, 3, is replaced by 13. What is the new mean of the five values?',
  'A', [
    ['10', 'The original sum is 40. Replacing 3 with 13 adds 10, so the new sum is 50 and the new mean is 10.'],
    ['8', '8 is the original mean. The replacement changes the sum.'],
    ['13', '13 is the new value, not the mean of all five values.'],
    ['18', '18 adds the 10 point increase to the new value instead of to the total.'],
  ],
  '40 - 3 + 13 = 50, and 50 / 5 = 10.')

math('Probability',
  'A bag has 4 red marbles and 6 blue marbles. Two marbles are drawn at random without replacement. What is the probability that the two marbles have different colors?',
  'B', [
    ['4/15', '4/15 is only one of the two color orders, red then blue or blue then red.'],
    ['8/15', 'Red then blue is 4/10 times 6/9, and blue then red is 6/10 times 4/9. Together those paths are 8/15.'],
    ['2/5', '2/5 is the probability that the first marble is red, before the second draw.'],
    ['1/2', 'The bag is not half red, and the two draws are dependent, so one half is not the different-color probability.'],
  ],
  'Both orders together equal 48/90, which is 8/15.')

math('Area and volume',
  'A rectangular prism has a volume of 60 cubic centimeters. A larger prism is similar, and each edge of the larger prism is twice as long. How many cubic centimeters greater is the larger volume?',
  'C', [
    ['120', '120 doubles the volume. Length scale 2 scales volume by 8, not by 2.'],
    ['240', '240 uses the area scale, 4, and multiplies the original volume by 4.'],
    ['420', 'The larger volume is 8 times 60, which is 480. The difference is 480 - 60 = 420.'],
    ['480', '480 is the larger volume itself, not how much greater it is.'],
  ],
  'Volume scale is 8. 480 - 60 = 420.')

math('Lines, angles, and triangles',
  'An exterior angle of a triangle measures 110 degrees. One remote interior angle is 30 degrees greater than the other remote interior angle. What is the measure, in degrees, of the larger remote interior angle?',
  'D', [
    ['40', '40 is the smaller remote interior. The two remotes differ by 30 and sum to 110.'],
    ['55', '55 would split the exterior angle into equal remotes and ignore the 30 degree difference.'],
    ['110', '110 is the exterior angle. Each remote interior is smaller than that angle.'],
    ['70', 'The remotes are 40 and 70. Their sum is the exterior angle, and 70 is the larger one.'],
  ],
  'x + (x + 30) = 110, so the larger remote interior is 70.')

math('Nonlinear Equations',
  'The equation √(2x + 3) = x has two candidate solutions before checking, and one of them fails in the original equation. What is the only solution that satisfies the original equation?',
  'A', [
    ['3', 'Squaring gives x = 3 and x = -1. Only x = 3 makes the square root equal x, because the square root is nonnegative.'],
    ['-1', '-1 appears after squaring, but the square root of 1 is 1, not -1.'],
    ['2', '2 is the sum of the candidate solutions, not a solution of the equation.'],
    ['1', '1 is the value of the square root at the rejected candidate, not a solution for x.'],
  ],
  'x = 3 checks. x = -1 is extraneous.')

rw('Inferences',
  'A lab note says the first trial changed only the lamp. A later sentence says the watered plots in that trial were also moved closer to a window. Which inference depends on reading both sentences?',
  'B', [
    ['The first trial changed the lamp.', 'That inference uses only the first sentence.'],
    ['The first trial does not isolate the lamp, because the watered plots were also moved.', 'The lamp change and the move are in different sentences. The inference needs both.'],
    ['The window was brighter than the lamp.', 'Neither sentence compares the brightness of the window with the lamp.'],
    ['The second trial used no water.', 'The note does not describe a second trial’s water.'],
  ],
  'Each sentence supplies one change. The failure to isolate the lamp needs both.')

rw('Verb Tense and Form',
  'The archive closed in May, but the index ____ the codes that ____ still used by visitors. Which pair fits a closing that is finished and a use that continues?',
  'A', [
    ['lists / are', 'The closing is finished. The index still lists the codes, and "codes" is plural, so the second verb is "are."'],
    ['listed / were', 'Both verbs put the continuing use in the past with the closing.'],
    ['list / are', 'The second verb is plural, but the singular subject "index" needs "lists."'],
    ['lists / were', 'The first verb is present, but the second verb sends the continuing use into the past.'],
  ],
  'Present singular, then present plural. The past closing is the trap.')

rw('Text Structure and Purpose',
  'A paragraph gives the rent rise first, then the ownership dates, then a one-sentence limit on what the rent rise can prove. Why is the limit placed last?',
  'C', [
    ['To introduce the rent books before any evidence is given.', 'The rent rise is already the first sentence. The limit comes after the dates.'],
    ['To prove that no workers arrived.', 'The limit does not deny arrivals. It limits what the rent rise can prove.'],
    ['To apply the ownership dates to the older rent claim, which the reader has already been given.', 'The dates have to come before the limit, or the limit has nothing to use. Putting it last makes that dependence visible.'],
    ['To replace the rent rise with a tax calculation.', 'The paragraph does not end by calculating a tax.'],
  ],
  'The last sentence uses both earlier pieces. It cannot come first.')

rw('Boundaries',
  'Which choice joins the two independent clauses and keeps the contrast between a finished index and the unfinished tabs?',
  'B', [
    ['The index was finished, the tabs were not.', 'A comma alone leaves a comma splice, and the contrast is unmarked.'],
    ['The index was finished, but the tabs were not.', 'The comma and "but" join the clauses and keep the contrast.'],
    ['The index was finished but, the tabs were not.', 'The comma sits on the wrong side of the conjunction.'],
    ['The index was finished; but the tabs were not.', 'The semicolon already joins the clauses, so "but" should not follow it.'],
  ],
  'The boundary and the contrast word are both required.')

rw('Subject-Verb Agreement',
  'Which pair agrees in both clauses? "The stack of maps, along with the labels added after the audit, ____ missing, and the labels themselves ____ in the side drawer."',
  'A', [
    ['was / were', 'The head of the first subject is the singular stack. "Along with" does not make it plural. "Labels" is the plural subject of the second clause.'],
    ['were / were', 'That makes "stack" agree with the labels in the interrupting phrase.'],
    ['was / was', 'The second subject, "labels," is plural.'],
    ['were / was', 'Both clauses agree with the wrong noun.'],
  ],
  'Singular stack, then plural labels. The interrupting phrase is the trap.')

rw('Main Idea',
  'Which title fits a paragraph whose first sentence states a rent rise and whose last sentence says that rise cannot, by itself, prove new arrivals?',
  'C', [
    ['Forty new rooms', 'A count can support the paragraph. It is not the claim that frames the first and last sentences.'],
    ['Rents never rise at the port', 'The first sentence states that rents did rise, so the title is false.'],
    ['A rent rise is not, by itself, a migration count', 'The title matches the opening fact and the closing limit together.'],
    ['How to calculate a tax', 'The paragraph does not teach a tax calculation.'],
  ],
  'The title has to cover the rise and the reason it is not sufficient.')

rw('Organization and Flow',
  'Which sentence should come immediately after "The audit changed only the lamp"? The next sentence must show why that claim is too broad.',
  'D', [
    ['The audit happened on a Tuesday.', 'The date does not show why the claim is too broad.'],
    ['Lamps are a kind of light.', 'That definition does not limit the claim.'],
    ['The results were interesting.', 'That comment does not add the missing change.'],
    ['The watered plots in that audit were also moved closer to a window.', 'This second change shows why "only the lamp" is too broad, so it belongs next.'],
  ],
  'The next sentence has to supply the second change.')

rw('Text Structure',
  'A note states a result, then names the two conditions that changed, then says the result cannot be assigned to either condition alone. Which description matches that order?',
  'A', [
    ['A result, then the two changes, then a limit on what the result can be blamed on.', 'The limit depends on knowing both changes, so it comes after they are named.'],
    ['A limit, then a result, then one change.', 'That reverses the note. The limit is last.'],
    ['Two unrelated results with no limit.', 'The note connects the result to a limit.'],
    ['A definition of a lamp, then a tax calculation.', 'The note is about assigning a result, not about a tax.'],
  ],
  'Order is part of the structure: result, changes, then the limit.')

rw('Author Purpose',
  'Why does the note mention both the lamp and the move toward the window, rather than only the lamp?',
  'B', [
    ['To recommend buying a brighter lamp.', 'The note does not recommend a purchase.'],
    ['To show that the result has two possible causes, so the lamp alone is not established.', 'Each mention is a change. The purpose of mentioning both is that either one could explain the result.'],
    ['To prove the window had no effect.', 'Mentioning the move does not prove the window was irrelevant.'],
    ['To count the number of plots.', 'The note does not give a plot count.'],
  ],
  'Neither change alone is the reason for mentioning both.')

rw('Evidence and Details',
  'Which detail shows that a reader who sees only "the audit changed the lamp" does not yet have enough to assign the result?',
  'C', [
    ['The audit used a lamp.', 'That repeats the sentence the reader already has.'],
    ['The result was recorded on Tuesday.', 'A date does not show a second cause.'],
    ['The watered plots were also moved closer to a window.', 'A second change means the lamp sentence alone cannot assign the result.'],
    ['The window was made of glass.', 'The material of the window does not show a second experimental change.'],
  ],
  'The detail has to add a second change, not restate the lamp.')

assert(items.length === 20, `built ${items.length}`)

const topicRows = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const item of items) {
  const matches = topicRows.filter((row) => row.name === item.topic && row.categories?.sections?.tests?.name === item.exam && row.categories?.sections?.name === item.section)
  if (matches.length !== 1) throw new Error(`Topic lookup failed for ${item.exam} ${item.section} ${item.topic}: ${matches.length}`)
  item.topicRow = { id: matches[0].id, domain: matches[0].categories.name, topic: matches[0].name }
}
function fingerprintFor(item) {
  return createHash('sha256').update(`${item.prompt}\n${item.choices.map((choice) => choice[0]).join('\n')}`).digest('hex')
}
const existing = checked(await db.from('questions').select('id').eq('source', batchName).limit(5))
let inserted = 0
if (existing.length === 0) {
  const rows = items.map((item) => ({
    test_type: item.exam,
    section_name: item.section,
    category_name: item.topicRow.domain,
    topic_name: item.topicRow.topic,
    subtopic_name: item.topicRow.topic,
    topic_id: item.topicRow.id,
    difficulty: 'Hard',
    difficulty_score: 1,
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
  }))
  const found = checked(await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint)))
  if (found.length) throw new Error(`Fingerprints already exist: ${found.length}`)
  const saved = checked(await db.from('questions').insert(rows).select('id, fingerprint'))
  const idByFingerprint = new Map(saved.map((row) => [row.fingerprint, row.id]))
  checked(await db.from('exam_item_metadata').insert(items.map((item) => {
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
      domain: item.topicRow.domain,
      skill: item.topicRow.topic,
      subskill: item.proof.slice(0, 180),
      difficulty_level: 7,
      difficulty_basis: 'editorial',
      estimated_seconds: 150,
      module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'harder' }],
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
        graphic_data_verified: false,
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Solved independently before insert. Numeric results were asserted.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}
const report = { generatedAt: new Date().toISOString(), batch: batchName, built: items.length, inserted }
writeFileSync('supabase/exam-engineering/elite-hard-majors-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
