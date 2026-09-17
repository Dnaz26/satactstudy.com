import foundational from './sat-rw-candidates.mjs'
import upper from './sat-rw-upper-candidates.mjs'
import fs from 'node:fs'
import crypto from 'node:crypto'
const domains={I:'Information and Ideas',C:'Craft and Structure',E:'Expression of Ideas',S:'Standard English Conventions'}
const authored=[...foundational,...upper]
const positions=[]
for(let start=0;start<authored.length;start+=27){const group=authored.slice(start,start+27).map((_,i)=>i%4);for(let i=group.length-1;i>0;i--){const j=crypto.createHash('sha256').update(`rw-choice-balance-v1-${start+i}`).digest().readUInt32BE(0)%(i+1);[group[i],group[j]]=[group[j],group[i]]}positions.push(...group)}
const rows=authored.map(([d,skill,level,subskill,passage,prompt,draft,why,wrong],i)=>{
 if(draft.length!==4||new Set(draft).size!==4||wrong.length!==3)throw Error(`Choice defect ${i+1}`)
 const rotation=positions[i],choices=Array.from({length:4},(_,j)=>draft[(j-rotation+4)%4]);
 const reasons=Object.fromEntries(choices.map((c,j)=>['ABCD'[j],c===draft[0]?'Correct: '+why:wrong[draft.indexOf(c)-1]]))
 const seed=crypto.createHash('sha256').update('prep-sat-rw-2026-original-'+(i+1)).digest('hex');
 const id=`${seed.slice(0,8)}-${seed.slice(8,12)}-5${seed.slice(13,16)}-a${seed.slice(17,20)}-${seed.slice(20,32)}`
 const contentHash=crypto.createHash('sha256').update(JSON.stringify([passage,prompt,choices])).digest('hex')
 return {id,test_type:'SAT',section_name:'Reading and Writing',category_name:domains[d],topic_name:skill,subtopic_name:subskill,
 difficulty:level<=2?'Easy':level<=5?'Medium':'Hard',difficulty_score:(level-1)/6,difficulty_level:level,
 passage,question_text:prompt,question_type:'multiple_choice',choice_a:choices[0],choice_b:choices[1],choice_c:choices[2],choice_d:choices[3],choice_e:null,
 image_url:i===4?'/digital-sat/reading-writing/soil-water-loss.svg':i===5?'/digital-sat/reading-writing/recall-practice.svg':i===30?'/digital-sat/reading-writing/composite-strength.svg':null,
 correct_answer:'ABCD'[rotation],official_explanation:why+' '+Object.entries(reasons).filter(([key])=>key!=='ABCD'[rotation]).map(([key,r])=>`${key}: ${r}`).join(' '),
 source:'PrepSAT/ACT original authored academic stimuli',source_type:'original',source_rights_status:'original',
 active:false,approved:false,review_status:'pending',answer_verification_status:'pending',
 metadata:{domain:domains[d],skill,subskill,difficulty_level:level,estimated_seconds:level<=2?45:level<=5?70:90,
 difficulty_basis:'editorial',module_eligibility:i<27?[{module:1,route:'common'},{module:2,route:'easier'}]:[{module:1,route:'common'},{module:2,route:'harder'}],distractor_rationales:reasons,
 graphic_type:i===30?'bar_graph':skill==='Command of Evidence — Quantitative'?'table':null,
 graphic_data:i===4?{columns:['Soil','Unshaded loss (mL)','Shaded loss (mL)'],rows:[['Coarse',40,22],['Fine',26,20]]}:i===5?{columns:['Practice','Immediate recall (%)','One-week recall (%)'],rows:[['Single session',84,51],['Spaced sessions',86,73]]}:i===30?{columns:['Fiber orientation','Unpolished force (N)','Polished force (N)'],rows:[['Aligned',120,150],['Random',80,90]]}:null,
 originality_evidence:{original_authorship:true,no_official_item_reconstruction:true,method:'Individually authored fictional studies and passages; official framework only'},
 validation_evidence:{generation:true},validation_status:'pending',content_hash:contentHash}}
})
fs.writeFileSync('scripts/exam-engineering/sat-rw-draft.json',JSON.stringify(rows,null,2)+'\n')
const blind=rows.map((r,i)=>({n:i+1,id:r.id,passage:r.passage,question:r.question_text,choices:[r.choice_a,r.choice_b,r.choice_c,r.choice_d],content_hash:r.metadata.content_hash}))
fs.writeFileSync('scripts/exam-engineering/sat-rw-blind-review.json',JSON.stringify(blind.slice(0,27),null,2)+'\n')
fs.writeFileSync('scripts/exam-engineering/sat-rw-upper-blind-review.json',JSON.stringify(blind.slice(27),null,2)+'\n')
console.log(JSON.stringify({draftQuestions:rows.length,answerCounts:rows.reduce((a,r)=>{a[r.correct_answer]=(a[r.correct_answer]??0)+1;return a},{})}))
