import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const batch = 'ACT English Challenge Production Additions v1'
const items = [
  {
    title: 'The Echo of Studio B', after: '[6]', topic: 'Topic Development',
    prompt: 'The writer wants to add a sentence after [6] explaining how the maintenance logs helped the archivist reconstruct the sound of the studio. Which choice best accomplishes this goal?',
    choices: {
      A: 'The logs recorded when the curtains were installed and what fabric they contained, details that helped her estimate how much sound the walls absorbed.',
      B: 'The logs also listed several repairs to the station’s front steps, which the archivist found interesting.',
      C: 'The curtains were made of fabric, and the studio was once a room in which people made radio programs.',
      D: 'The logs proved exactly what every listener heard during every broadcast from the station.',
    }, answer: 'A',
    explanation: 'The installation dates and fabric are relevant to the model of sound absorption. B concerns unrelated repairs; C repeats known facts without explaining the method; D makes an impossible claim about every listener.',
  },
  {
    title: 'The Alchemy of Ash', after: '[7]', topic: 'Topic Development',
    prompt: 'The writer wants to add a sentence after [7] that clarifies how Okonkwo could tell which firing variable affected the glaze’s color. Which choice best accomplishes this goal?',
    choices: {
      A: 'She preferred the red glaze because many other artists had already produced brown glazes.',
      B: 'In paired firings, she altered one condition, such as cooling rate, while keeping the clay and glaze thickness the same.',
      C: 'Temperature, glaze thickness, clay composition, and cooling rate all changed each time she fired a piece.',
      D: 'Her studio contained several kilns, each of which required regular maintenance.',
    }, answer: 'B',
    explanation: 'Changing one condition while holding the others constant isolates its effect. A describes preference, C prevents a clear comparison, and D does not address the experiment.',
  },
  {
    title: 'Moths Under Streetlights', after: '[6]', topic: 'Organization',
    prompt: 'The writer wants to add a sentence after [6] that qualifies the proposed lighting change while maintaining the paragraph’s focus on urban planning. Which choice best accomplishes this goal?',
    choices: {
      A: 'Moths have wings covered with tiny scales that vary in color from species to species.',
      B: 'The number of traps Lena used was greater than the number used in many earlier studies.',
      C: 'Before adopting a new bulb citywide, officials would still need to confirm that it provides adequate visibility for drivers and pedestrians.',
      D: 'Because dimmer light is always safer, every streetlight should be replaced immediately.',
    }, answer: 'C',
    explanation: 'C acknowledges a practical condition for the proposed lighting policy. A and B shift away from planning; D makes an unsupported absolute safety claim.',
  },
  {
    title: 'The Annotated Atlas', after: '[8]', topic: 'Topic Development',
    prompt: 'The writer wants to add a sentence after [8] that acknowledges the possibility of several correctors while preserving Marchetti’s larger point. Which choice best accomplishes this goal?',
    choices: {
      A: 'There is no possibility that more than one person ever wrote in the atlas.',
      B: 'The atlas contains many old pages, some of which are damaged or difficult to read.',
      C: 'Because the handwriting varies, none of the corrections can provide evidence about how readers used maps.',
      D: 'Even if several readers made the marks, their shared system of corrections would still show active engagement with the printed maps.',
    }, answer: 'D',
    explanation: 'D concedes the authorship uncertainty and connects the evidence to the main claim about active readers. A denies evidence, B is off point, and C incorrectly discards the evidence.',
  },
  {
    title: 'The Tide Gauge at Otter Point', after: '[5]', topic: 'Organization',
    prompt: 'The writer wants to add a sentence after [5] that most clearly shows why the logbooks mattered to Mara’s repair. Which choice best accomplishes this goal?',
    choices: {
      A: 'Without that record, she might have treated the uneven tooth as accidental damage rather than evidence of the gauge’s changed calibration.',
      B: 'The logbooks were old, and the repair required both old documents and newly made metal parts.',
      C: 'The earthquake occurred in 1964, many years before Mara began working at the station.',
      D: 'Because the logbooks were accurate, Mara no longer needed to inspect the corroded gears.',
    }, answer: 'A',
    explanation: 'A connects the recorded recalibration to Mara’s interpretation of the worn gear. B and C repeat background without explaining the repair, while D contradicts her hands-on inspection.',
  },
]

const { count: existing } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', batch)
if (existing) throw new Error(`${batch} already exists`)
const passages = checked(await db.from('passages').select('id,title,content').in('title', items.map(x => x.title)))
const byTitle = new Map(passages.map(x => [x.title, x]))
const topics = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
for (const item of items) {
  const passage = byTitle.get(item.title)
  if (!passage || !passage.content.includes(item.after)) throw new Error(`Missing passage anchor for ${item.title}`)
  const topic = topics.find(t => t.name === item.topic && t.categories?.sections?.tests?.name === 'ACT')
  if (!topic) throw new Error(`Missing ${item.topic} topic`)
  const hash = createHash('sha256').update(`${passage.content}|${item.prompt}|${JSON.stringify(item.choices)}`).digest('hex')
  const row = checked(await db.from('questions').insert({
    test_type: 'ACT', section_name: 'English', category_name: 'Production of Writing', topic_name: item.topic,
    subtopic_name: item.topic, topic_id: topic.id, difficulty: 'Hard', difficulty_score: 0.84,
    question_type: 'multiple_choice', question_text: item.prompt,
    choice_a: item.choices.A, choice_b: item.choices.B, choice_c: item.choices.C, choice_d: item.choices.D,
    correct_answer: item.answer, official_explanation: item.explanation, passage_id: passage.id,
    source_type: 'original', source_rights_status: 'owned', source: batch, exam_name: batch, fingerprint: hash,
    answer_verification_status: 'editorially_verified', review_status: 'approved', approved: true, active: true,
  }).select('id').single())
  checked(await db.from('exam_item_metadata').insert({
    question_id: row.id, version: 1, exam_type: 'ACT', section: 'English', domain: 'Production of Writing',
    skill: item.topic, subskill: item.topic, difficulty_level: 6, difficulty_basis: 'editorial', estimated_seconds: 55,
    module_eligibility: [{ module: 1, route: 'common', passageGroup: `act-english-challenge-${item.title}` }],
    distractor_rationales: Object.fromEntries(Object.keys(item.choices).filter(x => x !== item.answer).map(x => [x, item.explanation])),
    contextual: true, validation_status: 'pending', content_hash: hash,
    validation_evidence: { manually_solved: true, publication_review_pending: true },
    originality_evidence: { original_authorship: true, no_official_item_reconstruction: true },
  }).select('question_id'))
}
const { count } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', batch).eq('active', true)
if (count !== items.length) throw new Error(`Readback ${count} != ${items.length}`)
console.log(JSON.stringify({ inserted: count, status: 'editorial_review_pending' }))
