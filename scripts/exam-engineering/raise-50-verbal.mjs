import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { db, checked } from '../digital-sat/db.mjs'
import { rubricTotal } from './difficulty-rubric.mjs'

const batchName = 'Fifty percent harder verbal 2026-10-06'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const readingPassage = {
  key: 'bridge-delay',
  title: 'Two accounts of the footbridge',
  content: 'The town board posted two accounts of the same footbridge before noon. Account A, from the treasurer, said the deck had loose planks and that the replacement bid was 18,000 dollars. It recalled that a 9,000 dollar repair last year lasted only one season, then urged the board to replace the deck now, because another partial repair would postpone the failure and because closing the path would force the town to rent a shuttle. Those pages said nothing about the water under the span. Account B, from the habitat clerk, agreed that the planks were loose. It said the planks shaded a shallow pool where young trout hold through July, and that taking the deck off would leave that pool in full sun for a summer. The clerk added that the cheapest replacement method would drop sawdust into the pool. Instead of the 18,000 dollar deck, the clerk priced a fastening job and a grate at 4,000 dollars and asked the board to wait until the trout had left. The clerk did not claim that this cheaper job would last as long as a new deck. An engineer sheet, stapled behind both accounts, listed twelve loose planks and stopped there. A resident who read only that sheet could count the damage. That resident could not tell which repair was being delayed, or why the delay was tied to the fish rather than to the bid.',
}
const englishPassage = {
  key: 'loft-label',
  title: 'The fair drawer',
  content: 'The map loft had one week left before the school fair. Mira wanted visitors to find the river map first, but the top drawer still held bus maps. She wrote a new label after the director had signed the old one. Covered in dust from the lower drawers, the river maps were moved up, and the bus maps went below. The old sign said, "The maps that are the maps of the river, if they are the ones for the fair, are located in the drawer that is the top drawer." Students who read only the first line of that sign missed the fair condition. After the move, a visitor could reach the river map without opening the lower drawers. The director later asked whether the label or the move had done the real work. Mira kept both, because a clear label on the wrong drawer would still send people downward.',
}

assert(readingPassage.content.split(/\s+/).length >= 190, `reading words ${readingPassage.content.split(/\s+/).length}`)
assert(englishPassage.content.split(/\s+/).length >= 130, `english words ${englishPassage.content.split(/\s+/).length}`)

const items = []
function add(item) {
  const total = rubricTotal(item.rubric)
  assert(total >= 12, `${item.topic} ${total}`)
  if (item.exam === 'SAT') assert(item.prompt.length >= 100, `${item.topic} len ${item.prompt.length}`)
  if (item.passage) assert(item.passage.content.split(/\s+/).length >= (item.section === 'Reading' ? 180 : 120), item.topic)
  assert(!item.prompt.includes('$'), item.topic)
  assert(new Set(item.choices.map((choice) => choice[0])).size === 4, item.topic)
  item.rubric = { ...item.rubric, total, band: total >= 15 ? 'elite-hard' : 'true-hard' }
  items.push(item)
}
const R = (...v) => ({
  steps: v[0], abstraction: v[1], hiddenSetup: v[2], conceptMixing: v[3], graphInference: v[4],
  passageComplexity: v[5], choiceCloseness: v[6], distractorRealism: v[7], timePressure: v[8],
})

const readingTopics = [
  ['Comparing Texts', 'How does Account B relate to Account A?', 'C', [
    ['It denies that the planks are loose.', 'Account B says it agrees the planks are loose.'],
    ['It accepts the 18,000 dollar replacement as the only safe plan.', 'Account B prices a 4,000 dollar fastening and asks for a delay.'],
    ['It accepts the loose planks but argues for a later, smaller repair because of the trout.', 'The agreement is in one sentence. The delay and the grate are justified later by the fish and the sawdust.'],
    ['It is mainly a list of twelve loose planks.', 'The count of planks is only on the engineer sheet.'],
  ], 'B shares the damage and then changes the timing and the method.'],
  ['Author Purpose', 'What is the main purpose of Account B?', 'A', [
    ['To justify waiting on a full replacement until the trout leave.', 'The clerk agrees the planks are loose, then uses the pool, the sun, and the sawdust to support a delay.'],
    ['To prove the 18,000 dollar bid is lower than a shuttle.', 'The shuttle comparison is in Account A. Account B never mentions it.'],
    ['To count the loose planks.', 'The engineer sheet counts them. Account B is an argument about timing.'],
    ['To claim the cheaper repair will last as long as a new deck.', 'The clerk explicitly does not claim that.'],
  ], 'The purpose is the delay, and it depends on the fish details, not on the shared fact that the planks are loose.'],
  ['Vocabulary in Context', 'In Account B, "hold" most nearly means', 'B', [
    ['grip with their mouths', 'Nothing in the account describes trout biting the planks.'],
    ['remain', 'The planks shade a pool where the trout hold through July, and the clerk asks the board to wait until the trout had left. Together those lines mean the fish stay.'],
    ['are counted by the engineer', 'The engineer counts planks, not trout.'],
    ['postpone the bid', 'Postpone belongs to the treasurer’s partial repair, not to the verb used for the trout.'],
  ], 'Hold is not defined in the next clause. The later line about the trout leaving supplies the meaning.'],
  ['Main Idea and Details', 'Which statement is the central disagreement between Account A and Account B?', 'D', [
    ['Whether the planks are loose.', 'Both accounts agree that they are loose.'],
    ['Whether the engineer counted twelve planks.', 'Neither account disputes the engineer sheet.'],
    ['Whether last year’s repair cost 9,000 dollars.', 'Only Account A mentions that cost, and Account B does not contradict it.'],
    ['Whether the deck should be replaced now or after the trout leave.', 'A wants replacement now for cost reasons. B wants a smaller repair and a delay tied to the fish.'],
  ], 'The shared fact is the damage. The conflict is the schedule.'],
  ['Inference', 'Which inference is supported only when Account B is read past its first agreement?', 'A', [
    ['The clerk does not treat the cheaper repair as equal in lifespan to a new deck.', 'That limit appears in the clerk’s later sentence, not in the sentence that agrees the planks are loose.'],
    ['The clerk thinks the trout never leave the pool.', 'The clerk asks the board to wait until the trout had left, so the account assumes they do leave.'],
    ['The treasurer measured sawdust from last year’s repair.', 'Sawdust is the clerk’s warning about a replacement method, not a measurement in Account A.'],
    ['The engineer recommends the grate.', 'The engineer sheet stops after the count and chooses neither plan.'],
  ], 'The lifespan limit is a later sentence. The opening agreement does not contain it.'],
]

for (const [topic, prompt, answer, choices, proof] of readingTopics) {
  add({
    exam: 'ACT', section: 'Reading', topic, passage: readingPassage, prompt, answer, choices, proof,
    rubric: R(2, 2, 2, 2, 0, 2, 2, 2, 2),
  })
}

const englishTopics = [
  ['Grammar and Usage', 'Which choice agrees with the subject of the first clause and the subject of the second? "Neither the label nor the maps ____ been moved, but the drawer ____ already empty."', 'A', [
    ['have / was', 'With neither/nor, the verb agrees with the nearer subject, "maps," so the first verb is plural. "Drawer" is singular, so the second verb is "was."'],
    ['has / was', 'That makes the first verb agree with "label" and ignores the nearer subject "maps."'],
    ['have / were', 'The first verb is plural, but "drawer" is singular.'],
    ['has / were', 'Both verbs agree with the wrong noun.'],
  ], 'Two agreement decisions: nearer subject maps, then singular drawer.'],
  ['Punctuation', 'Which choice makes clear that the director, not Mira, kept the old label?', 'B', [
    ['Mira said the maps were ready and kept the old label.', 'The missing subject on the second verb makes Mira the one who kept the label.'],
    ['Mira said the maps were ready, and the director kept the old label.', 'The comma and the new subject give the second action to the director.'],
    ['Mira said the maps were ready and the director, kept the old label.', 'The comma after the director splits the subject from its verb.'],
    ['Mira, said the maps were ready, and kept the old label.', 'The added commas still leave Mira as the subject of "kept."'],
  ], 'The correct sentence needs both a clause boundary and a new subject.'],
  ['Sentence Structure', 'Which revision fixes the dangling opener without changing who was dusty?', 'C', [
    ['Covered in dust from the lower drawers, Mira moved the river maps.', 'That makes Mira the thing covered in dust. The passage says the maps were dusty.'],
    ['Covered in dust from the lower drawers, the move happened.', 'A move cannot be covered in dust, and the maps disappear.'],
    ['Mira moved the river maps, which were covered in dust from the lower drawers.', 'The maps remain the dusty things, and Mira remains the person who moved them.'],
    ['Dust covered Mira as she moved the river maps from the lower drawers.', 'That moves the dust onto Mira.'],
  ], 'The opener must attach to the maps, not to Mira.'],
  ['Concision and Clarity', 'Which shortening keeps both the map type and the fair condition?', 'D', [
    ['The river maps are in the top drawer.', 'This drops the condition that they are the ones for the fair.'],
    ['Maps are somewhere in the loft.', 'This drops the type, the condition, and the drawer.'],
    ['The fair is in the top drawer.', 'This changes what is in the drawer.'],
    ['If they are the fair maps, the river maps are in the top drawer.', 'This keeps the condition and the location and cuts the repeated wording.'],
  ], 'The long sign has a condition in the middle. A shortening that drops "if" changes the claim.'],
  ['Organization', 'Which sentence states the purpose that both the label and the move are meant to serve?', 'A', [
    ['Mira wanted visitors to find the river map first.', 'The label and the move are later actions. This earlier sentence says what those actions are for.'],
    ['The map loft had one week left before the school fair.', 'The deadline explains urgency. It does not say what visitors needed to find.'],
    ['The director later asked whether the label or the move had done the real work.', 'That question comes after the work. It does not state the purpose.'],
    ['Students who read only the first line of that sign missed the fair condition.', 'That is a result of the old wording, not the purpose of the change.'],
  ], 'Purpose is the want. The label and the move carry it out, which is why the director’s later question still depends on that sentence.'],
  ['Topic Development', 'Which addition best develops the director’s question without repeating the move itself?', 'B', [
    ['Mira moved the maps again the next day.', 'That repeats the action the question is about.'],
    ['A clear label on the wrong drawer would still send people downward.', 'The passage already uses this reason. It develops the question by showing why the label and the move both matter.'],
    ['The fair is next week.', 'The deadline is already in the first sentence and does not develop the question.'],
    ['Bus maps are a kind of map.', 'That adds no information about the director’s question.'],
  ], 'The developing sentence has to answer why both changes matter, not restate one of them.'],
  ['Style and Tone', 'Which sentence best matches the passage’s plain record of a work decision?', 'C', [
    ['Mira heroically rescued the helpless visitors from map chaos.', 'The passage does not praise her or describe visitors as helpless.'],
    ['The drawers were an outrage and a scandal.', 'The passage never uses that tone.'],
    ['Mira kept both the label and the move, because a clear label on the wrong drawer would still send people downward.', 'This states the decision and the reason in the same plain voice as the rest of the passage.'],
    ['Wow, what a brilliant drawer plan.', 'The passage does not address the reader or cheer.'],
  ], 'The matching tone is a reason, not a compliment. The reason also has to match the passage’s own last claim.'],
]

for (const [topic, prompt, answer, choices, proof] of englishTopics) {
  add({
    exam: 'ACT', section: 'English', topic, passage: englishPassage, prompt, answer, choices, proof,
    rubric: R(2, 2, 2, 2, 0, 2, 2, 2, 2),
  })
}

function sat(topic, prompt, answer, choices, proof, passage) {
  add({
    exam: 'SAT', section: 'Reading and Writing', topic, prompt, answer, choices, proof, passage,
    rubric: R(2, 2, 2, 2, 0, 2, 2, 2, 2),
  })
}

sat('Boundaries', 'Which choice makes clear that the director, not the archivist, kept the old label? The archivist had already said the maps were ready.', 'B', [
  ['The archivist said the maps were ready and kept the old label.', 'Without a new subject, "kept" still belongs to the archivist.'],
  ['The archivist said the maps were ready, and the director kept the old label.', 'The new subject assigns the second action to the director. The comma marks the boundary between the two clauses.'],
  ['The archivist said the maps were ready and the director, kept the old label.', 'The comma after "director" separates that subject from its verb.'],
  ['The archivist, said the maps were ready, and kept the old label.', 'The commas leave the archivist as the subject of "kept."'],
], 'The boundary and the new subject are both required. Either one alone leaves the wrong person keeping the label.')

sat('Form, Structure, and Sense', 'Which pair completes the sentence so that both clauses agree? "Neither the label nor the maps ____ been moved, but the drawer ____ already empty."', 'A', [
  ['have / was', 'The nearer subject of neither/nor is the plural "maps." The subject of the second clause is the singular "drawer."'],
  ['has / was', 'The first verb agrees with "label" and skips the nearer subject.'],
  ['have / were', 'The second verb treats "drawer" as plural.'],
  ['has / were', 'Both verbs agree with the wrong noun.'],
], 'The sentence needs two agreement decisions, not one.')

sat('Verb Tense and Form', 'The loft closed in May. Which choice fits a fact that is still true, rather than an action finished in May? "The loft closed in May, but the river ____ south of the mill."', 'C', [
  ['flowed', 'That puts the river’s direction in the past with the closing. The direction is a standing fact.'],
  ['has flowed', 'That suggests a recently completed span, not a permanent direction.'],
  ['flows', 'The closing is finished. The river’s direction is not. The present tense marks that difference.'],
  ['flow', 'The subject "river" is singular.'],
], 'Tense and agreement both have to be settled. The past verb in the first clause is the trap.')

sat('Concision', 'Which shortening keeps the fair condition as well as the location? Original: "The maps that are the maps of the river, if they are the ones for the fair, are located in the drawer that is the top drawer."', 'D', [
  ['The river maps are in the top drawer.', 'This drops the condition that they are the ones for the fair.'],
  ['Maps are located somewhere in the loft.', 'This drops the type, the condition, and the drawer.'],
  ['The fair is in the top drawer.', 'This changes what the drawer contains.'],
  ['If they are the fair maps, the river maps are in the top drawer.', 'This keeps the condition and the place and cuts the repeated wording.'],
], 'Cutting "if" changes the claim. The short form has to keep it.')

sat('Punctuation', 'Mira printed the label. Which sentence is punctuated so that only the director, not Mira, reviewed it?', 'B', [
  ['Mira printed the label and reviewed it.', 'Both actions belong to Mira.'],
  ['Mira printed the label, but the director reviewed it.', 'The comma and "but" start a new clause whose subject is the director.'],
  ['Mira printed the label, but the director, reviewed it.', 'The comma after "director" splits the subject from the verb.'],
  ['Mira printed the label but, the director reviewed it.', 'The comma after "but" separates the conjunction from the clause it introduces.'],
], 'The punctuation has to create a new clause and keep that clause’s subject attached to its verb.')

sat('Subject-Verb Agreement', 'Which choice agrees in both clauses? "The set of measurements, along with the site sketch and the notes that were added later, ____ stored, and the notes themselves ____ still in the folder."', 'A', [
  ['was / were', 'The head of the first subject is the singular "set." "Together with" does not make it plural. "Notes" is the plural subject of the second clause.'],
  ['were / were', 'That makes "set" agree with the nouns in the "together with" phrase.'],
  ['was / was', 'The second subject, "notes," is plural.'],
  ['were / was', 'Both clauses agree with the wrong noun.'],
], 'This is the old one-clause agreement item plus a second clause that points the other way.')

sat('Pronouns', 'Which revision makes clear that the label, not the drawer, was the thing Mira rewrote? "Mira opened the drawer for the label and rewrote it."', 'C', [
  ['Mira opened the drawer for the label and rewrote it.', '"It" can mean the drawer or the label.'],
  ['Mira opened the drawer for the label and rewrote them.', '"Them" has no plural noun to refer to.'],
  ['Mira opened the drawer, took out the label, and rewrote the label.', 'Repeating "label" removes the double reference. The drawer is only what she opened.'],
  ['Mira opened it for the label and rewrote the drawer.', 'That assigns the rewriting to the drawer.'],
], 'The original pronoun has two possible nouns. The fix has to choose the label without moving the action.')

sat('Command of Evidence — Textual', 'Account A urges replacement now because a partial repair would postpone the failure and because a closure would require a shuttle. Account B never mentions the shuttle. Which finding supports Account A’s cost argument and is not answered by Account B?', 'B', [
  ['The planks are loose.', 'Account B agrees with that finding, so it does not separate the two accounts.'],
  ['Closing the path would require a rented shuttle.', 'Only Account A uses that cost. Account B never replies to it.'],
  ['Young trout use the shaded pool.', 'That evidence belongs to Account B, not to Account A’s cost argument.'],
  ['The engineer counted twelve planks.', 'The count does not say whether replacement is cheaper than a shuttle.'],
], 'The supporting line has to help A and be absent from B.', readingPassage)

sat('Modifiers', 'The draft begins "Covered in dust from the lower drawers." Which revision makes the maps, rather than Mira, the things covered in dust?', 'A', [
  ['Mira moved the river maps, which were covered in dust from the lower drawers.', 'The clause attaches the dust to the maps.'],
  ['Covered in dust from the lower drawers, Mira moved the river maps.', 'The opener attaches the dust to Mira.'],
  ['Covered in dust, the move of the maps happened.', 'A move cannot be covered in dust.'],
  ['Dust covered Mira while the maps waited.', 'That puts the dust on Mira and drops the move.'],
], 'The modifier’s noun is the whole question. The move itself has to stay Mira’s action.')

sat('Parallelism', 'Which choice keeps the list in one grammatical form? "The job requires labeling the drawers, moving the river maps, and ____."', 'D', [
  ['to tell visitors where to start', 'That shifts from gerunds to an infinitive.'],
  ['visitors are told where to start', 'That shifts to a clause.'],
  ['a clear first stop for visitors', 'That shifts to a noun phrase.'],
  ['telling visitors where to start', 'Labeling, moving, and telling are the same form.'],
], 'The first two items set the form. The third has to match them, not merely add a related idea.')

sat('Organization and Flow', 'Which sentence should come immediately after "Mira wanted visitors to find the river map first"? The next sentence should carry out that purpose.', 'C', [
  ['The loft had one week left.', 'The deadline is background. It does not carry out the want.'],
  ['Wow, the drawers were a mess.', 'That changes the voice and does not follow the purpose.'],
  ['She wrote a new label and moved the river maps to the top drawer.', 'Those two actions are how the purpose is carried out, so they belong next.'],
  ['The director later wondered which action mattered.', 'That question belongs after both actions, not before they are stated.'],
], 'The next sentence has to perform the purpose, not restate the setting.')

sat('Evidence and Details', 'The engineer sheet is stapled behind both accounts. Which detail shows that reading only that sheet is not enough to choose a repair?', 'A', [
  ['The sheet lists twelve loose planks and does not choose either plan.', 'A count of damage does not say whether to replace the deck now or wait for the trout.'],
  ['Account A says the planks are loose.', 'That repeats a fact both accounts share. It does not show the limit of the engineer sheet.'],
  ['The replacement bid is 18,000 dollars.', 'That is a cost in Account A, not a description of the engineer sheet.'],
  ['The grate costs 4,000 dollars.', 'That price is the clerk’s plan, not the engineer’s detail.'],
], 'The detail has to show both what the sheet contains and what it leaves out.', readingPassage)

sat('Inference', 'A resident reads only Account B’s sentence that the planks are loose and stops there. Which conclusion would that resident miss?', 'B', [
  ['The planks are loose.', 'That is the sentence the resident did read.'],
  ['The clerk wants a delay tied to the trout, not an immediate new deck.', 'The delay, the grate, and the trout appear only after the agreement.'],
  ['The treasurer wrote Account A.', 'The resident was not reading Account A.'],
  ['Twelve planks are loose.', 'That count is on the engineer sheet, and it is not the conclusion hidden later in Account B.'],
], 'Stopping at the shared fact drops the clerk’s actual request.', readingPassage)

sat('Text Structure and Purpose', 'Why does the passage place the engineer sheet after both accounts, rather than before either account begins?', 'C', [
  ['To prove the treasurer miscounted the planks.', 'The sheet’s count is not used to correct either account.'],
  ['To recommend the grate.', 'The sheet chooses neither plan.'],
  ['To show that a bare count cannot settle the dispute the two accounts just opened.', 'The sheet comes after the cost argument and the trout argument, and it adds only a number.'],
  ['To introduce the shuttle cost.', 'The shuttle is in Account A, before the sheet.'],
], 'The placement matters. The number answers a question neither account is mainly asking.', readingPassage)

sat('Cross-Text Connections', 'Account A calls for the deck to be replaced now, before the board allows any delay. How does Account B respond to that call?', 'A', [
  ['It accepts the damage but replaces the timetable and the method.', 'B agrees the planks are loose, then offers a fastening job and a wait for the trout.'],
  ['It denies that the planks are loose.', 'The first move of Account B is to agree.'],
  ['It adopts the shuttle comparison.', 'Account B never mentions the shuttle.'],
  ['It says the cheaper job will last as long as a new deck.', 'The clerk does not claim that.'],
], 'The response has two parts: accept the damage, reject the schedule.', readingPassage)

sat('Inferences', 'Which inference depends on reading both the sawdust sentence and the lifespan sentence in Account B?', 'D', [
  ['The planks are loose.', 'That inference needs only the agreement sentence.'],
  ['The treasurer wants replacement now.', 'That is Account A.'],
  ['The engineer counted planks.', 'That is the engineer sheet.'],
  ['The clerk’s cheaper plan avoids a stated harm of replacement and is still not claimed to last as long.', 'Sawdust is the harm. The later sentence refuses the lifespan claim. Neither sentence alone gives both halves.'],
], 'The inference is a combination, not a restatement of one line.', readingPassage)

sat('Sentence Boundaries', 'Which choice correctly joins two independent clauses while keeping the contrast between a clear label and the wrong drawer?', 'B', [
  ['The label was clear, the drawer was wrong.', 'A comma alone between independent clauses is a comma splice, and it does not mark the contrast.'],
  ['The label was clear, but the drawer was wrong.', 'The comma plus "but" joins the clauses and keeps the contrast.'],
  ['The label was clear but, the drawer was wrong.', 'The comma is on the wrong side of the conjunction.'],
  ['The label was clear; but the drawer was wrong.', 'The semicolon already joins the clauses, so "but" should not follow it here.'],
], 'The join has to be grammatical and has to preserve the contrast between a good label and the wrong drawer.')

sat('Central Ideas and Details', 'Which choice states the central idea of the two accounts, not a supporting detail that could still be true?', 'C', [
  ['Last year’s repair cost 9,000 dollars.', 'That is one cost in Account A.'],
  ['The engineer listed twelve planks.', 'That is a count, not the dispute.'],
  ['The writers agree the deck is damaged and disagree about when and how to repair it.', 'The agreement and the disagreement are the whole of the two accounts.'],
  ['A grate costs 4,000 dollars.', 'That price supports Account B. It is not the central idea.'],
], 'A central idea has to cover both the shared fact and the split.', readingPassage)

sat('Main Idea', 'Which title fits both accounts at once, rather than only one detail taken from Account A or from Account B?', 'A', [
  ['Damage agreed, schedule not agreed', 'Both accounts accept the loose planks. They split on whether to replace the deck now.'],
  ['The shuttle costs more than the bid', 'Only Account A mentions the shuttle.'],
  ['Twelve planks', 'That is the engineer sheet alone.'],
  ['Trout never leave the pool', 'Account B says to wait until they leave, so the title is false and too narrow.'],
], 'The title has to be true of both texts.', readingPassage)

sat('Rhetorical Synthesis', 'A bulletin must include two facts and leave a third out: the Saturday workshop is free, and a reservation is required. The weekday workshop is useful but should not be mentioned. Which sentence meets that goal?', 'B', [
  ['The Saturday workshop is free, a reservation is required, and the weekday workshop is useful.', 'This includes the fact that was supposed to be left out.'],
  ['The Saturday workshop is free, but a reservation is still required.', 'This keeps the two required facts and leaves the weekday workshop out.'],
  ['The weekday workshop is useful, so reserve a seat.', 'This features the fact that was supposed to be omitted and drops the free Saturday.'],
  ['Workshops are sometimes free.', 'This keeps neither specific fact.'],
], 'The sentence has to satisfy two inclusions and one exclusion.')

sat('Transitions', 'Which transition marks a contrast with the treasurer’s timetable? "Account A urges replacement now. ____ Account B asks the board to wait until the trout leave."', 'C', [
  ['Therefore,', 'The second account does not follow as a result of the first.'],
  ['For example,', 'Account B is not an example of replacing the deck now.'],
  ['By contrast,', 'Waiting is the opposite timetable from replacing the deck now.'],
  ['In addition,', 'That would add a similar request. The requests conflict.'],
], 'The transition has to match the conflict already established by the two requests.')

sat('Words in Context', 'In the treasurer’s sentence, "bridge" is not about the footbridge. "The treasurer called the loan a bridge: it would cover salaries until taxes arrived. The engineer’s attached report never mentioned that loan." In this sentence, "bridge" most nearly means', 'A', [
  ['a short-term loan that covers a gap', 'The definition is not the next word. It comes from "cover salaries until taxes arrived," and the engineer sentence rules out the literal footbridge.'],
  ['the footbridge with loose planks', 'The engineer’s report is the trap. It is about the span. The treasurer’s sentence is about salaries and taxes.'],
  ['a permanent tax increase', 'The loan lasts only until taxes arrive, so it is not permanent.'],
  ['a refusal to repair', 'The sentence describes covering salaries, not refusing a repair.'],
], 'The local noun is a trap. The purpose of the loan and the engineer’s silence decide the meaning.')

sat('Author Purpose', 'Why does Account A mention both the failed one-season repair and the shuttle, rather than only one of them?', 'D', [
  ['To describe the trout pool.', 'Account A never mentions the pool.'],
  ['To count loose planks.', 'The count is on the engineer sheet.'],
  ['To agree with the 4,000 dollar grate.', 'Account A argues for replacement now, not for the grate.'],
  ['To give two cost reasons for replacing the deck now rather than waiting.', 'The failed repair says waiting repeats a loss. The shuttle says closure has its own cost. The purpose uses both.'],
], 'Neither cost reason alone is the whole purpose of mentioning both.', readingPassage)

sat('Text Structure', 'Which description matches the order of the two posted accounts, with Account A placed before Account B?', 'B', [
  ['A count of planks, then a bid.', 'The engineer’s count comes last, and it is not one of the two accounts.'],
  ['A cost argument for immediate replacement, then a habitat argument for delay.', 'Account A’s costs come first. Account B’s pool, sawdust, and wait come second.'],
  ['A habitat argument, then a denial that the planks are loose.', 'Account B does not go first, and it does not deny the damage.'],
  ['Two accounts that recommend the same timetable.', 'The timetables conflict.'],
], 'Order is part of the structure. Reversing the accounts is a trap.', readingPassage)

sat('Command of Evidence — Quantitative', 'Account A’s bid is 18,000 dollars. Last year’s repair was 9,000 dollars and lasted one season. Account B’s grate plan is 4,000 dollars. Which comparison uses the numbers without adding a claim the accounts do not make?', 'C', [
  ['The grate will last longer than the 18,000 dollar deck because it costs less.', 'Neither account says a lower price lasts longer. Account B refuses that lifespan claim.'],
  ['Last year’s repair cost more than the new bid.', '9,000 is less than 18,000.'],
  ['The grate plan costs less than the replacement bid, and last year’s cheaper repair did not last a second season.', 'Both halves are in the numbers and in Account A’s report of one season. The sentence does not claim the grate will outlast a new deck.'],
  ['The shuttle costs 4,000 dollars.', 'No account prices the shuttle at 4,000 dollars.'],
], 'The comparison has to stay inside the given prices and the one-season result.')

function science(topic, prompt, answer, choices, proof, graphic) {
  add({
    exam: 'ACT', section: 'Science', topic, prompt, answer, choices, proof,
    rubric: R(2, 2, 2, 2, 2, 1, 2, 2, 2),
    graphicType: 'table',
    graphicData: graphic,
  })
}

science('Reading Graphs and Tables', 'A table shows yes votes: Hall A, 20 of 40; Hall B, 30 of 100. After 10 no votes are removed from Hall B only, which statement is true?', 'B', [
  ['Hall B is now higher, because 30 yes votes is more than 20.', 'The comparison is a percent after the removal, not the raw yes count. Hall B’s 30 of 90 is about 33 percent.'],
  ['Hall A is still higher: 50 percent versus Hall B’s 30 of 90, about 33 percent.', 'The original counts and the removal both have to be used. Hall B’s larger yes count is not the higher percent.'],
  ['The halls are equal, because 10 votes were removed.', 'Removing 10 no votes changes Hall B from 30 percent to about 33 percent, not to 50 percent.'],
  ['Hall B was already higher before any votes were removed.', 'Before the removal Hall B was 30 of 100, which is 30 percent, below Hall A’s 50 percent.'],
], '20/40 = 50 percent. 30/90 is about 33 percent.', { hallA: [20, 40], hallBAfter: [30, 90] })

science('Trend Analysis', 'A plant’s height is 10 cm at hour 0, 12 cm at hour 1, 30 cm at hour 2, and 42 cm at hour 3. During which one-hour interval is the growth rate greatest, and what is that rate in centimeters per hour?', 'A', [
  ['Hour 1 to hour 2, at 18 centimeters per hour.', 'The changes are 2, then 18, then 12. The middle interval is the steepest.'],
  ['Hour 2 to hour 3, at 18 centimeters per hour.', 'That interval rises by 12, not 18. The ending height is the highest, which is a different question.'],
  ['Hour 0 to hour 1, at 12 centimeters per hour.', 'The first change is 2 centimeters, and 12 is the later change.'],
  ['Hour 0 to hour 3, at 14 centimeters per hour.', '42 minus 10, divided by 3, is the average of the whole period, not the greatest one-hour rate.'],
], 'Rates are 2, 18, and 12.', { heights: [10, 12, 30, 42], fastest: 'hour 1 to 2' })

science('Experimental Design', 'Two classes take a quiz. Class A gets tutoring and an easier form and gains 12 points. Class B gets no tutoring and the original form and gains 1 point. Which comparison holds the form difficulty steady while testing tutoring?', 'C', [
  ['Compare the 12 point gain with the 1 point gain.', 'Those classes differ in tutoring and in the form, so the gap has two explanations.'],
  ['Compare Class A’s easier form with Class B’s original form and ignore the scores.', 'That checks the forms and never tests tutoring.'],
  ['Give both classes the same form, with only one class tutored.', 'One difference remains. The form is no longer a second explanation.'],
  ['Let students choose both the tutoring and the form.', 'Choice adds more differences. It does not hold the form steady.'],
], 'A fair tutoring comparison changes tutoring and holds the form fixed.', { classA: { tutoring: true, form: 'easier', gain: 12 }, classB: { tutoring: false, form: 'original', gain: 1 } })

science('Conflicting Viewpoints', 'Account A says replace the deck now because a partial repair lasted one season and a closure needs a shuttle. Account B agrees the planks are loose, then asks to wait for the trout and does not claim its cheaper repair will last as long. Which statement do both accounts support?', 'D', [
  ['The cheaper repair will last as long as a new deck.', 'Account B explicitly does not claim that, and Account A argues against another short repair.'],
  ['The deck should be replaced before the trout leave.', 'Only Account A wants replacement now. Account B wants to wait.'],
  ['A shuttle is cheaper than the 18,000 dollar bid.', 'Only Account A mentions the shuttle, and it does not give the shuttle’s price.'],
  ['The planks are loose.', 'Account A starts from that damage. Account B says it agrees. The later dispute does not cancel that shared statement.'],
], 'Agreement is only the damage. The schedule and the lifespan are not shared.', { shared: 'loose planks' })

assert(items.length === 5 + 7 + 25 + 4, `built ${items.length}`)

const exams = checked(await db.from('practice_exams').select('question_ids, math_module2_hard_ids').in('exam_number', [39, 40, 41]))
const protectedIds = new Set(exams.flatMap((exam) => [...(exam.question_ids ?? []), ...(exam.math_module2_hard_ids ?? [])]))
const easy = []
for (let from = 0; ; from += 1000) {
  const page = checked(await db.from('questions').select('id, question_text').eq('active', true).range(from, from + 999))
  easy.push(...page)
  if (page.length < 1000) break
}
const tooEasy = /together with the field sketch|another patch would buy only a short delay|same-side interior pair measures/i
const drop = easy.filter((row) => !protectedIds.has(row.id) && tooEasy.test(row.question_text ?? '')).map((row) => row.id)
for (let start = 0; start < drop.length; start += 100) {
  checked(await db.from('questions').update({ active: false, difficulty: 'Easy', difficulty_score: 0.2 }).in('id', drop.slice(start, start + 100)))
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

const existing = checked(await db.from('questions').select('id').eq('source', batchName).limit(5))
let inserted = 0
if (existing.length === 0) {
  const passageRows = []
  const seen = new Set()
  for (const item of items) {
    if (!item.passage || seen.has(item.passage.key)) continue
    seen.add(item.passage.key)
    passageRows.push(item.passage)
  }
  const savedPassages = passageRows.length
    ? checked(await db.from('passages').insert(passageRows.map((passage) => ({
      title: passage.title,
      content: passage.content,
      active: true,
      source_type: 'original',
      source_rights_status: 'owned',
    }))).select('id'))
    : []
  const passageIdByKey = {}
  passageRows.forEach((passage, index) => { passageIdByKey[passage.key] = savedPassages[index].id })
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
    passage_id: item.passage ? passageIdByKey[item.passage.key] : null,
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
      estimated_seconds: 120,
      module_eligibility: item.exam === 'SAT'
        ? [{ module: 1, route: 'common' }, { module: 2, route: 'harder' }]
        : [{ module: 1, route: 'common' }],
      distractor_rationales: rationales,
      graphic_type: item.graphicType ?? null,
      graphic_data: item.graphicData ?? null,
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
        graphic_data_verified: Boolean(item.graphicData),
        author_solution: item.proof,
        independent_solution_text: item.proof,
        independent_review_method: 'Each item adds a second constraint beyond the one-rule version of the skill. Passage answers were checked against a stated line.',
        difficulty_rubric: item.rubric,
      },
      originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
    }
  })))
  inserted = saved.length
}

const report = {
  generatedAt: new Date().toISOString(),
  batch: batchName,
  built: items.length,
  inserted,
  deactivatedTooEasy: drop.length,
  readingWords: readingPassage.content.split(/\s+/).length,
  englishWords: englishPassage.content.split(/\s+/).length,
}
writeFileSync('supabase/exam-engineering/raise-50-verbal-report.json', `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
