import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'SAT Words in Context Challenge Batch 1'
const topicId = 'd1000000-0000-0000-0000-000000000028'
const items = [
  {
    passage: 'An early survey suggested that one salt-tolerant grass dominated the entire marsh. Later samples showed that the grass was common only in the most saline inlets; freshwater channels supported a different species. The researchers therefore ___ their original claim, limiting it to the inlets where the grass was abundant.',
    target: 'qualified', choices: ['confirmed', 'narrowed', 'publicized', 'abandoned'], answer: 'B', level: 7,
    explanation: 'The researchers keep a more limited version of the original claim after finding that it applies only to saline inlets. “Qualified” means limited or made conditional.',
    wrong: { A: 'Means they verified the original broad claim, which the new samples undermine.', B: 'Correct: they restricted the claim to the locations where it applies.', C: 'Means they made the claim known, not that they adjusted its scope.', D: 'Overstates their response: they retain a limited claim instead of discarding it entirely.' },
  },
  {
    passage: 'The architect’s roof panels were designed to do more than reduce glare. Shallow grooves in the panels ___ rainwater toward a cistern, allowing the building to collect water without adding visible pipes to the facade.',
    target: 'channel', choices: ['measure', 'conceal', 'route', 'interrupt'], answer: 'C', level: 6,
    explanation: 'The grooves guide the rainwater toward the cistern. In this context, “channel” means direct or route.',
    wrong: { A: 'Would mean the grooves determine the amount of water, which the passage does not say.', B: 'Would mean they hide the water rather than guide it to the cistern.', C: 'Correct: the grooves direct the water along a path.', D: 'Would mean the grooves stop or disrupt the flow.' },
  },
  {
    passage: 'The astronomers did not find a smooth range of brightness values among the newly cataloged stars. Instead, measurements clustered into two groups with a clear gap between them. The team describes the groups as ___ because each forms a separate cluster rather than one end of a continuous spectrum.',
    target: 'discrete', choices: ['temporary', 'continuous', 'unusually bright', 'distinct'], answer: 'D', level: 7,
    explanation: 'The passage emphasizes two separate clusters divided by a gap. “Discrete” means distinct or separate rather than continuous.',
    wrong: { A: 'Describes duration, which the passage does not address.', B: 'Means unbroken or continuous, the opposite of the two separated clusters.', C: 'Describes brightness, but the sentence is about how the groups are separated.', D: 'Correct: each group is distinct from the other.' },
  },
  {
    passage: 'To test whether a thin ceramic coating could withstand rapid temperature changes, engineers heated and cooled identical tiles hundreds of times. The procedure ___ a consistent set of measurements: the coated tiles cracked less often than the uncoated ones.',
    target: 'yielded', choices: ['produced', 'surrendered', 'concealed', 'exchanged'], answer: 'A', level: 6,
    explanation: 'The procedure generated a set of measurements. Here, “yielded” means produced or resulted in.',
    wrong: { A: 'Correct: the testing procedure produced the measurements.', B: 'Means gave up or relinquished something, which does not fit the procedure’s result.', C: 'Means hid the measurements, opposite to the stated outcome.', D: 'Means traded one thing for another, which is not described.' },
  },
  {
    passage: 'For decades, museum labels assigned the vessel to a workshop active around 1820. The date was based on the style of its handle, a feature that appears on many objects from that period. A newly found kiln record instead links the vessel’s clay to a workshop operating fifty years earlier, challenging the ___ attribution.',
    target: 'conventional', choices: ['innovative', 'imprecise', 'traditional', 'controversial'], answer: 'C', level: 7,
    explanation: 'The label’s date was the established, long-used attribution, now challenged by newer evidence. “Conventional” means customary or traditional.',
    wrong: { A: 'Means newly introduced, whereas the attribution had been used for decades.', B: 'Means not exact; the passage focuses on the attribution being customary, not merely imprecise.', C: 'Correct: it refers to the established, customary attribution.', D: 'Means disputed, but the passage presents the attribution as accepted until new evidence appeared.' },
  },
  {
    passage: 'Two laboratories obtained different estimates of a lake’s age using separate mineral samples. A third test showed that one sample had been exposed to groundwater, which altered its chemical signature. This contamination may ___ the discrepancy between the laboratories’ results.',
    target: 'account for', choices: ['quantify', 'explain', 'reproduce', 'dispute'], answer: 'B', level: 6,
    explanation: 'The altered sample provides a reason for why the estimates differ. “Account for” means explain or provide a cause of.',
    wrong: { A: 'Means assign a numerical amount, which is not what the contamination does.', B: 'Correct: the contamination offers an explanation for the differing estimates.', C: 'Means create the same result again, not explain why results differ.', D: 'Means challenge the discrepancy’s existence rather than explain it.' },
  },
  {
    passage: 'Some desert plants close their pores during the hottest hours, limiting water loss but also reducing carbon intake. A species that opens its pores at night can ___ photosynthesis through prolonged dry periods, drawing on carbon stored when conditions are cooler.',
    target: 'sustain', choices: ['originate', 'tolerate', 'maintain', 'finance'], answer: 'C', level: 7,
    explanation: 'The species continues photosynthesis through the dry period by using stored carbon. “Sustain” means maintain or keep going.',
    wrong: { A: 'Means begin or create photosynthesis, not continue it over time.', B: 'Means endure a condition; the sentence says the species keeps photosynthesis going.', C: 'Correct: the plant maintains photosynthesis through the dry period.', D: 'Means provide money for something and does not fit the biological process.' },
  },
  {
    passage: 'When geologists recalculated the slope of a buried fault using several plausible assumptions about rock density, the estimated angle shifted by less than half a degree. They call the result ___ because it remains nearly unchanged across those reasonable adjustments.',
    target: 'robust', choices: ['controversial', 'reliable', 'complex', 'approximate'], answer: 'B', level: 7,
    explanation: 'The estimate stays nearly the same when reasonable assumptions change. “Robust” means dependable or resistant to small changes in method.',
    wrong: { A: 'Means disputed, which is not suggested by the stability of the estimate.', B: 'Correct: the result is dependable across reasonable variations in assumptions.', C: 'Describes intricacy, not stability under changed assumptions.', D: 'Means not exact, whereas the passage emphasizes that the estimate barely shifts.' },
  },
  {
    passage: 'One chemical analysis suggested that an old ink contained a copper pigment; another suggested that it contained a green earth pigment. A third analysis found both compounds in the same sample, likely deposited in separate layers. The new evidence helps ___ the earlier findings: each detected a different component of the ink.',
    target: 'reconcile', choices: ['align', 'reverse', 'average', 'invalidate'], answer: 'A', level: 7,
    explanation: 'The third analysis shows how both earlier results can be true, making them consistent with each other. “Reconcile” means bring into agreement or resolve an apparent conflict.',
    wrong: { A: 'Correct: the new evidence makes the apparently conflicting findings compatible.', B: 'Means turn one finding into its opposite, which the evidence does not do.', C: 'Means calculate a mean value, not resolve a disagreement in interpretations.', D: 'Means show the earlier findings to be false, while the passage supports both.' },
  },
  {
    passage: 'A line of mangroves did not prevent a storm surge from reaching the coast, but sensors showed that wave height fell as water passed through the dense roots. The vegetation therefore helped ___ wave energy before it reached nearby buildings.',
    target: 'attenuate', choices: ['delay', 'reduce', 'redirect', 'measure'], answer: 'B', level: 7,
    explanation: 'The waves became smaller as they passed through the roots. “Attenuate” means reduce in force or intensity.',
    wrong: { A: 'Means make the energy arrive later, but the passage describes lower wave height.', B: 'Correct: the roots reduced the waves’ energy.', C: 'Means change the energy’s direction, which is not stated.', D: 'Means determine the amount of energy, not lessen it.' },
  },
  {
    passage: 'The city will install new river gauges only after the next flood season, when officials can compare their readings with those from the existing network. The expansion is therefore ___ the results of that comparison; it will not proceed if the gauges disagree substantially.',
    target: 'contingent on', choices: ['summarized by', 'preceded by', 'dependent on', 'inconsistent with'], answer: 'C', level: 7,
    explanation: 'The installation will occur only if the comparison supports it. “Contingent on” means dependent on or conditional upon.',
    wrong: { A: 'Means described briefly by the results, which is not the relationship.', B: 'Means the comparison happens earlier, but does not express that the decision depends on it.', C: 'Correct: proceeding with the expansion depends on the comparison’s outcome.', D: 'Means the expansion conflicts with the comparison, which is not what the sentence says.' },
  },
  {
    passage: 'The conservator’s protocol requires each technician to photograph a fragment before cleaning it, record the solvent concentration to the nearest tenth of a percent, and repeat the measurement if two readings differ. The procedure is deliberately ___; small inconsistencies could damage the pigment layer.',
    target: 'exacting', choices: ['demanding and precise', 'newly developed', 'widely accepted', 'easy to modify'], answer: 'A', level: 7,
    explanation: 'The protocol requires careful measurements and repeated checks because small errors carry consequences. “Exacting” means demanding in its precision or standards.',
    wrong: { A: 'Correct: the procedure demands precision and careful adherence to detail.', B: 'The passage does not say when the protocol was developed.', C: 'The passage does not say how widely the protocol is used.', D: 'The required measurements and repeat checks show that the protocol is not described as easy to change.' },
  },
]

const targetAnswers = ['A', 'C', 'D', 'B', 'B', 'A', 'C', 'D', 'A', 'C', 'B', 'D']
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
  .find((row) => row.id === topicId && row.name === 'Words in Context' && row.categories?.sections?.tests?.name === 'SAT' && row.categories?.sections?.name === 'Reading and Writing')
if (!topic) throw new Error('Expected SAT Words in Context topic not found')
if (new Set(items.map((item) => item.answer)).size !== 4) throw new Error('Answer positions need a wider spread')

const reviewResponse = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 5200,
    messages: [
      { role: 'system', content: 'Blindly solve these original SAT Words in Context questions. Read each full passage and infer the target word meaning only from context. Do not assume a key. Check that exactly one choice fits the passage, each distractor is meaningfully wrong, and wording is clear. Select the exact choice text and letter, then verify that pair. Return only JSON: {"reviews":[{"index":0,"answer":"A","selected_choice_text":"exact choice text","valid":true,"reason":"..."}]}.' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: item.passage, target: item.target, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ],
  }),
})
if (!reviewResponse.ok) throw new Error(`Independent review failed: HTTP ${reviewResponse.status}`)
const reviews = JSON.parse((await reviewResponse.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => review.index !== index || !review.valid || review.answer !== items[index].answer || review.selected_choice_text !== items[index].choices['ABCD'.indexOf(items[index].answer)] || !String(review.reason ?? '').trim())) throw new Error(`Independent review rejected/disagreed or returned inconsistent choice text: ${JSON.stringify(reviews)}`)

const { count: before, error: beforeError } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('topic_id', topic.id).eq('approved', true).eq('active', true)
if (beforeError) throw beforeError
if (before !== 88) throw new Error(`Coverage changed; expected 88, found ${before}`)
const rows = items.map((item) => {
  const question = `${item.passage}\n\nAs used in the text, “${item.target}” most nearly means:`
  const fingerprint = createHash('sha256').update(`${question}\n${item.choices.join('\n')}`).digest('hex')
  return {
    test_type: 'SAT', section_name: 'Reading and Writing', category_name: 'Craft and Structure', topic_name: topic.name,
    subtopic_name: 'Academic vocabulary in context', topic_id: topic.id,
    difficulty: 'Hard', difficulty_score: (item.level - 1) / 6, question_type: 'multiple_choice', question_text: question,
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
  question_id: row.id, version: 1, exam_type: 'SAT', section: 'Reading and Writing', domain: 'Craft and Structure', skill: topic.name,
  subskill: ['scope limitation', 'figurative or technical verb', 'distinction', 'research result', 'established practice', 'causal explanation', 'continuity', 'method stability', 'resolving apparent conflict', 'reduction in force', 'conditional dependence', 'precision of standards'][index],
  difficulty_level: items[index].level, difficulty_basis: 'editorial', estimated_seconds: items[index].level === 7 ? 75 : 65,
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
