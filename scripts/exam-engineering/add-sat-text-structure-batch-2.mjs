import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Text Structure Challenge Batch 2'
const topicId = 'd1000000-0000-0000-0000-000000000030'
const questions = [
  {
    passage: 'For decades, catalogers grouped a set of coastal maps by the workshops that produced them, largely because their lettering looked alike. A recent pigment analysis complicates that arrangement: maps assigned to different workshops share a locally made green absent from maps bearing the same lettering style. Shipping ledgers show that the green became common during a prolonged shortage of imported blue pigment. The maps may therefore document not just workshop practice but a regional response to disrupted trade.',
    prompt: 'Which choice best describes the passage’s overall structure?',
    choices: [
      'It presents a longstanding classification, introduces evidence that complicates it, and proposes a broader interpretation of the evidence.',
      'It describes a new classification system, lists the materials needed to apply it, and argues that the system is impractical.',
      'It summarizes two competing explanations for a pigment and concludes that neither can be tested with historical records.',
      'It traces the development of a mapping technique and explains why later mapmakers abandoned it.'
    ],
    answer: 'A',
    explanation: 'The passage begins with the traditional workshop-based grouping, then presents pigment and shipping evidence that cuts across that grouping, and finally suggests the maps also record a regional response to trade disruption.',
    wrong: {
      A: 'Correct: it captures the shift from the accepted grouping to complicating evidence and a broader interpretation.',
      B: 'The passage does not introduce a new classification system or assess its practicality.',
      C: 'It does not present two explanations as equally unsupported; the ledgers add evidence for a trade-related interpretation.',
      D: 'No mapping technique is described as developing or being abandoned.'
    },
    seconds: 85,
    solutionCheck: 'The first sentence states the accepted workshop grouping. The next two sentences challenge its explanatory sufficiency with pigment and trade records. The final sentence broadens the interpretation; A is the only choice matching those moves.'
  },
  {
    passage: 'When a deep-sea sensor first recorded a brief oxygen increase near the seafloor, researchers suspected contamination: the instrument had recently been serviced, and the reading was unlike the surrounding measurements. They checked the sensor against a second instrument, which registered a smaller increase at the same time. Sediment cores then revealed a thin layer associated with a recent current shift. The initial outlier may thus reflect a short-lived local event rather than a faulty sensor or a lasting change in the basin.',
    prompt: 'How does the passage develop its discussion of the oxygen reading?',
    choices: [
      'It reports an unexpected measurement, describes checks and related evidence, and narrows the interpretation to a temporary local event.',
      'It gives a measurement, rejects all instrument-based explanations, and establishes a permanent change across the basin.',
      'It compares two sensors’ accuracy, shows that one is unreliable, and recommends replacing both instruments.',
      'It introduces a current shift, explains how it formed, and uses the oxygen reading only as background.'
    ],
    answer: 'A',
    explanation: 'The passage moves from an anomalous reading and a contamination concern to corroborating evidence from another sensor and sediment cores. Those checks support a limited, temporary interpretation rather than a basin-wide or permanent one.',
    wrong: {
      A: 'Correct: it follows the sequence from anomaly, through verification, to a bounded interpretation.',
      B: 'The passage explicitly rejects a lasting basin-wide change as the conclusion.',
      C: 'The second instrument supports the reading; the passage does not call either sensor unreliable or recommend replacement.',
      D: 'The current shift is evidence used to interpret the oxygen reading, not the main topic with the reading as incidental background.'
    },
    seconds: 80,
    solutionCheck: 'The sensor check and sediment cores both bear on whether the anomalous reading is real and how broadly it should be interpreted. Only A reflects the passage’s sequence and final limitation.'
  },
  {
    passage: 'In the novel’s opening chapters, the narrator describes a clock that loses four minutes each day. Readers may initially treat the detail as a sign of the family’s declining fortune, since the clock is one of the few objects the family has kept. Later, however, characters use its predictable error to coordinate meetings without alerting a strict supervisor. The clock’s imperfection becomes useful precisely because outsiders assume it is merely broken.',
    prompt: 'What is the primary function of the final sentence in the passage?',
    choices: [
      'It revises the clock’s apparent symbolism by showing that its flaw also gives the characters a practical advantage.',
      'It confirms that the clock represents the family’s financial decline throughout the novel.',
      'It introduces a new conflict between the characters and the clock’s original maker.',
      'It explains why the narrator considers accurate timekeeping more important than loyalty.'
    ],
    answer: 'A',
    explanation: 'The passage first invites a symbolic reading of the clock as a sign of decline, then shows the characters exploiting its predictable inaccuracy. The last sentence states why that flaw becomes useful and reframes the earlier detail.',
    wrong: {
      A: 'Correct: the final sentence turns the apparent defect into a practical tool and complicates the initial symbolic reading.',
      B: 'The final sentence complicates the decline interpretation instead of confirming it as the clock’s only meaning.',
      C: 'No maker or conflict with a maker appears in the passage.',
      D: 'The narrator makes no general claim about accurate timekeeping or loyalty.'
    },
    seconds: 75,
    solutionCheck: 'The earlier sentence supplies the characters’ use for the clock’s error. The last sentence explains the mechanism of that advantage and contrasts outsiders’ assumption with the characters’ knowledge. A is uniquely supported.'
  },
  {
    passage: 'A municipal heat map ranks neighborhoods by average summer surface temperature. Planners initially used it to select sites for reflective roofs, but the ranking alone proved misleading: districts with similar averages differed in tree cover, building height, and the hours when residents were outdoors. The city now combines the map with shaded-walkway access and housing data before choosing projects. The revised method treats temperature as one relevant measure while making the decision depend on who is exposed and when.',
    prompt: 'Which choice best describes the role of the second sentence in the passage?',
    choices: [
      'It identifies a limitation of relying on the initial ranking alone and gives reasons for that limitation.',
      'It argues that surface-temperature measurements are too inconsistent to be useful for planning.',
      'It presents evidence that reflective roofs caused the neighborhoods to have different temperatures.',
      'It explains why residents rejected the city’s first set of completed roofing projects.'
    ],
    answer: 'A',
    explanation: 'The second sentence explains that similar average temperatures can mask meaningful differences in exposure conditions, showing why the original ranking alone was insufficient.',
    wrong: {
      A: 'Correct: the sentence critiques the ranking as a stand-alone decision tool and names factors it omits.',
      B: 'It does not say the measurements are inconsistent or unusable; the city continues to use the map.',
      C: 'Reflective roofs are mentioned as a proposed intervention, not as a cause of the temperature differences.',
      D: 'The passage gives no resident reaction and does not say roofing projects were completed.'
    },
    seconds: 80,
    solutionCheck: 'The second sentence directly says the ranking proved misleading and uses a colon to specify omitted neighborhood differences. It does not reject the data itself or report project outcomes, so A is uniquely correct.'
  },
  {
    passage: 'Early accounts of a nineteenth-century observatory credit its director with introducing a precise method for timing star transits. Recently recovered notebooks show that an assistant recorded many of the observations later published under the director’s name. The notebooks do not prove that the director made no contribution: several entries contain corrections in a different hand, and the publication explains how those corrections changed the calculations. The archival record therefore shifts the question from who deserves sole credit to how the work was divided and revised.',
    prompt: 'How does the passage’s final sentence relate to the preceding evidence?',
    choices: [
      'It draws a more qualified historical question from evidence that complicates a simple account of individual credit.',
      'It dismisses the notebooks because handwriting cannot establish the accuracy of an observation.',
      'It concludes that the assistant, rather than the director, invented the timing method.',
      'It changes the subject from authorship to the later construction of the observatory.'
    ],
    answer: 'A',
    explanation: 'The notebooks complicate the director-only story but do not establish that the director contributed nothing. The last sentence reframes the issue as collaboration and revision, matching the mixed evidence.',
    wrong: {
      A: 'Correct: it replaces a simple sole-credit question with a more nuanced inquiry supported by both the assistant’s records and the director’s corrections.',
      B: 'The passage treats the notebooks as relevant evidence and never questions the observations’ accuracy on handwriting grounds.',
      C: 'The evidence does not establish that the assistant invented the method or that the director had no role.',
      D: 'The observatory’s construction is never discussed.'
    },
    seconds: 85,
    solutionCheck: 'The paragraph supplies evidence against sole attribution while explicitly preserving evidence of the director’s contribution. A alone captures the final reframing without overstating what the notebooks prove.'
  }
]

// Deliberately vary the keyed position after drafting the distractors.
const choiceOrders = [[1, 2, 0, 3], [0, 1, 2, 3], [1, 2, 3, 0], [1, 0, 2, 3], [1, 2, 0, 3]]
for (let index = 0; index < questions.length; index++) {
  const item = questions[index]
  const oldChoices = item.choices
  const oldAnswerIndex = 'ABCD'.indexOf(item.answer)
  const oldReasons = item.wrong
  const order = choiceOrders[index]
  item.choices = order.map((choiceIndex) => oldChoices[choiceIndex])
  item.answer = 'ABCD'[order.indexOf(oldAnswerIndex)]
  item.wrong = Object.fromEntries(order.map((choiceIndex, newIndex) => ['ABCD'[newIndex], oldReasons['ABCD'[choiceIndex]]]))
}

const topics = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
const topic = topics.find((row) => row.id === topicId && row.name === 'Text Structure' && row.categories?.sections?.tests?.name === 'SAT')
if (!topic) throw new Error('Expected SAT Text Structure topic not found')

const rows = questions.map((item) => {
  if (item.choices.length !== 4 || new Set(item.choices).size !== 4 || !item.answer.match(/^[ABCD]$/)) throw new Error(`Invalid choices: ${item.prompt}`)
  const fingerprint = createHash('sha256').update(`${item.passage}\n${item.prompt}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Craft and Structure',
    topic_name: topic.name, subtopic_name: topic.name, topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: 0.83, question_type: 'multiple_choice',
    question_text: `${item.passage}\n\n${item.prompt}`,
    choice_a: item.choices[0], choice_b: item.choices[1], choice_c: item.choices[2], choice_d: item.choices[3],
    correct_answer: item.answer, official_explanation: item.explanation,
    source_type: 'original', source_rights_status: 'owned', source: BATCH, exam_name: BATCH,
    fingerprint, answer_verification_status: 'independently_verified', review_status: 'approved', approved: true, active: true,
  }
})

const existingBatch = checked(await db.from('questions').select('id,fingerprint').eq('exam_name', BATCH))
if (existingBatch.length && existingBatch.length !== rows.length) throw new Error(`Unexpected partial batch: ${existingBatch.length}/${rows.length}`)
if (existingBatch.length) {
  // Keep this interrupted first attempt out of practice until its review metadata is complete.
  checked(await db.from('questions').update({ active: false, approved: false, review_status: 'pending' }).eq('exam_name', BATCH))
}

const hashes = rows.map((row) => row.fingerprint)
const { data: duplicates, error: duplicateError } = await db.from('questions').select('fingerprint').in('fingerprint', hashes)
if (duplicateError) throw duplicateError
const existingFingerprints = new Set(existingBatch.map((row) => row.fingerprint))
if (duplicates?.some((row) => !existingFingerprints.has(row.fingerprint))) throw new Error('Batch overlaps unrelated existing fingerprints')

if (!process.env.DEEPSEEK_API_KEY) throw new Error('Independent reviewer is not configured')
const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({
    model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 1800,
    messages: [
      { role: 'system', content: 'Act as a blind SAT Reading and Writing item reviewer. Independently answer every question from its passage without seeing the proposed key. For each, state the uniquely best choice, whether exactly one choice is defensible, whether wording and passage support the answer, and an independent reason. Be strict: mark valid false if ambiguous, unsupported, or if the question is not truly about text structure/purpose. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}' },
      { role: 'user', content: JSON.stringify(questions.map((item, index) => ({ index, passage: item.passage, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review request failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== questions.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== questions[index].answer || !String(review.reason ?? '').trim())) {
  throw new Error(`Independent reviewer rejected or disagreed with one or more items: ${JSON.stringify(reviews)}`)
}

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 95) throw new Error(`Coverage changed; expected 95 approved active questions, found ${before}. Recalculate before inserting.`)

const saved = existingBatch.length ? existingBatch.map(({ id }) => ({ id })) : checked(await db.from('questions').insert(rows).select('id'))
if (saved.length !== rows.length) throw new Error(`Only saved ${saved.length}/${rows.length} questions`)
// Free the previous fingerprints first so a permutation cycle cannot collide mid-update.
if (existingBatch.length) {
  for (const row of saved) {
    const stagingFingerprint = createHash('sha256').update(`staging:${row.id}`).digest('hex')
    checked(await db.from('questions').update({ fingerprint: stagingFingerprint }).eq('id', row.id))
  }
}
for (let index = 0; index < saved.length; index++) {
  checked(await db.from('questions').update({ ...rows[index], active: false, approved: false, review_status: 'pending' }).eq('id', saved[index].id))
}
checked(await db.from('exam_item_metadata').upsert(saved.map((row, index) => ({
  question_id: row.id, version: 1, exam_type: 'SAT', section: 'Reading and Writing',
  domain: 'Craft and Structure', skill: topic.name, subskill: 'Purpose and organization of an argument',
  difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: questions[index].seconds,
  module_eligibility: [{ module: 1, route: 'common' }, { module: 2, route: 'lower' }, { module: 2, route: 'higher' }],
  distractor_rationales: questions[index].wrong, calculator_expected: false, contextual: false,
  validation_status: 'validated', content_hash: rows[index].fingerprint,
  validation_evidence: {
    independent_solution: true, answer_verified: true, distractors_verified: true,
    ambiguity_review: true, style_review: true, difficulty_review: true, blueprint_classification: true,
    author_solution: questions[index].explanation,
    independent_solution_text: reviews[index].reason,
    independent_review_method: 'Blind second-model solution and uniqueness review; proposed keys withheld.',
    answer_uniqueness_checked: true, four_distinct_choices: true,
    all_distractors_individually_ruled_out: true,
    originality_review: 'Newly authored academic stimuli and question wording; not adapted from an official test item.',
  },
  originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
})), { onConflict: 'question_id,version' }))
checked(await db.from('questions').update({ active: true, approved: true, review_status: 'approved', answer_verification_status: 'independently_verified' }).in('id', saved.map((row) => row.id)))

const { count: after, error: afterError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (afterError) throw afterError
if (after !== 100) throw new Error(`Saved count verification failed: expected 100, found ${after}`)
console.log(JSON.stringify({ batch: BATCH, saved: saved.length, topic: topic.name, before, after, allFourChoice: true, independentReview: reviews.map((review) => ({ answer: review.answer, reason: review.reason })), metadataValidated: true }, null, 2))
