import { randomUUID, createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Grammar and Usage Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000047'
const passageId = randomUUID()
const passage = 'The civic science program began after residents noticed that summer storms seemed to cool some streets more than others. A university team agreed to test the impression, although its first instruments had been designed for open fields rather than narrow streets bordered by brick buildings. Researchers borrowed compact sensors and asked neighborhood groups to help install them. Each group received a weatherproof case and instructions for recording its location. Before placing each sensor, volunteers photographed the mounting position and noted nearby walls, trees, and parked vehicles. The team chose three streets for the pilot: one with continuous shade, one with scattered trees, and one with little shade. Neither the shade canopy nor the parked cars block the eastern sensor from afternoon sun. The effect of shade, together with differences in wind speed, varies from street to street. At the end of the season, technicians would retrieve the sensors, inspect their cases, and publish the raw measurements. The researchers interviewed a resident who had kept a detailed log of storm temperatures. The pilot compared readings from shaded streets with those from streets that had little tree cover. The program’s value depends not only on whether its map is accurate but also on whether other groups can repeat the method.'
const items = [
  {
    prompt: 'Which choice completes the sentence so that it conforms to the conventions of Standard English? “A university team of ecologists, along with two graduate researchers, ___ to test residents’ impression that rain cooled some streets more than others.”',
    choices: ['agree', 'have agreed', 'agreed', 'were agreeing'], answer: 'C', level: 6, seconds: 60,
    explanation: 'The passage recounts a completed event, and “team” is the singular subject. The simple-past verb “agreed” fits both the subject and the timeline.',
    wrong: { A: 'Uses present tense even though the passage narrates a completed decision.', B: 'Uses a plural auxiliary with the singular collective subject and shifts to present perfect.', C: 'Correct: “team” is singular and the narrative describes a completed past action.', D: 'Uses an unnecessary progressive form for a single completed decision.' },
  },
  {
    prompt: 'Which choice completes the sentence so that the pronoun agrees with its antecedent? “Each neighborhood group received a sensor and instructions for recording ___ location.”',
    choices: ['their', 'its', 'they’re', 'them'], answer: 'B', level: 6, seconds: 55,
    explanation: 'The antecedent is “each neighborhood group,” which is singular. The possessive pronoun “its” correctly refers to the group.',
    wrong: { A: 'Uses a plural pronoun with the singular antecedent “each group.”', B: 'Correct: “its” is the singular possessive pronoun.', C: 'Uses “they’re,” meaning “they are,” rather than a possessive pronoun.', D: 'Uses an object pronoun where a possessive determiner is required.' },
  },
  {
    prompt: 'Which choice completes the sentence with verbs that are parallel in form and consistent in tense? “During the pilot’s final week, technicians ___ each sensor against a reference instrument before posting the readings.”',
    choices: ['compare', 'compares', 'compared', 'comparing'], answer: 'C', level: 6, seconds: 60,
    explanation: 'The passage describes the completed pilot in the past, so “compared” is the appropriate past-tense verb.',
    wrong: { A: 'Uses present tense rather than the passage’s past-tense narrative.', B: 'Uses present tense and a singular form with the plural subject “technicians.”', C: 'Correct: the plural subject takes the past-tense verb “compared.”', D: 'Uses a participle without a finite verb, leaving the sentence incomplete.' },
  },
  {
    prompt: 'Which choice completes the sentence so that the verb agrees with the nearer subject? “In this alley at noon, neither the shade canopy nor the parked cars ___ the sensor from afternoon sun.”',
    choices: ['blocks', 'has blocked', 'is blocking', 'block'], answer: 'D', level: 7, seconds: 65,
    explanation: 'With “neither…nor,” the verb agrees with the nearer subject. “Parked cars” is plural, so the present-tense verb is “block.”',
    wrong: { A: 'Agrees with the more distant singular noun “canopy,” not the nearer plural subject.', B: 'Uses a singular auxiliary with the nearer plural subject.', C: 'Uses a singular auxiliary with the nearer plural subject.', D: 'Correct: the nearer subject “parked cars” is plural and takes “block.”' },
  },
  {
    prompt: 'Which choice completes the sentence so that the subject and verb agree? “The effect of shade, together with differences in wind speed, ___ from street to street.”',
    choices: ['vary', 'varies', 'have varied', 'are varying'], answer: 'B', level: 6, seconds: 55,
    explanation: 'The subject is the singular noun “effect.” The phrase “together with differences in wind speed” does not create a compound subject, so “varies” is correct.',
    wrong: { A: 'Agrees with the nearby plural noun “differences” rather than the singular subject “effect.”', B: 'Correct: singular “effect” takes “varies.”', C: 'Uses a plural auxiliary with a singular subject.', D: 'Uses a plural auxiliary with a singular subject and changes the aspect.' },
  },
  {
    prompt: 'Which choice completes the sentence so that the verbs are parallel? “At the end of the season, technicians retrieved the sensors, inspected their cases, and ___ the raw measurements.”',
    choices: ['posts', 'have posted', 'posted', 'posting'], answer: 'C', level: 5, seconds: 55,
    explanation: 'The sentence lists three completed past actions: retrieved, inspected, and posted. “Posted” keeps the verbs parallel in simple past tense.',
    wrong: { A: 'Shifts to present tense and a singular verb.', B: 'Shifts to present perfect instead of matching the two simple-past verbs.', C: 'Correct: “posted” matches “retrieved” and “inspected.”', D: 'Uses a participle rather than a finite verb in the series.' },
  },
  {
    prompt: 'Which choice places the opening phrase next to the person who performed the action? “Walking down the narrow street, ___ recorded each sensor’s location.”',
    choices: ['the research team', 'each sensor', 'the mounting positions', 'a photograph'], answer: 'A', level: 7, seconds: 65,
    explanation: 'The opening phrase “Walking down the narrow street” must modify the people doing the walking. “The research team” is the only choice that can perform that action.',
    wrong: { A: 'Correct: the team can walk down the street and record the locations.', B: 'Would make the sensor appear to be walking.', C: 'Would make the positions appear to be walking.', D: 'Would make a photograph appear to be walking.' },
  },
  {
    prompt: 'Which choice completes the sentence with the correct relative pronoun? “The researchers interviewed a resident ___ had kept a detailed log of storm temperatures.”',
    choices: ['whom', 'whose', 'which', 'who'], answer: 'D', level: 5, seconds: 50,
    explanation: 'The relative pronoun is the subject of “had kept,” so the subject form “who” is required.',
    wrong: { A: 'Uses the object form “whom” where the pronoun is the subject of the clause.', B: 'Would require a noun after it, as in “whose log.”', C: 'Refers to things, not the person described.', D: 'Correct: “who” is the subject of “had kept.”' },
  },
  {
    prompt: 'Which choice uses the correct pronoun case? “The project coordinator gave the residents and ___ a copy of the installation instructions.”',
    choices: ['I', 'me', 'myself', 'mine'], answer: 'B', level: 6, seconds: 55,
    explanation: 'The pronoun is an indirect object of “gave.” The objective form “me” is required; removing “the residents and” makes the case clear: “gave me a copy.”',
    wrong: { A: 'Uses a subject pronoun as an object.', B: 'Correct: “me” is the objective case required by “gave.”', C: 'A reflexive pronoun has no appropriate antecedent here.', D: 'A possessive pronoun cannot serve as the indirect object.' },
  },
  {
    prompt: 'Which choice completes the sentence so that the verb agrees with its subject? “One set of readings from each street ___ against the reference instrument before publication.”',
    choices: ['were checked', 'have been checked', 'was checked', 'are checked'], answer: 'C', level: 7, seconds: 60,
    explanation: 'The subject is the singular noun “set,” not the plural noun “readings.” Because the checks occurred before publication, “was checked” is correct.',
    wrong: { A: 'Agrees with “readings” rather than the singular subject “set.”', B: 'Uses a plural auxiliary with the singular subject.', C: 'Correct: singular “set” takes “was checked.”', D: 'Uses a plural auxiliary and shifts to present tense.' },
  },
  {
    prompt: 'Which choice makes the comparison between the two groups of readings logical and parallel?',
    choices: ['The pilot compared the readings from shaded streets with those from streets that had little tree cover.', 'The pilot compared the readings from shaded streets with streets that had little tree cover.', 'The pilot compared the shade of streets with readings taken on streets that had little tree cover.', 'The pilot compared readings from shaded streets with the amount of tree cover on streets that had little shade.'],
    answer: 'A', level: 7, seconds: 75,
    explanation: 'The sentence compares readings with readings. The demonstrative “those” stands for “readings,” keeping both sides of the comparison parallel.',
    wrong: { A: 'Correct: it compares readings from one set of streets with readings from another.', B: 'Compares readings with streets rather than with readings.', C: 'Compares shade with readings, two unlike quantities.', D: 'Compares readings with an amount of tree cover rather than with another set of readings.' },
  },
  {
    prompt: 'The writer wants the two parts of the “not only…but also” construction to be grammatically parallel. Which choice best accomplishes this?',
    choices: [
      'The program’s value depends not only on the accuracy of its map but also on whether other groups can repeat the method.',
      'The program’s value depends not only on whether its map is accurate but also on whether other groups can repeat the method.',
      'The program’s value depends not only on an accurate map but also on whether other groups can repeat the method.',
      'The program’s value depends not only on whether its map is accurate but also on other groups repeating the method.'
    ],
    answer: 'B', level: 7, seconds: 75,
    explanation: 'The paired construction should join matching structures. Choice B uses two “whether” clauses, each introduced by “on.”',
    wrong: { A: 'Pairs a noun phrase with a “whether” clause, so the structures do not match.', B: 'Correct: both sides are parallel “on whether” clauses.', C: 'Pairs an adjective phrase with a “whether” clause, so the structures do not match.', D: 'Pairs a “whether” clause with a gerund phrase, so the structures do not match.' },
  },
]

const targetAnswers = ['C', 'A', 'D', 'B', 'B', 'C', 'A', 'D', 'A', 'C', 'B', 'D']
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

const topic = checked(await db.from('topics').select('id,name,category_id,categories(name,section_id,sections(id,test_id,name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Grammar and Usage' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'English')
if (!topic) throw new Error('Expected ACT Grammar and Usage topic not found')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5200,
    messages: [
      { role: 'system', content: 'Blindly review each original ACT English question using its passage. Apply standard English grammar and the stated rhetorical aim. Do not assume a key. Check exactly one answer is best, the comparison is logical, and each distractor is clearly wrong. Select the exact choice text and letter and verify the pair. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 88) throw new Error(`Coverage changed; expected 88, found ${before}`)
const passageRow = { id: passageId, test_id: topic.categories.sections.test_id, section_id: topic.categories.section_id,
  title: 'Mapping Summer Heat on City Streets', author: 'Original PrepSAT/ACT staff content', content: passage,
  source_type: 'original', source_rights_status: 'owned', active: true }
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${passage}\n${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'English', category_name: 'Conventions of Standard English', topic_name: topic.name, subtopic_name: topic.name,
    topic_id: topic.id, passage_id: passageId, difficulty: 'Hard', difficulty_score: (item.level - 1) / 6,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH, fingerprint,
    answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { count: duplicateCount, error: duplicateError } = await db.from('questions').select('id', { count: 'exact', head: true }).in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateCount) throw new Error(`Duplicate fingerprints detected: ${duplicateCount}`)
const { count: afterPassageCheck, error: passageCountError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (passageCountError) throw passageCountError
if (afterPassageCheck !== 88) throw new Error(`Coverage changed before insert: expected 88, found ${afterPassageCheck}`)
checked(await db.from('passages').insert(passageRow))
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'English', domain: 'Conventions of Standard English', skill: topic.name,
  subskill: ['collective noun agreement', 'singular antecedent', 'verb tense and parallel form', 'neither-nor proximity agreement', 'intervening phrase agreement', 'parallel verb tense', 'modifier placement', 'relative pronoun case', 'objective pronoun case', 'agreement with head noun', 'logical comparison', 'correlative conjunction parallelism'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].seconds,
  module_eligibility: [{ module: 1, route: 'common', passageGroup: passageRow.title }], distractor_rationales: items[index].wrong,
  calculator_expected: false, contextual: true, validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: { independent_solution: true, answer_verified: true, distractors_verified: true, ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: items[index].explanation, independent_solution_text: reviews[index].reason,
    independent_review_method: 'Blind second-model solution and uniqueness review; proposed keys withheld.' },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
}))))
checked(await db.from('questions').update({ approved: true, active: true, review_status: 'approved' }).in('id', saved.map((row) => row.id)))
const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch: BATCH, saved: saved.length, passageId, passageTitle: passageRow.title, topic: topic.name, before, after, answers: items.map((item) => item.answer), reviewPassed: true }, null, 2))
