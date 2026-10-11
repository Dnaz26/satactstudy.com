import { createHash } from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'

const BATCH = 'ACT Reading Key Ideas Completions v1'
const items = [
  {
    title: 'Counting Steps on Salt', answer: 'A',
    prompt: 'How do the shaded trials contribute to the passage’s explanation of the stilt-and-stump results?',
    choices: ['They show that the navigation errors persist without the proposed heat difference, leaving altered stride as the stronger explanation.', 'They show that the ants use visible landmarks only when the flats are shaded.', 'They show that normal ants overshoot by the same distance as ants fitted with stilts.', 'They show that travel time varies more in shade than it does in direct sunlight.'],
    explanation: 'The shaded trials produced the same overshoot and undershoot pattern, weakening the claim that heat caused the errors. The other choices invent changes in landmarks, normal-ant distance, or timing that the text does not report.',
    wrong: { B: 'No landmark use is reported in shaded trials.', C: 'Normal ants are described as arriving home, not overshooting like stilt-walkers.', D: 'The passage does not report greater travel-time variation in shade.' },
  },
  {
    title: 'The Last Picking', answer: 'C',
    prompt: 'Taken together, Ray’s attention to Ellis’s strained breathing and his response to the broken limb most strongly suggest what about Ray?',
    choices: ['He is unaware that the orchard demands more labor than it once did.', 'He expects Ellis to take over the orchard’s physical work after Friday.', 'He notices practical strain but resists allowing it alone to decide the orchard’s future.', 'He has already agreed to sell but does not want Ellis to know.'],
    explanation: 'Ray notices Ellis’s physical effort but answers the broken-limb argument by insisting the orchard has the hands it has always had. That supports a tension between practical strain and his attachment, not ignorance, a plan for Ellis, or a secret agreement to sell.',
    wrong: { A: 'Ray notices Ellis’s breathing and the damaged limb.', B: 'Ray never assigns future work to Ellis.', D: 'The decision remains open at the end.' },
  },
  {
    title: 'The Palace on Main', answer: 'D',
    prompt: 'Which pair of findings from the architect’s report most directly complicates the simple choice between restoring and demolishing the Orpheum?',
    choices: ['The roof is unsound, and the original plaster molds were destroyed in the fire.', 'The facade is entirely original, and the historic interior needs no repair.', 'The parking lot would pay no taxes, and the music teacher could fund the work herself.', 'The roof is sounder than claimed, while the historic interior is more damaged than supporters admit.'],
    explanation: 'The architect gives each side an inconvenient fact: the structure is sounder than the council suggests, but the historic fabric is worse than preservationists admit. A, B, and C contradict explicit details in the passage.',
    wrong: { A: 'The roof is sounder and the molds survive.', B: 'The facade is a later covering and the interior is damaged.', C: 'The parking lot is proposed for tax revenue and fundraising is inadequate.' },
  },
]
const { count: existing } = await db.from('questions').select('id', { count: 'exact', head: true }).eq('exam_name', BATCH)
if (existing) throw new Error(`${BATCH} already exists`)
const passages = checked(await db.from('passages').select('id,title,content').in('title', items.map((item) => item.title)))
const passageByTitle = new Map(passages.map((passage) => [passage.title, passage]))
const topic = checked(await db.from('topics').select('id,name,categories(name,sections(name,tests(name)))'))
  .find((row) => row.name === 'Main Idea and Details' && row.categories?.sections?.tests?.name === 'ACT' && row.categories?.sections?.name === 'Reading')
if (!topic) throw new Error('ACT Reading topic missing')
const response = await fetch('https://api.deepseek.com/chat/completions', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
  body: JSON.stringify({ model: process.env.DEEPSEEK_FAST_MODEL || 'deepseek-chat', temperature: 0,
    response_format: { type: 'json_object' }, max_tokens: 1000,
    messages: [
      { role: 'system', content: 'Independently answer these original ACT Reading items without seeing proposed keys. Reject an unsupported inference or second defensible choice. Return JSON only: {"reviews":[{"index":0,"answer":"A","valid":true,"reason":"..."}]}' },
      { role: 'user', content: JSON.stringify(items.map((item, index) => ({ index, passage: passageByTitle.get(item.title)?.content, prompt: item.prompt, choices: Object.fromEntries(item.choices.map((choice, i) => ['ABCD'[i], choice])) }))) },
    ] }),
})
if (!response.ok) throw new Error(`Review HTTP ${response.status}`)
const reviews = JSON.parse((await response.json()).choices?.[0]?.message?.content || '{}').reviews
if (!Array.isArray(reviews) || reviews.length !== items.length || reviews.some((review, index) => !review.valid || review.answer !== items[index].answer)) throw new Error('Independent review failed')
for (let index=0; index<items.length; index++) {
  const item=items[index]
  const passage=passageByTitle.get(item.title)
  if (!passage) throw new Error(`Passage ${item.title} missing`)
  const hash=createHash('sha256').update(`${passage.content}|${item.prompt}|${item.choices.join('|')}`).digest('hex')
  const { data: row, error }=await db.from('questions').insert({
    test_type:'ACT',section_name:'Reading',category_name:'Key Ideas and Details',topic_name:'Main Idea and Details',subtopic_name:'Evidence synthesis',topic_id:topic.id,
    difficulty:'Hard',difficulty_score:0.85,question_type:'multiple_choice',question_text:item.prompt,
    choice_a:item.choices[0],choice_b:item.choices[1],choice_c:item.choices[2],choice_d:item.choices[3],correct_answer:item.answer,
    official_explanation:item.explanation,passage_id:passage.id,source_type:'original',source_rights_status:'owned',source:BATCH,exam_name:BATCH,
    fingerprint:hash,answer_verification_status:'independently_verified',review_status:'approved',approved:true,active:true,
  }).select('id').single()
  if(error)throw error
  checked(await db.from('exam_item_metadata').insert({
    question_id:row.id,version:1,exam_type:'ACT',section:'Reading',domain:'Key Ideas and Details',skill:'Main Idea and Details',subskill:'Evidence synthesis',
    difficulty_level:6,difficulty_basis:'editorial',estimated_seconds:75,module_eligibility:[{module:1,route:'common',passageGroup:item.title}],
    distractor_rationales:item.wrong,contextual:true,validation_status:'pending',content_hash:hash,
    validation_evidence:{author_explanation:item.explanation,independent_model_answer:reviews[index].answer,independent_model_reason:reviews[index].reason},
    originality_evidence:{original_authorship:true,no_official_item_reconstruction:true},
  }).select('question_id'))
}
const {count}=await db.from('questions').select('id',{count:'exact',head:true}).eq('exam_name',BATCH).eq('active',true).eq('approved',true)
if(count!==3)throw new Error(`Readback ${count} != 3`)
console.log(JSON.stringify({inserted:count,metadataStatus:'pending'}))
