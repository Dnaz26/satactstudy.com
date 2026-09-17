/** Observation report only. Never silently relabel from small/convenience samples. */
import fs from 'node:fs'
import {db,checked} from '../digital-sat/db.mjs'
async function pages(table,fields){const all=[];for(let offset=0;;offset+=500){const rows=checked(await db.from(table).select(fields).order('id').range(offset,offset+499));all.push(...rows);if(rows.length<500)return all}}
const attempts=await pages('attempts','id,user_id,session_id,question_id,correct,selected_answer,hint_used,tutor_used,created_at')
const sessions=await pages('practice_sessions','id,user_id,status,session_type,total_questions,correct_count')
const events=await pages('exam_item_events','id,user_id,session_id,question_id,event_type,elapsed_ms,selected_answer,recorded_at')
const sessionMap=new Map(sessions.filter(s=>s.status==='completed'&&s.session_type==='full_test').map(s=>[s.id,s]))
const times=new Map,changes=new Map
for(const e of events){const key=`${e.user_id}:${e.session_id}:${e.question_id}`;times.set(key,(times.get(key)??0)+e.elapsed_ms);if(e.event_type==='change')changes.set(key,(changes.get(key)??0)+1)}
const first=new Set,items=new Map
for(const a of [...attempts].sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)))){
 const s=sessionMap.get(a.session_id),exposure=`${a.user_id}:${a.question_id}`
 if(!s||a.hint_used||a.tutor_used||first.has(exposure))continue
 first.add(exposure)
 const item=items.get(a.question_id)??{n:0,right:0,skipped:0,choices:{},times:[],changed:0,observed:0,abilityBands:{}}
 item.n++;if(a.correct)item.right++;if(!String(a.selected_answer??'').trim())item.skipped++
 const choice=String(a.selected_answer??'').trim()||'blank';item.choices[choice]=(item.choices[choice]??0)+1
 const key=`${a.user_id}:${a.session_id}:${a.question_id}`,ms=times.get(key)
 if(ms!==undefined&&ms>0&&ms<=1800000){item.times.push(ms/1000);item.observed++;if(changes.get(key))item.changed++}
 const accuracy=s.correct_count/Math.max(s.total_questions,1),band=accuracy<.4?'raw_accuracy_below_40':accuracy<.7?'raw_accuracy_40_to_69':'raw_accuracy_70_plus'
 const bucket=item.abilityBands[band]??{n:0,right:0};bucket.n++;if(a.correct)bucket.right++;item.abilityBands[band]=bucket
 items.set(a.question_id,item)
}
const median=a=>{const sorted=[...a].sort((a,b)=>a-b);const m=Math.floor(sorted.length/2);return sorted.length?sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2:null}
const report=[]
for(const [id,i] of items){
 const p=i.right/i.n,z=1.96,denom=1+z*z/i.n,center=(p+z*z/(2*i.n))/denom,half=z*Math.sqrt(p*(1-p)/i.n+z*z/(4*i.n*i.n))/denom
 const flags=[];if(i.n<100)flags.push('insufficient_sample_for_relabeling');if(i.observed<i.n)flags.push('missing_item_timing')
 if(i.n>=30&&p>=.9)flags.push('investigate_high_success_if_labeled_hard')
 if(i.n>=30&&p<=.15)flags.push('investigate_key_ambiguity_or_excessive_difficulty')
 report.push({question_id:id,sample_size:i.n,flags,measures:{percent_correct:100*p,confidence_interval_95:[Math.max(0,center-half),Math.min(1,center+half)],
  median_response_seconds:median(i.times),average_response_seconds:i.times.length?i.times.reduce((a,b)=>a+b,0)/i.times.length:null,
  timing_observations:i.observed,timing_source:'Client item events; uncorroborated research observations, not old uniform total-time allocation',
  skip_rate:i.skipped/i.n,answer_change_rate:i.observed?i.changed/i.observed:null,distractor_selection_counts:i.choices,
  ability_bands:i.abilityBands,ability_band_basis:'Provisional full-session raw accuracy, not calibrated ability; includes focal item',
  sampling:'First unassisted completed full-test exposure per student; convenience sample'}})
}
for(let offset=0;offset<report.length;offset+=200)checked(await db.from('exam_calibration_reports').upsert(report.slice(offset,offset+200),{onConflict:'question_id'}))
fs.writeFileSync('scripts/exam-engineering/calibration-report.json',JSON.stringify({status:'observations_only',itemCount:report.length,empiricalDifficultyCertified:false,items:report},null,2)+'\n')
console.log(JSON.stringify({observedItems:report.length,empiricalDifficultyCertified:false}))
