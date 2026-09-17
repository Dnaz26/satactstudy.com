import fs from 'node:fs'
import crypto from 'node:crypto'
import {db,checked} from '../digital-sat/db.mjs'
const drafts=JSON.parse(fs.readFileSync('scripts/exam-engineering/sat-rw-draft.json'))
const independent=[...JSON.parse(fs.readFileSync('scripts/exam-engineering/sat-rw-independent-review.json')).questions,...JSON.parse(fs.readFileSync('scripts/exam-engineering/sat-rw-upper-independent-review.json')).questions]
const graphics=JSON.parse(fs.readFileSync('scripts/exam-engineering/rw-graphic-validation.json'))
const reviews=new Map(independent.map(r=>[r.question_id,r]))
// Complete all preflight checks before any new question enters the database.
for(const q of drafts){
 const r=reviews.get(q.id)
 if(!r||r.content_hash!==q.metadata.content_hash||r.independently_selected_answer!==q.correct_answer||!r.passes_answer_uniqueness||r.ambiguity_review.status!=='passes'||!r.style_review.status.startsWith('passes'))throw Error(`Independent review mismatch: ${q.id}`)
 if(r.skill_classification.domain!==q.category_name||r.skill_classification.skill!==q.topic_name)throw Error('Independent classification mismatch')
 if(r.issues.some(i=>i.severity!=='editorial_advisory'&&!(i.severity==='assembly_advisory'&&q.image_url&&graphics.visualRendering.includes('passed'))))throw Error('Unresolved critical reviewer issue')
 if(q.image_url&&(!graphics.independentArithmetic||!graphics.passageDataMatches||!graphics.visualRendering.includes('passed')||!graphics.assets.includes(q.image_url.split('/').at(-1))))throw Error('Graphic review incomplete')
 const level=r.difficulty_review.estimated_level_1_to_7
 q.difficulty=level<=2?'Easy':level<=5?'Medium':'Hard';q.difficulty_score=(level-1)/6;q.metadata.difficulty_level=level
 q.metadata.validation_evidence={generation:true,independent_solution:true,answer_verified:true,distractors_verified:true,ambiguity_review:true,style_review:true,difficulty_review:true,blueprint_classification:true,
  reviewer_method:'Separate blind reviewer; key compared only after independent solution',independent_solution_text:r.independent_solution,
  graphic_data_verified:!!q.image_url,scope:'Easy/medium item pool only; not a complete adaptive module or released exam'}
 q.metadata.validation_status='validated'
}
const categories=checked(await db.from('categories').select('id,name,sections(test_id,name)'))
const satTestId=categories.find(c=>c.name==='Advanced Math'&&c.sections.name==='Math').sections.test_id
const sat=categories.filter(c=>c.sections.name==='Reading and Writing'&&c.sections.test_id===satTestId)
const topics=checked(await db.from('topics').select('*'))
for(const q of drafts){
 const category=sat.find(c=>c.name===q.category_name);if(!category)throw Error('SAT category missing')
 let topic=topics.find(t=>t.name===q.topic_name&&t.category_id===category.id)
 if(!topic){topic=checked(await db.from('topics').insert({name:q.topic_name,category_id:category.id,target_time_seconds:70,description:'Official Digital SAT skill; original reviewed practice content.'}).select('*').single());topics.push(topic)}
 q.topic_id=topic.id
}
const passages=drafts.map(q=>({id:q.id,title:q.topic_name,content:q.passage}))
checked(await db.from('passages').upsert(passages,{onConflict:'id'}))
const rows=drafts.map(({metadata,passage,difficulty_level,...q})=>({...q,passage_id:q.id,fingerprint:metadata.content_hash,
 answer_verification_status:'verified',review_status:'approved',approved:true,active:false,calculator_allowed:false}))
// Inactive, independently validated content; catalogs and existing attempts preserved.
checked(await db.from('questions').upsert(rows,{onConflict:'id'}))
checked(await db.from('question_topic_mappings').upsert(rows.map(q=>({question_id:q.id,topic_id:q.topic_id,relationship:'primary',weight:1})),{onConflict:'question_id,topic_id'}))
checked(await db.from('exam_item_metadata').upsert(drafts.map(q=>({question_id:q.id,version:1,exam_type:'SAT',section:q.section_name,...q.metadata})),{onConflict:'question_id,version'}))
const stored=checked(await db.from('questions').select('id,question_text,correct_answer,choice_a,choice_b,choice_c,choice_d,official_explanation,active,passages(content)').in('id',rows.map(q=>q.id)))
if(stored.length!==rows.length)throw Error('Missing saved questions')
for(const q of rows){const s=stored.find(r=>r.id===q.id);for(const field of ['question_text','correct_answer','choice_a','choice_b','choice_c','choice_d','official_explanation','active'])if(s[field]!==q[field])throw Error('Saved question mismatch');if(s.passages.content!==drafts.find(r=>r.id===q.id).passage)throw Error('Saved passage mismatch')}
const metadata=checked(await db.from('exam_item_metadata').select('question_id,validation_status,difficulty_level').in('question_id',rows.map(q=>q.id)))
if(metadata.length!==rows.length||metadata.some(r=>r.validation_status!=='validated'))throw Error('Saved metadata mismatch')
const report={passed:true,questions:rows.length,passages:passages.length,metadata:metadata.length,independentlyVerified:true,active:false,examsModified:0,
 difficultyLevels:metadata.reduce((a,q)=>{a[q.difficulty_level]=(a[q.difficulty_level]??0)+1;return a},{})}
fs.writeFileSync('scripts/exam-engineering/rw-persistence-report.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify(report))
