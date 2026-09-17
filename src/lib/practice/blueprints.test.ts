import { test } from 'node:test'
import assert from 'node:assert/strict'
import { satBlueprint, satModuleSlots, actBlueprint, OFFICIAL_SPECIFICATIONS } from './blueprints'
const frequencies=(slots:{domain:string}[])=>slots.reduce<Record<string,number>>((acc,s)=>{acc[s.domain]=(acc[s.domain]??0)+1;return acc},{})
test('every SAT route is98 administered/90 scored, exact section counts, full domain targets and11 responses',()=>{
 for(const rw of ['easier','harder'] as const)for(const math of ['easier','harder'] as const){
  const b=satBlueprint(rw,math);assert.equal(b.length,98);assert.equal(b.filter(s=>s.scored).length,90)
  const reading=b.filter(s=>s.section!=='Math'),m=b.filter(s=>s.section==='Math')
  assert.equal(reading.length,54);assert.equal(m.length,44)
  assert.deepEqual(frequencies(reading.filter(s=>s.scored)),{'Information and Ideas':13,'Craft and Structure':14,'Expression of Ideas':10,'Standard English Conventions':13})
  assert.deepEqual(frequencies(m.filter(s=>s.scored)),{'Algebra':14,'Advanced Math':14,'Problem-Solving and Data Analysis':6,'Geometry and Trigonometry':6})
  assert.deepEqual(frequencies(m),{'Algebra':15,'Advanced Math':15,'Problem-Solving and Data Analysis':7,'Geometry and Trigonometry':7})
  assert.equal(m.filter(s=>s.format==='student_produced_response').length,11)
  assert.equal(m.filter(s=>s.contextual).length,13)
 }
 assert.equal(OFFICIAL_SPECIFICATIONS.SAT.seconds,8040);assert.equal(OFFICIAL_SPECIFICATIONS.SAT.breakSeconds,600)
})
test('SAT route eligibility and operational difficulty mixtures are intentional',()=>{
 assert.throws(()=>satModuleSlots('Math',1,'harder'))
 assert.throws(()=>satModuleSlots('Reading and Writing',2,'common'))
 const m=satModuleSlots('Math',1,'common');assert.equal(new Set(m.filter(s=>s.scored).map(s=>s.difficultyLevel)).size,3)
 const hard=satModuleSlots('Math',2,'harder'),easy=satModuleSlots('Math',2,'easier')
 assert.ok(hard.reduce((n,s)=>n+s.difficultyLevel,0)>easy.reduce((n,s)=>n+s.difficultyLevel,0))
 assert.ok(m.every((s,i)=>i===0||s.difficultyLevel>=m[i-1].difficultyLevel))
 const rw=satModuleSlots('Reading and Writing',1,'common');assert.ok(rw.some((s,i)=>i>0&&s.difficultyLevel<rw[i-1].difficultyLevel))
})
test('ACT core/optional Science counts, operational proportions, passage groups and no adaptive routes',()=>{
 const b=actBlueprint();assert.equal(b.length,131);assert.equal(b.filter(s=>s.scored).length,108)
 const counts=b.reduce<Record<string,number>>((a,s)=>{a[s.section]=(a[s.section]??0)+1;return a},{})
 assert.deepEqual(counts,{English:50,Math:45,Reading:36});assert.ok(b.every(s=>s.route==='common'&&s.module===1&&s.format==='multiple_choice'))
 assert.deepEqual(frequencies(b.filter(s=>s.section==='English'&&s.scored)),{'Production of Writing':16,'Knowledge of Language':8,'Conventions of Standard English':16})
 assert.deepEqual(frequencies(b.filter(s=>s.section==='Reading'&&s.scored)),{'Key Ideas and Details':13,'Craft and Structure':8,'Integration of Knowledge and Ideas':6})
 const m=b.filter(s=>s.section==='Math'&&s.scored);assert.equal(m.length,41);assert.equal(m.filter(s=>s.domain==='Integrating Essential Skills').length,8);assert.ok(m.filter(s=>s.modeling).length>=8)
 assert.equal(new Set(b.filter(s=>s.section==='English'&&s.scored).map(s=>s.passageGroup)).size,5)
 assert.equal(new Set(b.filter(s=>s.section==='Reading'&&s.scored).map(s=>s.passageGroup)).size,3)
 const science=actBlueprint(true).filter(s=>s.section==='Science');assert.equal(science.length,40);assert.equal(science.filter(s=>s.scored).length,34)
 assert.deepEqual(frequencies(science.filter(s=>s.scored)),{'Interpretation of Data':15,'Scientific Investigation':8,'Evaluating Scientific Arguments and Models with Evidence':11})
 assert.equal(OFFICIAL_SPECIFICATIONS.ACT.seconds,7500)
})

test('SAT statistical claims are covered and field items stay within RW domains; ACT permits visual reading variant',()=>{
 const m=satBlueprint('harder','harder').filter(s=>s.section==='Math')
 assert.equal(new Set(m.filter(s=>s.domain==='Problem-Solving and Data Analysis').map(s=>s.skill)).size,7)
 const rw=satModuleSlots('Reading and Writing',1,'common'),seen=new Set<string>()
 let previous=''
 for(const s of rw){if(s.domain!==previous){assert.ok(!seen.has(s.domain));seen.add(s.domain);previous=s.domain}}
 const visual=actBlueprint(true,'visual').filter(s=>s.section==='Reading')
 assert.equal(visual.filter(s=>s.graphic).length,9);assert.equal(visual.filter(s=>s.stimulus==='paired').length,0)
 assert.equal(actBlueprint(false,'paired').filter(s=>s.section==='Reading'&&s.stimulus==='paired').length,9)
})
