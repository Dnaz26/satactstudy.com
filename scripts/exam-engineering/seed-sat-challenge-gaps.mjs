import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Challenge Skill Gaps v1'
const items = [
  {
    topic: 'Central Ideas and Details', domain: 'Information and Ideas', skill: 'Central Ideas and Details',
    passage: 'When conservators compared the pigments in a coastal city’s sixteenth-century maps, they expected to find expensive imported blue throughout the collection. Instead, maps commissioned during a period of disrupted shipping used a locally produced green in places where earlier maps used blue. The color change did not track differences in the cartographers’ training or the maps’ intended audiences. Shipping records from the same years describe repeated delays in imported mineral supplies, suggesting that the maps preserve evidence of a practical response to a trade interruption.',
    prompt: 'Which choice best states the main idea of the text?',
    choices: { A: 'The city’s cartographers adopted green because map audiences preferred it to imported blue.', B: 'The maps’ pigment changes likely reflect an interrupted supply of imported materials.', C: 'Shipping records are more reliable than maps for studying sixteenth-century trade.', D: 'The city stopped producing maps when imported blue became unavailable.' }, answer: 'B',
    explanation: 'The shift to local green coincided with documented delays in imported minerals, while training and audience changes do not explain it. A invents a preference; C makes an unsupported comparison; D contradicts the continued map production.',
    distractors: { A: 'Invents an audience preference ruled out by the passage.', C: 'Overstates a comparison the passage never makes.', D: 'Contradicts the maps made with local pigment.' },
  },
  {
    topic: 'Command of Evidence — Textual', domain: 'Information and Ideas', skill: 'Command of Evidence — Textual',
    passage: 'A historian studying a nineteenth-century concert hall argues that its managers valued acoustic consistency more than the visual uniformity of the auditorium. Surviving plans show that some proposed changes to the seating would have made the room more symmetrical. The historian seeks a document that would most directly establish why the managers rejected those changes.',
    prompt: 'Which finding would most directly support the historian’s argument?',
    choices: { A: 'A ticket ledger shows that concerts with sold-out audiences occurred before and after the proposed changes.', B: 'A painter’s sketch depicts the auditorium as symmetrical, although the drawing predates the proposals.', C: 'Meeting minutes state that the symmetrical plan was rejected because tests showed it would create an audible echo.', D: 'A contractor’s invoice lists the cost of repainting the original seats after the proposals were rejected.' }, answer: 'C',
    explanation: 'C directly connects rejecting symmetry to sound quality. A concerns attendance, B predates the decision, and D concerns maintenance after the decision.',
    distractors: { A: 'Attendance does not explain the managers’ decision.', B: 'A sketch made earlier cannot document why a later plan was rejected.', D: 'Repainting costs do not establish the acoustic reason.' },
  },
  {
    topic: 'Command of Evidence — Quantitative', domain: 'Information and Ideas', skill: 'Command of Evidence — Quantitative',
    passage: 'Ecologists restored two wetland plots with native reeds and left two comparable plots untreated. They counted dragonfly species before and one year after the intervention. The counts were: planted plot A, 8 then 22; planted plot B, 14 then 27; untreated plot C, 10 then 13; untreated plot D, 12 then 15. The researchers claim that the pattern is consistent with planting contributing to an increase in species richness, even though the plots began with different counts.',
    prompt: 'Which choice best uses the data to support the researchers’ claim?',
    choices: { A: 'The planted plots ended with different counts, so their gains cannot be compared.', B: 'Plot B began with more species than plot C and also ended with more species.', C: 'Both untreated plots gained three species, whereas the planted plots gained thirteen and fourteen species.', D: 'The four plots had a combined total of forty-four species before the intervention.' }, answer: 'C',
    explanation: 'Comparing change rather than final count accounts for the different starting values: planted plots gained 14 and 13, untreated plots 3 each. A rejects a valid comparison; B uses final counts without change; D combines baselines and does not address the intervention.',
    distractors: { A: 'Different final counts do not prevent comparison of gains.', B: 'Comparing final counts does not control for starting levels.', D: 'The total before planting says nothing about differential change.' },
  },
  {
    topic: 'Inferences', domain: 'Information and Ideas', skill: 'Inferences',
    passage: 'Archaeologists found copper coins in three caches separated by hundreds of kilometers. The coins bear different rulers’ marks, but tests detected an unusually similar combination of trace metals in all three groups. The researchers caution that those marks identify where coins were stamped, not necessarily where the copper was mined. They have no records showing direct exchange among the three stamping sites.',
    prompt: 'Which conclusion is most reasonably supported by the text?',
    choices: { A: 'The rulers’ marks were added at a single stamping site before the coins were distributed.', B: 'Each stamping site mined its own copper from a deposit with the same trace composition.', C: 'The three sites must have exchanged finished coins directly with one another.', D: 'At least some coins from different caches may have been made from copper supplied by a common source.' }, answer: 'D',
    explanation: 'The matching trace-metal pattern is consistent with a shared copper supply despite different stamping marks. A conflicts with the distinct marks, while B and C claim specific production or exchange arrangements unsupported by records.',
    distractors: { A: 'Different rulers’ marks do not support one stamping site.', B: 'Separate mines with identical composition are possible but not established.', C: 'The passage explicitly lacks evidence for direct exchange.' },
  },
  {
    topic: 'Text Structure and Purpose', domain: 'Craft and Structure', skill: 'Text Structure and Purpose',
    passage: 'A sequence of narrow tree rings in a mountain forest was long attributed to drought. Yet nearby lake sediments show no corresponding drop in water level during those years. More recently, researchers measured chemical signatures in the rings that are associated with unusually cool growing seasons and found the same pattern in trees from wetter valleys. The researchers now think a regional cooling event, rather than a local shortage of water, better explains the narrow rings.',
    prompt: 'What is the main function of the discussion of chemical signatures?',
    choices: { A: 'It provides evidence for revising an earlier explanation of the narrow rings.', B: 'It establishes that lake sediments cannot preserve evidence of drought.', C: 'It shows that trees in wetter valleys produced wider rings than mountain trees.', D: 'It explains why the original researchers had access to fewer instruments.' }, answer: 'A',
    explanation: 'The signatures support cool growing seasons across locations and therefore help replace the drought explanation. B, C, and D introduce claims the passage does not make.',
    distractors: { B: 'The text uses lake sediments as evidence rather than discrediting them.', C: 'The text reports a similar pattern, not a ring-width ranking.', D: 'No instrument history is given.' },
  },
  {
    topic: 'Cross-Text Connections', domain: 'Craft and Structure', skill: 'Cross-Text Connections',
    passage: 'Text 1: Archaeologist Lema argues that the mixture of pottery styles recovered near an ancient harbor is strong evidence that merchants from several regions met there. Many vessels were found in the same deposit, and their designs differ sharply from locally made wares.\n\nText 2: Archaeologist Varo notes that changing currents can move broken vessels from separate shoreline settlements into one harbor deposit. Varo agrees that the recovered pottery came from several regions but says its location alone cannot establish that merchants met at that harbor.',
    prompt: 'How would Varo in Text 2 most likely respond to Lema’s conclusion in Text 1?',
    choices: { A: 'By disputing that the pottery came from several regions at all.', B: 'By arguing that different pottery styles alone cannot prove that regional merchants met at the harbor.', C: 'By agreeing that a shared deposit demonstrates direct exchange among the vessels’ makers.', D: 'By claiming that local potters intentionally copied every imported design.' }, answer: 'B',
    explanation: 'Varo accepts the varied origins but supplies a current-driven explanation for the shared deposit, so the meeting inference is not established. A denies an explicit agreement; C reverses Varo’s position; D is not discussed.',
    distractors: { A: 'Varo explicitly accepts that the pottery came from several regions.', C: 'Varo challenges that inference from location.', D: 'Imitation by local potters is never proposed.' },
  },
  {
    topic: 'Form, Structure, and Sense', domain: 'Standard English Conventions', skill: 'Form, Structure, and Sense',
    passage: 'Two analyses of isotope ratios in ancient shells—each conducted by a different laboratory—_____ that the animals experienced a brief change in water temperature. The agreement between the analyses makes a laboratory error less likely.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: { A: 'indicates', B: 'indicate', C: 'indicating', D: 'to indicate' }, answer: 'B',
    explanation: 'The subject is the plural noun “analyses”; the interrupting phrase does not change its number, so the finite plural verb “indicate” is required. A is singular, and C and D leave the first sentence without a finite main verb.',
    distractors: { A: 'Agrees with the singular phrase laboratory rather than plural subject analyses.', C: 'A participle cannot serve as the main finite verb here.', D: 'An infinitive cannot serve as the main finite verb here.' },
  },
  {
    topic: 'Boundaries', domain: 'Standard English Conventions', skill: 'Boundaries',
    passage: 'The site’s earliest maps suggest that the canal ran in a straight _____ recent sediment cores, however, reveal a bend beneath the modern road. The cores explain why several foundations near that road rest on unusually deep fill.',
    prompt: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: { A: 'line,', B: 'line;', C: 'line', D: 'line, however,' }, answer: 'B',
    explanation: 'The clauses before and after the blank can each stand alone, and “however” marks a contrast within the second clause. A creates a comma splice; C fuses the clauses; D creates a comma splice and repeats “however.”',
    distractors: { A: 'A comma alone cannot join two independent clauses.', C: 'No boundary joins the clauses.', D: 'Repeats however and leaves a comma splice.' },
  },
]

const existing = checked(await db.from('questions').select('id, topic_name').eq('exam_name', BATCH))
const existingByTopic = new Map(existing.map((row) => [row.topic_name, row.id]))
const topics = checked(await db.from('topics').select('id, name, categories(name, sections(name, tests(name)))'))
const selectedTopics = items.map((item) => {
  const matches = topics.filter((topic) => topic.name === item.topic && topic.categories?.name === item.domain && topic.categories?.sections?.tests?.name === 'SAT')
  if (matches.length !== 1) throw new Error(`Expected one SAT topic for ${item.topic}, found ${matches.length}`)
  return matches[0]
})

for (const item of items) {
  const choices = Object.values(item.choices)
  if (new Set(choices.map((choice) => choice.toLowerCase())).size !== 4 || !item.choices[item.answer]) throw new Error(`Invalid choices for ${item.topic}`)
  if (item.passage.trim().split(/\s+/).length < 25) throw new Error(`Short stimulus for ${item.topic}`)
}

const reviewer = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 2200,
    messages: [
      { role: 'system', content: 'Independently answer each ORIGINAL SAT reading/writing item. You do not know its proposed answer. Reject ambiguity and missing information. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: item.passage, prompt: item.prompt, choices: item.choices }))) },
    ] }),
})
if (!reviewer.ok) throw new Error(`Independent review HTTP ${reviewer.status}`)
const answerText = (await reviewer.json()).choices?.[0]?.message?.content
const reviews = JSON.parse(answerText ?? '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length) throw new Error('Incomplete independent review')
for (let index = 0; index < items.length; index++) {
  const result = reviews.find((review) => review.index === index)
  if (!result?.valid || result.answer !== items[index].answer) throw new Error(`Review rejected ${items[index].topic}: ${result?.reason ?? 'missing review'}`)
}

for (let index = 0; index < items.length; index++) {
  const item = items[index]
  const topic = selectedTopics[index]
  const contentHash = createHash('sha256').update(`${item.passage}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex')
  let questionId = existingByTopic.get(item.topic)
  if (!questionId) {
  const { data: passage, error: passageError } = await db.from('passages').insert({
    title: `${BATCH}: ${item.topic}`,
    author: 'PrepSAT/ACT original editorial material',
    content: item.passage,
    source_type: 'original',
    source_rights_status: 'owned',
    active: true,
  }).select('id').single()
  if (passageError) throw passageError
  const { data: question, error: questionError } = await db.from('questions').insert({
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: item.domain,
    topic_name: item.topic, subtopic_name: item.skill, topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: 0.85,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices.A, choice_b: item.choices.B, choice_c: item.choices.C, choice_d: item.choices.D,
    correct_answer: item.answer, official_explanation: item.explanation,
    passage_id: passage.id, source_type: 'original', source_rights_status: 'owned',
    source: BATCH, exam_name: BATCH, fingerprint: contentHash,
    answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
  }).select('id').single()
  if (questionError) throw questionError
  questionId = question.id
  }
  const { count: metadataCount } = await db.from('exam_item_metadata')
    .select('question_id', { count: 'exact', head: true }).eq('question_id', questionId)
  if (metadataCount) continue
  checked(await db.from('exam_item_metadata').insert({
    question_id: questionId, version: 1, exam_type: 'SAT', section: 'Reading and Writing',
    domain: item.domain, skill: item.skill, subskill: item.skill,
    difficulty_level: 6, difficulty_basis: 'editorial',
    module_eligibility: [{ module: 2, route: 'hard' }], estimated_seconds: 80,
    distractor_rationales: item.distractors, contextual: true,
    validation_status: 'pending', content_hash: contentHash,
    validation_evidence: { independent_model_answer: reviews[index].answer, independent_model_reason: reviews[index].reason, four_unique_choices: true, mathematical_or_textual_self_review: true },
    originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
  }).select('question_id'))
}
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH).eq('active', true).eq('approved', true)
if (count !== items.length) throw new Error(`Readback count ${count} did not match ${items.length}`)
console.log(JSON.stringify({ batch: BATCH, inserted: count, independentModelReviews: reviews.length, metadataStatus: 'pending' }))
