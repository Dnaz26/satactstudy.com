import fs from 'node:fs'
import crypto from 'node:crypto'
import { db, checked } from '../digital-sat/db.mjs'
const all=[]
for(let offset=0;;offset+=500){
  const rows=checked(await db.from('questions').select('id,test_type,section_name,category_name,topic_name,subtopic_name,difficulty,difficulty_score,question_text,question_type,correct_answer,choice_a,choice_b,choice_c,choice_d,choice_e,official_explanation,ai_explanation,active,approved,image_url,source_type,source_rights_status,passages(title,content)').order('id').range(offset,offset+499))
  all.push(...rows);if(rows.length<500)break
}
const backup='/tmp/exam-engineering-bank-before.json'
if(!fs.existsSync(backup))fs.writeFileSync(backup,JSON.stringify(all),{mode:0o600})
const normalize=t=>String(t??'').toLowerCase().replace(/study note\s*\d+\s*\([^)]*\)\.?/g,'').replace(/\(set \d+\)/g,'').replace(/\s+/g,' ').trim()
const group=(key)=>{const map=new Map;for(const q of all){const k=key(q);const ids=map.get(k)??[];ids.push(q.id);map.set(k,ids)}return [...map].filter(([k,v])=>k&&v.length>1).map(([k,ids])=>({fingerprint:crypto.createHash('sha256').update(k).digest('hex'),ids}))}
const findings=all.map(q=>{
 const flags=[]
 const options=['a','b','c','d'].map(l=>q[`choice_${l}`])
 const spr=/student_produced|grid|numeric|^spr$/i.test(q.question_type??'')
 const p=Array.isArray(q.passages)?q.passages[0]:q.passages
 const prompt=String(q.question_text??'');const stimulus=String(p?.content??'')
 if(!prompt.trim())flags.push('missing_prompt')
 if(!String(q.correct_answer??'').trim())flags.push('missing_key')
 if(!spr){
  if(options.some(v=>!String(v??'').trim()))flags.push('missing_four_choices')
  if(new Set(options.map(normalize)).size!==4)flags.push('duplicate_choices')
  if(!['A','B','C','D'].includes(String(q.correct_answer).trim().toUpperCase()))flags.push('non_four_choice_key')
  if(q.choice_e)flags.push('legacy_five_choices')
 }
 if(!String(q.official_explanation??q.ai_explanation??'').trim())flags.push('missing_explanation')
 if(!q.category_name||!q.topic_name)flags.push('missing_domain_or_skill')
 if(/\n\s*[ABCD]\)/.test(prompt))flags.push('choices_embedded_in_prompt')
 const vocab=prompt.match(/(?:In this note,|In the .*?passage,)\s*[“"']?([\w-]+)[”"']?\s+most nearly means/i)
 if(vocab && !new RegExp(`\\b${vocab[1]}\\b`,'i').test(stimulus))flags.push('vocabulary_target_absent_from_passage')
 if(q.section_name!=='Math'&&!stimulus&&!/[“"]|\n\n|Note 1:|_______/.test(prompt)&&/Which sentence|Which choice|Which note|Which word|Choose the sentence/.test(prompt))flags.push('choice_dependent_stimulus_requires_review')
 if(!spr){const correct=options['ABCD'.indexOf(String(q.correct_answer).trim().toUpperCase())];if(String(correct??'').length<12&&/[.]$/.test(String(correct??''))&&/\b[a-z]\.$/i.test(String(correct)))flags.push('possible_truncated_correct_choice')}
 if(!['original','licensed','public_domain'].includes(q.source_rights_status??''))flags.push('originality_provenance_requires_review')
 return {question_id:q.id,test_type:q.test_type,section:q.section_name,active:q.active,flags,
   validation_status:flags.length?'requires_review':'automated_checks_only',content_hash:crypto.createHash('sha256').update(JSON.stringify([prompt,stimulus,options,q.correct_answer])).digest('hex')}
})
const summary={};for(const q of all){const key=`${q.test_type}:${q.section_name}`;const s=summary[key]??={total:0,active:0,flagged:0};s.total++;if(q.active)s.active++;if(findings.find(f=>f.question_id===q.id).flags.length)s.flagged++}
const report={auditedAt:new Date().toISOString(),scope:'Entire saved bank, including inactive items',total:all.length,summary,
  automatedPassIsNotIndependentAnswerVerification:true,originalityCorpusCheck:'No licensed comprehensive official-item corpus; no exhaustive similarity claim',
  exactPromptGroups:group(q=>normalize(JSON.stringify([q.question_text,(Array.isArray(q.passages)?q.passages[0]:q.passages)?.content]))),numericTemplateGroups:group(q=>normalize(JSON.stringify([q.question_text,(Array.isArray(q.passages)?q.passages[0]:q.passages)?.content])).replace(/\d+(?:\.\d+)?/g,'#')),
  repeatedPassageGroups:group(q=>normalize((Array.isArray(q.passages)?q.passages[0]:q.passages)?.content)),findings}
fs.writeFileSync('scripts/exam-engineering/bank-audit.json',JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({total:report.total,summary,flagged:findings.filter(f=>f.flags.length).length,exactDuplicateGroups:report.exactPromptGroups.length,numericTemplateGroups:report.numericTemplateGroups.length}))
