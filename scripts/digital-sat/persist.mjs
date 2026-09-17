/** Persist the authored bank, taxonomy mappings, and all catalog assignments.
 * The catalog is switched only after every new question is read back and checked.
 * Old questions are retained for historical attempts and legacy resumes.
 */
import { db, checked } from './db.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
const bank = JSON.parse(readFileSync(new URL('./bank.json',import.meta.url)))
const before = JSON.parse(readFileSync('/tmp/sat-exams-before.json'))
const categories = checked(await db.from('categories').select('id,name,sections(test_id,name)'))
const topics = checked(await db.from('topics').select('*'))
const sat = categories.filter(c=>c.sections.name==='Math' && c.sections.test_id===categories.find(c=>c.name==='Advanced Math').sections.test_id)
const skills = [...new Map(bank.map(q=>[q.topic_name,{ name:q.topic_name, category_id:sat.find(c=>c.name===q.category_name).id, target_time_seconds:95, description:'Official Digital SAT skill: original practice questions.' }])).values()]
for(const skill of skills) if(!topics.some(t=>t.name===skill.name && t.category_id===skill.category_id)) topics.push(checked(await db.from('topics').insert(skill).select('*').single()))
const rows = bank.map(({pool,verification,verification_checks,...q})=>({ ...q, topic_id:topics.find(t=>t.name===q.topic_name && t.category_id===sat.find(c=>c.name===q.category_name).id).id, fingerprint:createHash('sha256').update(q.question_text).digest('hex') }))
checked(await db.from('questions').upsert(rows,{onConflict:'id'}))
const mappings = rows.map(q=>({ question_id:q.id, topic_id:q.topic_id, relationship:'primary',weight:1 }))
checked(await db.from('question_topic_mappings').upsert(mappings,{onConflict:'question_id,topic_id'}))
const stored = checked(await db.from('questions').select('*').in('id',rows.map(q=>q.id)))
if(stored.length!==132) throw Error('Bank persistence count mismatch')
for(const q of rows) {
 const r=stored.find(r=>r.id===q.id)
 for(const field of ['question_text','correct_answer','choice_a','choice_b','choice_c','choice_d','official_explanation','category_name','topic_id','difficulty','question_type']) if(r[field]!==q[field]) throw Error(`Readback mismatch ${q.id} ${field}`)
}
function select(pool,n) {
 const items=bank.filter(q=>q.pool===pool)
 const one=items.slice(0,22),two=items.slice(22)
 // Each slot has the same domain and difficulty as its alternate. This
 // preserves the blueprint while varying the combinations across exams.
 const picked=one.map((q,i)=>((n >> (i%6))&1) ? two[i] : q)
 for(let i=0;i<22;i++) if(one[i].category_name!==two[i].category_name || one[i].difficulty!==two[i].difficulty || one[i].question_type!==two[i].question_type) throw Error(`Slot blueprint mismatch ${pool} ${i}`)
 return picked.sort((a,b)=>a.difficulty_score-b.difficulty_score || a.id.localeCompare(b.id)).map(q=>q.id)
}
// Existing SAT RW content is retained wherever possible; ACT items are removed
// from the SAT catalog. Each RW module contains all four SAT content domains.
let rwPool=[]
for(let page=0;;page++){
 const pageRows=checked(await db.from('questions').select('id,section_name,category_name').eq('test_type','SAT').eq('approved',true).eq('active',true).eq('section_name','Reading and Writing').order('id').range(page*1000,page*1000+999))
 rwPool.push(...pageRows);if(pageRows.length<1000)break
}
const counts={'Information and Ideas':7,'Craft and Structure':7,'Expression of Ideas':6,'Standard English Conventions':7}
const usedRW=new Set()
const updates=[];const assignments=[]
for(const e of before.exams){
 const rwModules=[]
 const examRW=new Set()
 for(let module=0;module<2;module++){
  const selected=[]
  for(const [domain,count] of Object.entries(counts)){
   const pool=rwPool.filter(q=>q.category_name===domain&&!examRW.has(q.id)).sort((a,b)=>Number(usedRW.has(a.id))-Number(usedRW.has(b.id)) || a.id.localeCompare(b.id))
   const preferred=pool.filter(q=>e.question_ids.includes(q.id))
   const available=[...preferred,...pool.filter(q=>!e.question_ids.includes(q.id))]
   if(available.length<count)throw Error(`Insufficient unused SAT RW ${domain}`)
   for(const q of available.slice(0,count)){ selected.push(q.id); usedRW.add(q.id); examRW.add(q.id) }
  }
  rwModules.push(selected)
 }
 const n=e.exam_number-1
 const m1=select('mixed',n),easy=select('easier',(n*7)%36),hard=select('harder',(n*11)%36)
 const question_ids=[...rwModules[0],...rwModules[1],...m1,...easy]
 if(new Set(question_ids).size!==98)throw Error('Duplicate exam IDs')
 updates.push({id:e.id,exam_number:e.exam_number,title:e.title,reading_ids:rwModules[0],english_ids:rwModules[1],math_ids:[...m1,...easy],question_ids,total_questions:98,format_version:2,test_type:'SAT',math_module1_ids:m1,math_module2_easy_ids:easy,math_module2_hard_ids:hard})
 for(const [path,ids,mod,start] of [['module1',m1,1,55],['easier',easy,2,77],['harder',hard,2,77]]) ids.forEach((question_id,i)=>assignments.push({exam_id:e.id,question_id,module:mod,path,question_number:start+i}))
}
writeFileSync(new URL('./exam-blueprints.json',import.meta.url),JSON.stringify(updates,null,2))
checked(await db.from('sat_question_assignments').upsert(assignments,{onConflict:'exam_id,path,question_number'}))
// One SQL statement via PostgREST upsert switches all 36 catalog rows atomically.
checked(await db.from('practice_exams').upsert(updates,{onConflict:'id'}))
// Retire only replaced SAT Math; ACT and historical references remain intact.
const oldSatMath=before.questions.filter(q=>q.test_type==='SAT'&&q.section_name==='Math'&&!bank.some(n=>n.id===q.id)).map(q=>q.id)
for(let i=0;i<oldSatMath.length;i+=200)checked(await db.from('questions').update({active:false}).in('id',oldSatMath.slice(i,i+200)))
console.log(JSON.stringify({savedQuestions:rows.length,topicMappings:mappings.length,exams:updates.length,assignments:assignments.length,retiredSatMath:oldSatMath.length,rwQuestions:usedRW.size}))
