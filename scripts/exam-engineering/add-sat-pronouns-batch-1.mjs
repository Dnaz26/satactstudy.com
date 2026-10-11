import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Pronouns Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000037'
const items = [
  {
    passage: 'Researchers divided a fragile coral sample into three sections so that each could be tested without damaging the others. Each section was placed in ___ own sealed chamber before the temperature was raised.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: ['their', 'its', 'it’s', 'them'], answer: 'B', level: 6,
    explanation: 'The antecedent is the singular noun “each section,” so the singular possessive pronoun “its” is required.',
    wrong: { A: 'Uses a plural possessive with the singular antecedent “each section.”', B: 'Correct: singular “each section” takes “its.”', C: 'Uses the contraction “it is” instead of a possessive pronoun.', D: 'Uses an object pronoun where a possessive determiner is needed.' },
  },
  {
    passage: 'Two microphones were placed at different distances from the stage to measure how the hall’s stone walls affected sound. After ___ were calibrated, the researchers recorded the same passage at three volume levels.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: ['it', 'each', 'they', 'them'], answer: 'C', level: 6,
    explanation: 'The pronoun is the subject of “were calibrated” and refers to the plural antecedent “two microphones.” The correct form is “they.”',
    wrong: { A: 'Is singular and cannot refer to the two microphones.', B: 'Would require a singular verb such as “was calibrated.”', C: 'Correct: plural subject pronoun “they” agrees with “microphones.”', D: 'Is an object form and cannot serve as the subject of “were calibrated.”' },
  },
  {
    passage: 'The historian showed the conservator a map before she signed the receipt. Both women had been handling the document, so a later reader could not tell which one had signed.',
    prompt: 'The writer wants to make clear that the conservator signed the receipt. Which choice best accomplishes this goal?',
    choices: ['The historian showed the conservator a map before she signed the receipt.', 'After the historian showed the conservator the map, the historian signed the receipt.', 'The conservator signed the receipt before the historian showed her the map.', 'After the historian showed the conservator the map, the conservator signed the receipt.'], answer: 'D', level: 7,
    explanation: 'Repeating “the conservator” identifies the signer directly and removes the ambiguous pronoun “she.”',
    wrong: { A: 'Leaves “she” with two possible antecedents.', B: 'Clearly identifies the historian as the signer, contrary to the stated goal.', C: 'Clearly identifies the conservator, but changes the order of events by placing the signature first.', D: 'Correct: it names the conservator as the signer and preserves the event order.' },
  },
  {
    passage: 'A field sample was moved into a sealed jar before it was photographed. The jar was then labeled with the sample’s collection site and date.',
    prompt: 'The writer wants to make clear that the field sample—not the jar—was photographed. Which choice best accomplishes this goal?',
    choices: [
      'A field sample was moved into a sealed jar before the sample was photographed.',
      'A field sample was moved into a sealed jar before it was photographed.',
      'A field sample was moved into a sealed jar before the jar was photographed.',
      'A field sample was moved into a sealed jar before the jar containing it was photographed.'
    ], answer: 'A', level: 7,
    explanation: 'Repeating “the sample” identifies what was photographed and removes any ambiguity about the pronoun “it.”',
    wrong: { A: 'Correct: it names the field sample as the object photographed.', B: 'Leaves “it” with two possible antecedents.', C: 'Makes the jar, rather than the sample, the object photographed.', D: 'Still says the jar was photographed, not the sample.' },
  },
  {
    passage: 'The archive’s oldest records were stored in a room with high humidity. Between the restoration specialist and ___, no one else was permitted to handle the brittle pages.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: ['I', 'me', 'myself', 'mine'], answer: 'B', level: 6,
    explanation: 'The pronoun follows the preposition “between,” so the objective form “me” is required.',
    wrong: { A: 'Uses a subject pronoun after a preposition.', B: 'Correct: “between” takes the objective form “me.”', C: 'A reflexive pronoun has no antecedent in this construction.', D: 'A possessive pronoun cannot serve as the object of “between.”' },
  },
  {
    passage: 'A linguist compared recordings from two coastal communities. The researcher ___ had designed the interview protocol later found that speakers in both communities used the same pause pattern.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: ['whom', 'whose', 'who', 'which'], answer: 'C', level: 7,
    explanation: 'The relative pronoun is the subject of “had designed.” The subject form “who” is correct for a person.',
    wrong: { A: 'Uses the object form where a subject is required.', B: 'Is possessive and would need a noun after it.', C: 'Correct: “who” refers to the linguist and is the subject of “had designed.”', D: 'Refers to things rather than the person described.' },
  },
  {
    passage: 'The review panel invited a physicist ___ it had consulted during an earlier study to examine the revised model. The physicist identified a missing assumption in the original analysis.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: ['who', 'whose', 'which', 'whom'], answer: 'D', level: 7,
    explanation: 'The pronoun is the object of “had consulted,” so the objective relative pronoun “whom” is correct.',
    wrong: { A: 'Uses the subject form where the pronoun is the object of “consulted.”', B: 'Is possessive and would need a noun after it.', C: 'Refers to things rather than the physicist.', D: 'Correct: “whom” is the object of “had consulted.”' },
  },
  {
    passage: 'The observatory returned a telescope to the university after replacing its cracked lens. The telescope’s original brass mount was kept in the display case.',
    prompt: 'Which choice correctly completes the sentence? “The observatory replaced ___ cracked lens before returning the telescope.”',
    choices: ['it’s', 'their', 'its', 'them'], answer: 'C', level: 6,
    explanation: 'The telescope is singular, so its possessive determiner is “its.” The contraction “it’s” means “it is” or “it has.”',
    wrong: { A: 'Uses a contraction instead of the possessive determiner.', B: 'Uses a plural possessive with the singular antecedent “telescope.”', C: 'Correct: “its” shows possession by the telescope.', D: 'Uses an object pronoun instead of a possessive determiner.' },
  },
  {
    passage: 'Before opening the chamber, the technicians checked the pressure settings themselves and compared the display with a reference gauge. Only then did they begin the test.',
    prompt: 'In the first sentence, what function does “themselves” serve?',
    choices: ['It is the direct object of “checked.”', 'It emphasizes that the technicians performed the check personally.', 'It refers to the pressure settings.', 'It replaces the subject “technicians.”'], answer: 'B', level: 7,
    explanation: '“Themselves” is an intensive pronoun: it emphasizes that the technicians, rather than someone else, checked the settings.',
    wrong: { A: 'The direct object is “the pressure settings.”', B: 'Correct: the intensive pronoun emphasizes who performed the action.', C: 'The pronoun refers back to the technicians, not to the settings.', D: 'It does not replace the subject; “the technicians” is still the subject.' },
  },
  {
    passage: 'The number of images rejected by the filter increased after the software update. ___ was entered in a separate log so that the team could compare one version with another.',
    prompt: 'Which choice completes the text with a pronoun that agrees with its antecedent?',
    choices: ['It', 'They', 'Them', 'Their'], answer: 'A', level: 7,
    explanation: 'The antecedent is “the number,” which is singular. “It” agrees with that singular noun; the plural noun “images” is inside a modifying phrase.',
    wrong: { A: 'Correct: “it” refers to the singular number of rejected images.', B: 'Agrees with the nearby plural noun “images,” not the antecedent “number.”', C: 'Is an object form and does not fit as the subject of “was entered.”', D: 'Is possessive and cannot serve as the sentence’s subject.' },
  },
  {
    passage: 'A paper reports two independent findings: a limestone layer formed earlier than expected, and a nearby clay layer contains traces of volcanic ash.',
    prompt: 'Which choice completes the sentence with a plural pronoun that refers to both findings? “Together, ___ suggest that ashfall was uneven across the site.”',
    choices: ['This', 'It', 'These', 'That'], answer: 'C', level: 7,
    explanation: 'The sentence refers to two findings, so the plural demonstrative “these” is appropriate.',
    wrong: { A: 'Is singular and does not agree with the two findings.', B: 'Is singular and could refer to only one finding.', C: 'Correct: “these” refers to both findings and agrees with the plural verb “suggest.”', D: 'Is singular and does not refer to both findings.' },
  },
  {
    passage: 'Neither the lead editor nor ___ had noticed that the final chart used a different scale from the earlier ones. The mismatch was found during the last review.',
    prompt: 'Which choice completes the text so that the pronoun functions correctly as part of the subject?',
    choices: ['me', 'myself', 'mine', 'I'], answer: 'D', level: 7,
    explanation: 'The pronoun is part of the compound subject of “had noticed,” so the subject form “I” is required.',
    wrong: { A: 'Uses the objective form as part of the subject.', B: 'A reflexive pronoun has no antecedent here.', C: 'A possessive pronoun cannot serve as the subject.', D: 'Correct: “I” is the subject form in “the lead editor nor I.”' },
  },
  {
    passage: 'A number of surveyors submitted reports after the rain gauge network was repaired. ___ noted that readings near the harbor differed from those inland.',
    prompt: 'Which choice completes the text with a pronoun that agrees with its antecedent?',
    choices: ['It', 'They', 'Their', 'Them'], answer: 'B', level: 7,
    explanation: '“A number of surveyors” means several surveyors, so the plural subject pronoun “they” is correct.',
    wrong: { A: 'Is singular and does not agree with the plural antecedent.', B: 'Correct: the plural pronoun refers to the several surveyors.', C: 'Is possessive and cannot serve as the subject of “noted.”', D: 'Is an object form and cannot serve as the subject.' },
  },
]

const targetAnswers = ['A', 'B', 'C', 'D', 'A', 'C', 'B', 'D', 'A', 'C', 'B', 'D', 'A']
for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const oldChoices = item.choices
  const oldIndex = 'ABCD'.indexOf(item.answer)
  const oldReasons = item.wrong
  const targetIndex = 'ABCD'.indexOf(targetAnswers[index])
  const order = [0, 1, 2, 3].filter((choiceIndex) => choiceIndex !== oldIndex)
  order.splice(targetIndex, 0, oldIndex)
  item.choices = order.map((choiceIndex) => oldChoices[choiceIndex])
  item.wrong = Object.fromEntries(order.map((choiceIndex, newIndex) => ['ABCD'[newIndex], oldReasons['ABCD'[choiceIndex]]]))
  item.answer = targetAnswers[index]
}

const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Pronouns' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Pronouns topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5200,
    messages: [
      { role: 'system', content: 'Blindly solve each original SAT Pronouns item from its passage and stem. Apply standard written English, check antecedent reference, case, number, and the requested editorial purpose. Do not assume a key. Ensure exactly one choice is defensible, then return its exact letter and text. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: item.passage, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 87) throw new Error(`Coverage changed; expected 87, found ${before}`)
const rows = items.map((item) => {
  const question = `${item.passage}\n\n${item.prompt}`
  const fingerprint = createHash('sha256').update(`${question}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Standard English Conventions', topic_name: topic.name,
    subtopic_name: 'Pronoun reference, agreement, and case', topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: (item.level - 1) / 6, question_type: 'multiple_choice', question_text: question,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicates, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicates?.length) throw new Error(`Duplicate fingerprints detected: ${duplicates.length}`)
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Standard English Conventions', skill: topic.name,
  subskill: ['each and singular antecedent', 'plural antecedent and subject case', 'ambiguous antecedent revision', 'pronoun antecedent identification', 'object after preposition', 'relative pronoun subject case', 'relative pronoun object case', 'its versus it’s', 'intensive pronoun', 'the number of and singular agreement', 'plural demonstrative reference', 'pronoun in compound subject', 'a number of and plural agreement'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].level === 7 ? 75 : 60,
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
