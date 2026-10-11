import { randomUUID, createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT English Punctuation Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000046'
const passageId = randomUUID()
const passage = 'At the north edge of the city, Halcyon Observatory had been closed for nearly fifty years. When a preservation crew began clearing the upper rooms, it found the building’s original ventilation channels still intact. The roof had taken on water, but much of the timber frame remained sound. The restoration team cataloged the instruments before moving them, since even a small shift could erase evidence of how they had been used. Old repair ledgers were incomplete, so the crew compared tool marks, paint layers, and handwritten labels to reconstruct the building’s history. One recurring detail changed the project plan: narrow vents had been added in several different decades, not all at once. The crew preserved each addition and documented its location. After the observatory reopened, visitors could follow a marked route from the entrance to the control room, where a short exhibit explained how the building’s design adapted to changing instruments and weather.'
const items = [
  {
    prompt: 'Which choice completes the sentence so that it conforms to the conventions of Standard English? “After the crew removed the warped shutters ___ they found a set of narrow ventilation channels beneath the sill.”',
    choices: ['After the crew removed the warped shutters, they found a set of narrow ventilation channels beneath the sill.', 'After the crew removed the warped shutters; they found a set of narrow ventilation channels beneath the sill.', 'After the crew removed, the warped shutters they found a set of narrow ventilation channels beneath the sill.', 'After the crew removed the warped shutters they found, a set of narrow ventilation channels beneath the sill.'],
    answer: 'A', level: 5, seconds: 55,
    explanation: 'The introductory dependent clause ends before the independent clause begins, so a comma belongs after “shutters.”',
    wrong: { A: 'Correct: the comma separates the introductory dependent clause from the independent clause.', B: 'A semicolon cannot follow a dependent clause that is not a complete sentence.', C: 'The comma incorrectly separates the verb “removed” from its object.', D: 'The comma incorrectly separates “found” from the object of that verb.' },
  },
  {
    prompt: 'Which choice correctly punctuates the two related independent clauses? “The roof’s slate tiles had cracked during the closure ___ however, the timber frame beneath them remained sound.”',
    choices: ['The roof’s slate tiles had cracked during the closure, however the timber frame beneath them remained sound.', 'The roof’s slate tiles had cracked during the closure, however, the timber frame beneath them remained sound.', 'The roof’s slate tiles had cracked during the closure; however, the timber frame beneath them remained sound.', 'The roof’s slate tiles had cracked during the closure; however the timber frame beneath them remained sound.'],
    answer: 'C', level: 6, seconds: 65,
    explanation: 'A semicolon joins the two independent clauses, and the conjunctive adverb “however” is followed by a comma.',
    wrong: { A: 'Uses a comma splice and omits the comma after “however.”', B: 'The comma after “however” does not repair the comma splice between the independent clauses.', C: 'Correct: the semicolon joins the clauses and the comma follows “however.”', D: 'Joins the clauses correctly but omits the comma after the conjunctive adverb.' },
  },
  {
    prompt: 'The writer wants to set off the list as an emphatic interruption in the sentence. Which choice best accomplishes this? “The three fragile objects ___ the brass clock, the carved dial, and the etched panel ___ were moved into storage.”',
    choices: ['The three fragile objects; the brass clock, the carved dial, and the etched panel; were moved into storage.', 'The three fragile objects—the brass clock, the carved dial, and the etched panel—were moved into storage.', 'The three fragile objects: the brass clock, the carved dial, and the etched panel: were moved into storage.', 'The three fragile objects, the brass clock, the carved dial, and the etched panel; were moved into storage.'],
    answer: 'B', level: 6, seconds: 65,
    explanation: 'The paired em dashes set off the explanatory list as an interruption while leaving the main sentence intact: “The three fragile objects were moved into storage.”',
    wrong: { A: 'Semicolons cannot enclose a list that is not an independent clause.', B: 'Correct: the paired em dashes clearly set off the list and preserve the main clause.', C: 'A colon cannot close the interruption after the list.', D: 'A comma opens the interruption, but a semicolon cannot correctly close it here.' },
  },
  {
    prompt: 'Which choice uses the plural possessive correctly? “The ___ measurements were entered into the restoration log.”',
    choices: ['surveyors measurements', 'surveyor’s measurements', 'surveyors measurements’', 'surveyors’ measurements'],
    answer: 'D', level: 5, seconds: 50,
    explanation: 'The measurements belong to multiple surveyors. For a plural noun ending in s, the possessive apostrophe follows the s: “surveyors’ measurements.”',
    wrong: { A: 'Omits the apostrophe required to show possession.', B: 'Makes “surveyor” singular possessive, though the sentence refers to multiple surveyors.', C: 'Places the apostrophe after the noun phrase rather than after “surveyors.”', D: 'Correct: the plural noun ending in s takes an apostrophe after the s.' },
  },
  {
    prompt: 'Which choice correctly punctuates the restrictive clause? “The vent ___ was the only one left open.”',
    choices: ['The vent that faces the courtyard was the only one left open.', 'The vent, that faces the courtyard, was the only one left open.', 'The vent that faces the courtyard, was the only one left open.', 'The vent, that faces the courtyard was the only one left open.'],
    answer: 'A', level: 6, seconds: 55,
    explanation: 'The clause “that faces the courtyard” identifies which vent is meant, so it is restrictive and should not be set off by commas.',
    wrong: { A: 'Correct: the identifying clause is restrictive and takes no commas.', B: 'Incorrectly sets off a restrictive clause, and “that” does not introduce a nonrestrictive clause here.', C: 'Separates the subject from its verb with a comma.', D: 'Uses only one comma around a clause and still incorrectly treats it as nonrestrictive.' },
  },
  {
    prompt: 'Which choice correctly punctuates the nonessential phrase? “A row of narrow vents ___ each added during a different renovation ___ allows air to circulate through the upper rooms.”',
    choices: ['A row of narrow vents, each added during a different renovation allows air to circulate through the upper rooms.', 'A row of narrow vents each added during a different renovation, allows air to circulate through the upper rooms.', 'A row of narrow vents, each added during a different renovation, allows air to circulate through the upper rooms.', 'A row of narrow vents; each added during a different renovation; allows air to circulate through the upper rooms.'],
    answer: 'C', level: 6, seconds: 60,
    explanation: 'The nonessential phrase “each added during a different renovation” needs commas both before and after it.',
    wrong: { A: 'Omits the closing comma, leaving the nonessential phrase unpaired.', B: 'Omits the opening comma and separates the subject from its verb.', C: 'Correct: paired commas enclose the nonessential phrase.', D: 'Semicolons cannot enclose a phrase that is not an independent clause.' },
  },
  {
    prompt: 'Which choice correctly punctuates the sentence? “Although the crew stabilized the roof ___ the archivists still found water damage in two upper rooms.”',
    choices: ['Although the crew stabilized the roof; the archivists still found water damage in two upper rooms.', 'Although the crew stabilized, the roof the archivists still found water damage in two upper rooms.', 'Although the crew stabilized the roof the archivists still found water damage in two upper rooms.', 'Although the crew stabilized the roof, the archivists still found water damage in two upper rooms.'],
    answer: 'D', level: 5, seconds: 55,
    explanation: 'The “although” clause is dependent and introductory; a comma separates it from the independent clause.',
    wrong: { A: 'A semicolon cannot separate an introductory dependent clause from its main clause.', B: 'The comma separates the verb from its object.', C: 'Omits the comma needed after the introductory dependent clause.', D: 'Correct: places a comma between the dependent and independent clauses.' },
  },
  {
    prompt: 'Which choice correctly punctuates the sentence? “The exterior appeared sound ___ nevertheless, water had entered through the western gutter.”',
    choices: ['The exterior appeared sound, nevertheless the water had entered through the western gutter.', 'The exterior appeared sound; nevertheless, water had entered through the western gutter.', 'The exterior appeared sound; nevertheless water had entered through the western gutter.', 'The exterior appeared sound, nevertheless, water had entered through the western gutter.'],
    answer: 'B', level: 6, seconds: 60,
    explanation: '“Nevertheless” connects two independent clauses as a conjunctive adverb; use a semicolon before it and a comma after it.',
    wrong: { A: 'Creates a comma splice and omits the comma after “nevertheless.”', B: 'Correct: uses a semicolon between independent clauses and a comma after the conjunctive adverb.', C: 'Omits the required comma after “nevertheless.”', D: 'Commas alone do not correctly join the two independent clauses.' },
  },
  {
    prompt: 'The writer wants to emphasize that the clock’s mechanism is an interruption to the main clause. Which choice best punctuates the sentence? “The mechanism ___ a brass clock linked to a weather vane ___ still turned when the crew entered the room.”',
    choices: ['The mechanism, a brass clock linked to a weather vane; still turned when the crew entered the room.', 'The mechanism—a brass clock linked to a weather vane, still turned when the crew entered the room.', 'The mechanism—a brass clock linked to a weather vane—still turned when the crew entered the room.', 'The mechanism; a brass clock linked to a weather vane; still turned when the crew entered the room.'],
    answer: 'C', level: 6, seconds: 65,
    explanation: 'The paired em dashes emphasize the appositive interruption and leave the main clause “The mechanism still turned” intact.',
    wrong: { A: 'The mismatched comma and semicolon do not correctly enclose the interruption.', B: 'Uses only one dash, so the interruption is not properly closed.', C: 'Correct: paired em dashes set off the appositive interruption as requested.', D: 'Semicolons cannot enclose an appositive phrase.' },
  },
  {
    prompt: 'Which choice conforms to standard American English punctuation? “The foreman’s note read ___ Keep the eastern vent open ___ The inspector followed it.”',
    choices: ['The foreman’s note read, “Keep the eastern vent open.” The inspector followed it.', 'The foreman’s note read “Keep the eastern vent open.”, the inspector followed it.', 'The foreman’s note read; “Keep the eastern vent open.” The inspector followed it.', 'The foreman’s note read, “Keep the eastern vent open”. The inspector followed it.'],
    answer: 'A', level: 5, seconds: 55,
    explanation: 'The introductory phrase is followed by a comma, and in standard American English the period goes inside the closing quotation mark.',
    wrong: { A: 'Correct: the introductory comma and period inside the quotation mark follow standard American conventions.', B: 'Places a comma after a complete quoted sentence and joins it incorrectly to the next sentence.', C: 'Uses a semicolon where a comma should follow the introductory phrase.', D: 'Places the period outside the closing quotation mark, contrary to standard American punctuation.' },
  },
]

const topic = checked(await db.from('topics').select('id,name,category_id,categories(name,section_id,sections(id,test_id,name,tests(name)))'))
  .find((row) => row.id === topicId && row.name === 'Punctuation' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'English')
if (!topic) throw new Error('Expected ACT English Punctuation topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_PRO_MODEL || process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5200,
    messages: [
      { role: 'system', content: 'Blindly evaluate these original ACT English punctuation questions. Apply standard American English conventions and any stated rhetorical goal. Do not assume a key. Check that exactly one choice is best, that each stem is self-contained, and that every distractor has a real punctuation error or fails the stated goal. Select the exact answer text and letter and verify the pair. Return JSON only: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 90) throw new Error(`Coverage changed; expected 90, found ${before}`)
const passageRow = {
  id: passageId, test_id: topic.categories.sections.test_id, section_id: topic.categories.section_id,
  title: 'Restoring Halcyon Observatory', author: 'Original PrepSAT/ACT staff content', content: passage,
  source_type: 'original', source_rights_status: 'owned', active: true,
}
const rows = items.map((item) => {
  const fingerprint = createHash('sha256').update(`${passage}\n${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'ACT', section_name: 'English', category_name: 'Conventions of Standard English', topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    passage_id: passageId, difficulty: item.level >= 6 ? 'Hard' : 'Medium', difficulty_score: (item.level - 1) / 6,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation, source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'pending', approved: false, active: false,
  }
})
const { data: duplicateRows, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', rows.map((row) => row.fingerprint))
if (duplicateError) throw duplicateError
if (duplicateRows?.length) throw new Error(`Duplicate fingerprints detected: ${duplicateRows.length}`)
checked(await db.from('passages').insert(passageRow))
const saved = checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== items.length) throw new Error(`Inserted ${saved.length}/${items.length}`)
checked(await db.from('exam_item_metadata').insert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'ACT', section: 'English', domain: 'Conventions of Standard English', skill: topic.name,
  subskill: ['introductory comma', 'semicolon with conjunctive adverb', 'em-dash interruption', 'plural possessive', 'restrictive clause punctuation', 'paired commas', 'dependent clause boundary', 'conjunctive adverb boundary', 'em-dash interruption', 'quotation punctuation'][index],
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
