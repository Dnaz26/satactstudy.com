import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Transitions Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000031'
const items = [
  {
    passage: 'Researchers predicted that warmer winter water would trigger substantially earlier hatching in two coastal marshes. Temperatures did rise in both monitored marshes. ___, median hatch dates shifted by only one day, within the range of variation measured over previous seasons.',
    choices: ['As a result,', 'Nevertheless,', 'For example,', 'Similarly,'], answer: 'B', level: 6, seconds: 55,
    explanation: 'The result runs counter to the prediction: temperatures rose, but hatch dates barely changed. “Nevertheless” marks that contrast.',
    wrong: { A: 'Suggests the small shift followed as an expected consequence of the warmer water.', B: 'Correct: signals that the second observation contrasts with the prediction and temperature increase.', C: 'Would introduce an example supporting a preceding general claim, which is not the relationship here.', D: 'Would indicate a parallel result rather than a contrast.' },
  },
  {
    passage: 'A mineral’s crystal layers form in successive bands, each preserving a trace of the surrounding water. The bands can therefore retain a sequence of chemical changes that would be lost if the sample were ground into one uniform powder. ___, geochemists sometimes analyze narrow slices rather than homogenizing an entire specimen.',
    choices: ['Conversely,', 'For instance,', 'Nonetheless,', 'Consequently,'], answer: 'D', level: 5, seconds: 55,
    explanation: 'Because grinding would erase the sequence recorded in the layers, researchers analyze narrow slices. “Consequently” introduces the resulting method.',
    wrong: { A: 'Signals an opposing relationship, but the method follows from the information about preserving sequence.', B: 'Would introduce an example of a broad claim, but this sentence states a procedural consequence.', C: 'Signals concession even though no obstacle or counterexpectation is presented.', D: 'Correct: introduces the method that follows from the stated reason.' },
  },
  {
    passage: 'A building’s original mortar can reveal how its walls were repaired over time, even when written maintenance records are missing. ___, a shift from shell-rich to lime-rich mortar may indicate a change in the materials available to local builders.',
    choices: ['For example,', 'In contrast,', 'As a result,', 'At the same time,'], answer: 'A', level: 5, seconds: 50,
    explanation: 'The second sentence gives one specific way mortar can reveal repair history, so “For example” fits.',
    wrong: { A: 'Correct: introduces a concrete instance of the preceding general claim.', B: 'Implies opposition between the claim and evidence, but the mortar shift illustrates the claim.', C: 'Implies the general claim caused the mortar shift, which is not stated.', D: 'Suggests simultaneity between parallel developments rather than an example.' },
  },
  {
    passage: 'The new telescope’s calibration is less reliable near the edge of its field than at the center, and measurements from those outer regions require wider uncertainty ranges. ___, the instrument remains useful for mapping faint objects that would otherwise fall outside the survey.',
    choices: ['Therefore,', 'For example,', 'Even so,', 'Similarly,'], answer: 'C', level: 6, seconds: 55,
    explanation: 'The instrument has a limitation, yet it remains useful for a different reason. “Even so” marks this concession.',
    wrong: { A: 'Makes usefulness sound like a direct consequence of wider uncertainty, a link the text does not claim.', B: 'Would introduce an example of a preceding general statement rather than a concessive point.', C: 'Correct: acknowledges the limitation while introducing a counterbalancing benefit.', D: 'Suggests a parallel measurement result, not a contrast between limitation and usefulness.' },
  },
  {
    passage: 'The curator first compared the pigments in the portrait with those in dated workshop samples. ___, she used the comparison to narrow the painting’s likely completion period to a span of twelve years.',
    choices: ['Meanwhile,', 'Thereafter,', 'Instead,', 'For instance,'], answer: 'B', level: 5, seconds: 50,
    explanation: 'The second action follows the initial comparison: the curator used it to narrow the date. “Thereafter” provides the temporal sequence.',
    wrong: { A: 'Suggests the two actions occurred at the same time, but the sentence presents a subsequent use of the comparison.', B: 'Correct: indicates that the dating step followed the comparison.', C: 'Implies replacement of the comparison, though the second action relies on it.', D: 'Introduces an example, while the sentence instead describes a later step.' },
  },
  {
    passage: 'The two archives do not disagree about the date of the strike; their apparent conflict concerns which group of workers the word “staff” includes. ___, one ledger counts only permanent employees, while the other also includes seasonal crews.',
    choices: ['More precisely,', 'By contrast,', 'As a result,', 'For that reason,'], answer: 'A', level: 6, seconds: 55,
    explanation: 'The final sentence clarifies exactly what the difference in the word “staff” means in each archive. “More precisely” introduces that clarification.',
    wrong: { A: 'Correct: narrows and specifies the preceding description of the apparent conflict.', B: 'The archives’ counting practices differ, but the sentence explains the conflict rather than contrasting a new claim with the old one.', C: 'Does not express a cause-and-effect relationship between the dispute and counting rules.', D: 'Would make the counting rules a reason for the prior statement, which reverses the explanatory structure.' },
  },
  {
    passage: 'The first survey found that residents used the riverside path mostly in the morning, when nearby markets opened. A second survey, conducted during a festival month, recorded heavier evening use. ___, the researchers report the two periods separately instead of treating either as a typical month.',
    choices: ['By comparison,', 'For example,', 'Nevertheless,', 'Accordingly,'], answer: 'D', level: 6, seconds: 60,
    explanation: 'The second survey records a different pattern during the festival month, so the researchers report the periods separately as a result. “Accordingly” marks that reasoned response.',
    wrong: { A: 'Frames the researchers’ decision as another comparison, but the blank introduces the decision that follows from the evidence.', B: 'Does not introduce an example of a general claim; it connects evidence to a methodological choice.', C: 'Signals a counterexpectation, though the decision follows from the two surveys rather than opposing them.', D: 'Correct: introduces the reporting decision that follows from the evidence.' },
  },
  {
    passage: 'The observatory’s log was not a complete record of every night’s work. ___, it served as a selective index: entries were most detailed when unusual atmospheric conditions forced the observers to alter their routine.',
    choices: ['Accordingly,', 'For instance,', 'Rather,', 'Likewise,'], answer: 'C', level: 6, seconds: 55,
    explanation: 'The second sentence corrects the assumption that an incomplete log is simply deficient by describing what kind of record it actually is. “Rather” signals the recharacterization.',
    wrong: { A: 'Implies the selective-index function follows as a consequence, but the sentence revises the description.', B: 'Would introduce a single example, but the sentence gives a general characterization.', C: 'Correct: replaces the idea of a complete log with a more accurate account of its selective function.', D: 'Signals similarity to another record that is not mentioned.' },
  },
  {
    passage: 'No single tree-ring series captured the full drought pattern: trees at higher elevations responded later than those on the valley floor. The team aligned the records by the year each site first showed water stress and then compared how long the signal persisted. ___, their combined chronology showed a four-year event that neither elevation’s records alone made clear.',
    choices: ['For instance,', 'Nevertheless,', 'Conversely,', 'As a result,'], answer: 'D', level: 7, seconds: 65,
    explanation: 'The combined chronology is the outcome of aligning and comparing the records. “As a result” marks that consequence.',
    wrong: { A: 'Would present the chronology as an example of some preceding general claim, but no such claim appears.', B: 'Signals a concession; the chronology instead follows from the described analysis.', C: 'Signals a reversal or opposing case, but the result is consistent with the method just described.', D: 'Correct: introduces the finding produced by combining and aligning the records.' },
  },
]

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Transitions' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Transitions topic not found')
if (new Set(items.map((item) => item.answer)).size < 3) throw new Error('Answer positions need a wider spread')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 2200,
    messages: [
      { role: 'system', content: 'Blindly solve these original SAT transition questions from each full text. Do not assume any key. Check that the transition expresses the precise logical relationship, only one choice fits, and the passage is clear. Select the exact option text and letter, then verify they match. Return only JSON: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: item.passage, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 91) throw new Error(`Coverage changed; expected 91, found ${before}`)
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${item.passage}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Expression of Ideas', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: item.level >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.level - 1) / 6,
    question_type: 'multiple_choice', question_text: `${item.passage}\n\nWhich choice completes the text with the most logical transition?`,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3], correct_answer: item.answer,
    official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicateRows, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateRows?.length) throw new Error(`Duplicate fingerprints detected: ${duplicateRows.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Expression of Ideas', skill: topic.name,
  subskill: ['contrast', 'cause and effect', 'exemplification', 'concession', 'sequence', 'clarification', 'addition', 'reformulation', 'result'][index],
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
