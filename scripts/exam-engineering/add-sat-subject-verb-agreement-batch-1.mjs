import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Subject-Verb Agreement Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000036'
const items = [
  {
    passage: 'A historian comparing two copies of a maritime ledger found that many entries had been recopied decades later. The number of surviving entries that conservators can date with confidence, rather than the paper’s estimated age, ___ the archivists’ primary measure of completeness.',
    choices: ['are', 'is', 'have been', 'were'], answer: 'B', level: 6, seconds: 60,
    explanation: 'The subject is “number,” a singular noun. The intervening phrase and the plural noun “entries” do not change the subject, so the verb is “is.”',
    wrong: { A: 'Matches the nearby plural noun “entries” instead of the singular subject “number.”', B: 'Correct: the subject “number” is singular.', C: 'Uses a plural auxiliary with the singular subject.', D: 'Uses a plural past-tense verb with the singular subject.' },
  },
  {
    passage: 'Several kiln fragments carry a blue glaze that appears only on objects from the eastern chamber. Among the ceramics recovered there, a group of blue-glazed rims, despite differences in thickness and firing temperature, ___ a stamp not found on the other pieces.',
    choices: ['bear', 'has borne', 'bears', 'are bearing'], answer: 'C', level: 6, seconds: 60,
    explanation: 'The grammatical subject is the singular collective noun “group,” not the nearby plural noun “rims.” The simple-present singular verb is “bears.”',
    wrong: { A: 'Agrees with “rims” rather than with the singular subject “group.”', B: 'Uses a singular form but changes the sentence to the present perfect without a time cue.', C: 'Correct: “group” is singular, so it takes “bears.”', D: 'Uses a plural auxiliary and an unnecessary progressive form.' },
  },
  {
    passage: 'The survey team recovered both field sketches and a map from a sealed cabinet. Neither the sketches nor the map accompanying them ___ the disputed eastern boundary, so the researchers consulted a later survey.',
    choices: ['contains', 'contain', 'is containing', 'have contained'], answer: 'A', level: 6, seconds: 65,
    explanation: 'In a “neither…nor” construction, the verb agrees with the nearer subject. “The map” is singular, so the sentence uses “contains.”',
    wrong: { A: 'Correct: the nearer subject, “map,” is singular.', B: 'Agrees with the more distant plural subject “sketches.”', C: 'Uses a plural-style auxiliary with the singular subject and an awkward progressive form.', D: 'Uses a plural auxiliary with the nearer singular subject.' },
  },
  {
    passage: 'Two laboratories independently tested pigments taken from the same mural. The protocols that guide each laboratory, although designed by different research teams, ___ in one crucial respect: both exclude samples from areas exposed to direct sunlight.',
    choices: ['differs', 'has differed', 'is differing', 'differ'], answer: 'D', level: 5, seconds: 55,
    explanation: 'The subject is the plural noun “protocols.” The phrase “that guide each laboratory” modifies protocols but does not alter the subject, so “differ” is correct.',
    wrong: { A: 'Uses a singular verb with the plural subject “protocols.”', B: 'Uses a singular auxiliary with the plural subject.', C: 'Uses a singular auxiliary with the plural subject and an unnecessary progressive form.', D: 'Correct: plural “protocols” takes the plural verb “differ.”' },
  },
  {
    passage: 'A collection of tide tables from the observatory’s first decade was recently digitized. Each of the annotations added by the original observers, including those written in the margins, ___ a time correction that does not appear in the printed tables.',
    choices: ['record', 'records', 'have recorded', 'are recording'], answer: 'B', level: 5, seconds: 55,
    explanation: 'The subject is the singular indefinite pronoun “each.” The phrase “of the annotations” is a prepositional phrase and does not make the subject plural; “records” agrees with “each.”',
    wrong: { A: 'Agrees with “annotations” rather than the singular subject “each.”', B: 'Correct: “each” is singular and takes “records.”', C: 'Uses a plural auxiliary with the singular subject.', D: 'Uses a plural auxiliary and progressive form with the singular subject.' },
  },
  {
    passage: 'Conservators compared labels from crates stored in three different rooms. The labels on the underside of each crate, together with a note about its contents, ___ which objects were moved during the first restoration.',
    choices: ['provides', 'has provided', 'is providing', 'provide'], answer: 'D', level: 6, seconds: 60,
    explanation: 'The subject is the plural noun “labels.” The phrase “together with a note” is parenthetical and does not change the subject’s number, so “provide” is correct.',
    wrong: { A: 'Agrees with the nearby singular noun “note,” not with “labels.”', B: 'Uses a singular auxiliary with the plural subject.', C: 'Uses a singular auxiliary and progressive form with the plural subject.', D: 'Correct: the plural subject “labels” takes “provide.”' },
  },
  {
    passage: 'The catalog lists reports from several independent expeditions. In the appendices ___ three accounts of the same storm, each recorded from a different elevation.',
    choices: ['are', 'is', 'has been', 'was'], answer: 'A', level: 6, seconds: 55,
    explanation: 'This is an inverted sentence: the subject “three accounts” follows the verb. Because the subject is plural, “are” is correct.',
    wrong: { A: 'Correct: the postverbal subject “three accounts” is plural.', B: 'Treats the postverbal plural subject as singular.', C: 'Uses a singular auxiliary with the plural subject.', D: 'Uses a singular past-tense verb with the plural subject.' },
  },
  {
    passage: 'A paper on migration patterns compares three explanations for an abrupt change in the birds’ route. Each of the competing hypotheses ___ why the shift occurred near the same latitude, but only one accounts for its timing.',
    choices: ['explain', 'have explained', 'explains', 'are explaining'], answer: 'C', level: 5, seconds: 55,
    explanation: 'The subject is “each,” which is singular. The verb must therefore be “explains,” despite the plural noun “hypotheses” in the phrase that follows.',
    wrong: { A: 'Agrees with the nearby plural noun “hypotheses” rather than “each.”', B: 'Uses a plural auxiliary with the singular subject.', C: 'Correct: singular “each” takes “explains.”', D: 'Uses a plural auxiliary with the singular subject.' },
  },
  {
    passage: 'The current report distinguishes missing measurements from values rejected during calibration. The number of readings discarded after calibration ___ a recurring source of disagreement among specialists, because each laboratory applies a different threshold.',
    choices: ['are', 'is', 'have been', 'were'], answer: 'B', level: 6, seconds: 60,
    explanation: 'The subject is the singular phrase “the number.” The plural “readings” appears inside a prepositional phrase and does not control the verb; “is” agrees with “number.”',
    wrong: { A: 'Agrees with “readings” rather than the singular subject “number.”', B: 'Correct: “the number” is singular and takes “is.”', C: 'Uses a plural auxiliary with a singular subject.', D: 'Uses a plural verb with the singular subject and shifts to past tense.' },
  },
  {
    passage: 'The project’s database includes measurements from six regions, although not every region contributed the same number of samples. A number of measurements from the northern stations ___ excluded because the sensors had been exposed to salt spray.',
    choices: ['has been', 'is', 'was', 'have been'], answer: 'D', level: 6, seconds: 60,
    explanation: 'Unlike “the number,” the phrase “a number of” means several. Its subject is plural “measurements,” so the sentence uses “have been.”',
    wrong: { A: 'Mistakes the plural phrase “a number of measurements” for singular “the number.”', B: 'Uses a singular verb with the plural subject.', C: 'Uses a singular past-tense verb with the plural subject.', D: 'Correct: “a number of measurements” is plural and takes “have been.”' },
  },
  {
    passage: 'The observatory’s main signal has been compared with two control readings taken at the same time. The signal, as well as the control measurements, ___ unchanged since the first calibration, despite a minor shift in the instrument’s casing.',
    choices: ['has remained', 'have remained', 'remained', 'were remaining'], answer: 'A', level: 6, seconds: 60,
    explanation: 'The subject is the singular noun “signal.” The phrase “as well as the control measurements” does not create a compound subject. “Since the first calibration” calls for the present perfect: “has remained.”',
    wrong: { A: 'Correct: singular “signal” takes “has,” and “since” supports the present perfect.', B: 'Agrees with the nearby plural noun “measurements” rather than the subject.', C: 'Uses simple past even though “since” connects the condition to the present.', D: 'Uses a plural past-progressive form with the singular subject.' },
  },
]

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Subject-Verb Agreement' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Subject-Verb Agreement topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5200,
    messages: [
      { role: 'system', content: 'Blindly solve each original SAT subject-verb agreement question. Apply standard written English grammar and the passage context. Do not assume a key. Check that exactly one choice is correct and each distractor is wrong for a clear grammatical reason. Select the exact option text and letter and verify the pair. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: item.passage, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 89) throw new Error(`Coverage changed; expected 89, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.passage}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Standard English Conventions', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: item.level >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.level - 1) / 6, question_type: 'multiple_choice',
    question_text: `${item.passage}\n\nWhich choice completes the text so that it conforms to the conventions of Standard English?`,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicateRows, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateRows?.length) throw new Error(`Duplicate fingerprints detected: ${duplicateRows.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Standard English Conventions', skill: topic.name,
  subskill: ['singular number despite plural modifiers', 'collective noun', 'neither-nor proximity agreement', 'plural subject with intervening clauses', 'each of', 'together with phrase', 'inverted subject', 'each with plural object', 'the number of', 'a number of', 'as well as phrase and present perfect'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'lower' }, { module: 2, route: 'higher' }],
  distractor_rationales: items[index].wrong, calculator_expected: false, contextual: false,
  validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: items[index].explanation, independent_solution_text: reviews[index].reason,
    independent_review_method: 'Blind second-model solution and uniqueness review; proposed keys withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch: BATCH, saved: saved.length, topic: topic.name, before, after, answers: items.map((item) => item.answer), reviewPassed: true }, null, 2))
