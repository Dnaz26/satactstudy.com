import fs from 'node:fs'
import {db,checked} from '../digital-sat/db.mjs'
const audit=JSON.parse(fs.readFileSync('scripts/exam-engineering/bank-audit.json'))
// Automated findings are separate evidence, never an independent-solution verdict.
const rows=audit.findings.map(f=>({question_id:f.question_id,review_version:2,content_hash:f.content_hash,
 findings:{flags:f.flags,scope:audit.scope,audited_at:audit.auditedAt,method:'Automated completeness, choices, stimulus, provenance and duplicate checks',
 automated_pass_is_not_independent_verification:true},status:f.flags.length?'requires_review':'automated_checks_only'}))
for(let offset=0;offset<rows.length;offset+=200)checked(await db.from('exam_bank_reviews').upsert(rows.slice(offset,offset+200),{onConflict:'question_id,review_version'}))
const readback=await db.from('exam_bank_reviews').select('question_id',{count:'exact',head:true}).eq('review_version',2);checked(readback)
if(readback.count!==rows.length)throw Error('Full-bank review count mismatch')
fs.writeFileSync('scripts/exam-engineering/bank-audit-persistence.json',JSON.stringify({passed:true,reviewVersion:2,bankItems:rows.length,persisted:readback.count,noQuestionOrAttemptMutations:true},null,2)+'\n')
console.log(JSON.stringify({passed:true,bankItems:rows.length,persisted:readback.count}))
