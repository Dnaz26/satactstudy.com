import { satBlueprint, actBlueprint, OFFICIAL_SPECIFICATIONS } from '../../src/lib/practice/blueprints'
import { db,checked } from '../digital-sat/db.mjs'
import { writeFileSync } from 'node:fs'
const forms=[]
for(const rw of ['easier','harder'] as const)for(const math of ['easier','harder'] as const)forms.push({
  exam_type:'SAT',name:`SAT blueprint RW ${rw}, Math ${math}`,version:1,spec_version:OFFICIAL_SPECIFICATIONS.SAT.version,
  blueprint:{specification:OFFICIAL_SPECIFICATIONS.SAT,slots:satBlueprint(rw,math)},status:'draft',
  audit:{structural_tests_pass:true,all_critical_categories_pass:false,all_applicable_categories_measured:false},reviewer_evidence:{},
})
for(const science of [false,true])for(const reading of ['paired','visual'] as const)forms.push({exam_type:'ACT',name:`Enhanced ACT blueprint${science?' with Science':''}${reading==='visual'?' visual reading':''}`,version:1,spec_version:OFFICIAL_SPECIFICATIONS.ACT.version,
  blueprint:{specification:OFFICIAL_SPECIFICATIONS.ACT,includeScience:science,readingVariant:reading,slots:actBlueprint(science,reading)},status:'draft',
  audit:{structural_tests_pass:true,all_critical_categories_pass:false,all_applicable_categories_measured:false},reviewer_evidence:{},
})
checked(await db.from('exam_engineering_forms').upsert(forms,{onConflict:'exam_type,name,version'}))
const rows: Array<{exam_type: string; name: string; status: string; blueprint: {slots: unknown[]}}> = checked(await db.from('exam_engineering_forms').select('exam_type,name,status,blueprint').in('name',forms.map(f=>f.name)))
if(rows.length!==8||rows.some(r=>r.status!=='draft'))throw Error('Blueprint readback mismatch')
writeFileSync('scripts/exam-engineering/blueprint-readback.json',JSON.stringify({passed:true,forms:rows.map(r=>({type:r.exam_type,name:r.name,status:r.status,slots:r.blueprint.slots.length}))},null,2)+'\n')
console.log('Eight separate SAT/ACT draft blueprints persisted and verified; none published.')
