import fs from 'node:fs'
import crypto from 'node:crypto'
import {db,checked} from '../digital-sat/db.mjs'
const bank=JSON.parse(fs.readFileSync('scripts/digital-sat/bank.json'))
const blind=JSON.parse(fs.readFileSync('scripts/exam-engineering/sat-math-blind-review.json'))
const review=JSON.parse(fs.readFileSync('scripts/exam-engineering/sat-math-independent-review.json'))
const byId=new Map(review.questions.map(q=>[q.id,q]))
const numeric=s=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(String(s)))return NaN;const [a,b='1']=String(s).split('/');return Number(a)/Number(b)}
const rows=bank.map((q,i)=>{
 const r=byId.get(q.id),stim=blind[i],choices=['a','b','c','d'].map(k=>q['choice_'+k])
 if(!r||r.reviewed_prompt_sha256!==crypto.createHash('sha256').update(q.question_text).digest('hex')||!r.unique_answer||JSON.stringify(stim.choices)!==JSON.stringify(choices))throw Error('Review does not match saved candidate')
 const correct=r.independently_selected_answer===q.correct_answer||Number.isFinite(numeric(q.correct_answer))&&Math.abs(numeric(q.correct_answer)-numeric(r.independently_selected_answer))<1e-9
 if(!correct)throw Error(`Independent solution mismatch ${q.id}`)
 const level=r.editoriallevel_1_to_7,unresolved=r.option_review.filter(o=>!o.is_correct&&!o.misconception_identified)
 return {question_id:q.id,version:1,exam_type:'SAT',section:'Math',domain:r.skillclassification.domain,skill:r.skillclassification.skill,subskill:q.subtopic_name,
 difficulty_level:level,difficulty_basis:'editorial',estimated_seconds:[30,40,55,75,95,115,130][level-1],
 module_eligibility:q.pool==='mixed'?[{module:1,route:'common'}]:[{module:2,route:q.pool}],
 distractor_rationales:Object.fromEntries(r.option_review.map(o=>[o.choice,{rationale:o.rationale,misconception_identified:o.misconception_identified}])),
 calculator_expected:!!q.desmos_useful,graphic_type:null,graphic_data:null,contextual:false,
 validation_status:'pending',content_hash:crypto.createHash('sha256').update(JSON.stringify([q.question_text,q.question_type,choices,q.correct_answer])).digest('hex'),
 originality_evidence:{original_authorship:true,no_official_item_reconstruction:true,method:'Individually authored reasoning prompts from skill blueprint; no protected question source'},
 validation_evidence:{independent_solution:true,answer_verified:true,ambiguity_review:r.unique_answer,difficulty_review:true,blueprint_classification:true,
 distractors_verified:unresolved.length===0,style_review:false,independent_solution_text:r.reasoning,reviewer_scope:review.scope,
 unresolved_distractors:unresolved.map(o=>o.choice),issues:r.issues,release_blockers:['Final style/graphics/contextual classification pending',...(unresolved.length?['Distractor misconception revisions required']:[])],
 difficulty_label_conflict:q.difficulty!==(level<=2?'Easy':level<=5?'Medium':'Hard'),scope:'Review metadata only; current catalog unchanged'}}
})
const storedKeys=checked(await db.from('questions').select('id,question_text,correct_answer').in('id',rows.map(q=>q.question_id)))
for(const q of bank){const s=storedKeys.find(s=>s.id===q.id);if(!s||s.question_text!==q.question_text||s.correct_answer!==q.correct_answer)throw Error('Live bank differs from independently reviewed candidate')}
checked(await db.from('exam_item_metadata').upsert(rows,{onConflict:'question_id,version'}))
const saved=checked(await db.from('exam_item_metadata').select('question_id,content_hash,difficulty_level,validation_status').in('question_id',rows.map(q=>q.question_id)))
for(const q of rows){const s=saved.find(s=>s.question_id===q.question_id);if(!s||s.content_hash!==q.content_hash||s.difficulty_level!==q.difficulty_level||s.validation_status!=='pending')throw Error('Saved review metadata mismatch')}
const report={passed:true,independentlySolved:rows.length,persistedReviews:saved.length,validationStatus:'pending',unresolvedDistractors:rows.reduce((n,q)=>n+q.validation_evidence.unresolved_distractors.length,0),
 difficultyLevels:rows.reduce((a,q)=>{a[q.difficulty_level]=(a[q.difficulty_level]??0)+1;return a},{}),liveAssignmentsChanged:false,historicalAttemptsChanged:false}
fs.writeFileSync('scripts/exam-engineering/math-review-persistence.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report))
