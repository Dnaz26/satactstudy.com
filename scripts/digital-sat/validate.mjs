import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { db, checked } from './db.mjs'
const bank=JSON.parse(readFileSync(new URL('./bank.json',import.meta.url)))
const exams=checked(await db.from('practice_exams').select('*').order('exam_number'))
const actual=checked(await db.from('questions').select('*').in('id',bank.map(q=>q.id)))
const byId=new Map(actual.map(q=>[q.id,q]))
assert.equal(exams.length,36);assert.equal(actual.length,132)
for(const q of bank){const r=byId.get(q.id);for(const field of ['question_text','correct_answer','official_explanation','difficulty','category_name','question_type','choice_a','choice_b','choice_c','choice_d'])assert.equal(r[field],q[field]);assert.ok(r.topic_id);assert.equal(r.active,true);assert.equal(r.approved,true)}
assert.equal(new Set(actual.map(q=>q.question_text)).size,132)
const rows=[]
const allAssignedIds=new Set()
for(const e of exams){
 assert.equal(e.total_questions,98);assert.equal(e.format_version,2);assert.equal(e.test_type,'SAT')
 assert.equal(e.question_ids.length,98);assert.equal(new Set(e.question_ids).size,98)
 assert.equal(e.reading_ids.length+e.english_ids.length,54);assert.equal(e.math_ids.length,44)
 assert.deepEqual(e.question_ids,[...e.reading_ids,...e.english_ids,...e.math_ids])
 for(const path of ['easy','hard']){
  const m2=e[`math_module2_${path}_ids`];const ids=[...e.math_module1_ids,...m2]
  assert.equal(e.math_module1_ids.length,22);assert.equal(m2.length,22);assert.equal(new Set(ids).size,44)
  ids.forEach(id=>allAssignedIds.add(id))
  const questions=ids.map(id=>byId.get(id));assert.ok(questions.every(Boolean))
  const domains={},difficulty={}
  questions.forEach(q=>{domains[q.category_name]=(domains[q.category_name]??0)+1;difficulty[q.difficulty]=(difficulty[q.difficulty]??0)+1})
  assert.deepEqual(domains,{'Algebra':15,'Advanced Math':15,'Problem-Solving and Data Analysis':7,'Geometry and Trigonometry':7})
  for(const module of [e.math_module1_ids,m2]){
   const qs=module.map(id=>byId.get(id));assert.equal(new Set(qs.map(q=>q.category_name)).size,4)
   for(let i=1;i<qs.length;i++)assert.ok(qs[i].difficulty_score>=qs[i-1].difficulty_score)
  }
  assert.equal(questions.filter(q=>q.question_type==='student_produced_response').length,11)
  rows.push({exam:e.exam_number,path,domains,difficulty,spr:questions.filter(q=>q.question_type==='student_produced_response').length})
 }
 // Check SAT-only RW records, all four RW domains in both modules.
 const rw=checked(await db.from('questions').select('id,test_type,section_name,category_name').in('id',[...e.reading_ids,...e.english_ids]))
 assert.equal(rw.length,54);assert.ok(rw.every(q=>q.test_type==='SAT'&&q.section_name==='Reading and Writing'))
 for(const module of [e.reading_ids,e.english_ids])assert.equal(new Set(rw.filter(q=>module.includes(q.id)).map(q=>q.category_name)).size,4)
 const count=await db.from('sat_question_assignments').select('*',{count:'exact',head:true}).eq('exam_id',e.id);checked(count);assert.equal(count.count,66)
}
assert.equal(allAssignedIds.size,132)
const report={passed:true,exams:exams.length,pathsValidated:rows.length,questionsPersisted:actual.length,assignments:2376,exactDuplicatePrompts:0,mathDomainCounts:rows[0].domains,pathExamples:rows.slice(0,2),coverage:[...new Set(actual.map(q=>q.topic_name))],sharedMathPool:true,mathQuestionsMayRecurAcrossExams:true}
writeFileSync(new URL('./validation-report.json',import.meta.url),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
