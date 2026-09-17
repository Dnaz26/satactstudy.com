import {test} from 'node:test'
import assert from 'node:assert/strict'
import {assembleExam,fidelityAudit,FIDELITY_VARIABLES,type ReviewedItem,type FidelityMeasure} from './assembly'
import {satModuleSlots} from './blueprints'
test('assembly refuses wrong test, unreviewed items, missing skills and duplicate templates',()=>{
 const slots=satModuleSlots('Math',1,'common').slice(0,2)
 const bank:ReviewedItem[]=slots.map((s,i)=>({...s,id:`item${i}`,examType:'SAT',section:s.section,graphic:s.graphic,
  passageId:null,passageGroup:null,subject:'algebra',templateHash:`template${i}`,validationStatus:'validated',independentSolution:true,originalAuthorship:true,
  moduleEligibility:[{module:1,route:'common'}]}))
 assert.equal(assembleExam('SAT',slots,bank).length,2)
 assert.throws(()=>assembleExam('ACT',slots,bank));assert.throws(()=>assembleExam('SAT',slots,bank.map(q=>({...q,validationStatus:'pending'}))))
 assert.throws(()=>assembleExam('SAT',slots,bank.map(q=>({...q,templateHash:'same'}))))
 assert.throws(()=>assembleExam('SAT',slots,bank.map(q=>({...q,skill:'unrelated'}))))
})
test('fidelity cannot pass unknown categories, low critical categories, or a95 average',()=>{
 const make=(score:number|null)=>Object.fromEntries(FIDELITY_VARIABLES.map(name=>[name,{score,weight:1,applicable:name!=='ACT pacing — ACT',evidence:'test evidence',basis:score===null?'unmeasured':'measured'}])) as Record<string,FidelityMeasure>
 assert.equal(fidelityAudit('SAT',make(null)).similarityScore,null)
 assert.equal(fidelityAudit('SAT',make(95)).passesReleaseGate,false)
 const mixed=make(100);mixed['Distractor quality'].score=94;assert.equal(fidelityAudit('SAT',mixed).passesReleaseGate,false)
 assert.equal(fidelityAudit('SAT',make(100)).passesReleaseGate,true)
 const bad=make(100);bad['Difficulty authenticity'].evidence='';assert.throws(()=>fidelityAudit('SAT',bad))
})
