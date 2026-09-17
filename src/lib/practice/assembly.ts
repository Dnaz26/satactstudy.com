import type { ExamType,Slot } from './blueprints'
export type ReviewedItem={
 id:string;examType:ExamType;section:string;domain:string;skill:string;difficultyLevel:number
 format:Slot['format'];passageId:string|null;passageWords:number|null;stimulus:Slot['stimulus']
 passageGroup:string|null;graphic:boolean;contextual:boolean;modeling:boolean;estimatedSeconds:number
 moduleEligibility:{module:number;route:Slot['route']}[];subject:string;templateHash:string
 validationStatus:'pending'|'rejected'|'validated';independentSolution:boolean;originalAuthorship:boolean
}
/** Exact blueprint matching; insufficient bank coverage is a failure, never
 * silently filled with an unrelated skill, another test type, or duplicate. */
export function assembleExam(type:ExamType,slots:Slot[],bank:ReviewedItem[],exposure:ReadonlyMap<string,number>=new Map()):ReviewedItem[]{
 const used=new Set<string>(),templates=new Set<string>(),subjects=new Map<string,number>(),passages=new Map<string,string>()
 const assembled:ReviewedItem[]=[]
 for(const [index,slot] of slots.entries()){
  const candidates=bank.filter(q=>q.examType===type&&q.section===slot.section&&q.domain===slot.domain&&q.skill===slot.skill
   &&q.validationStatus==='validated'&&q.independentSolution&&q.originalAuthorship&&!used.has(q.id)&&!templates.has(q.templateHash)
   &&q.format===slot.format&&Math.abs(q.difficultyLevel-slot.difficultyLevel)<=1&&q.stimulus===slot.stimulus
   &&(!slot.graphic||q.graphic)&&(!slot.contextual||q.contextual)&&(!slot.modeling||q.modeling)
   &&q.moduleEligibility.some(e=>e.module===slot.module&&e.route===slot.route)
   &&(!slot.passageWords||(q.passageWords!==null&&q.passageWords>=(type==='SAT'?25:slot.passageWords*.8)&&q.passageWords<=(type==='SAT'?150:slot.passageWords*1.2)))
   &&(!slot.passageGroup||(q.passageGroup===slot.passageGroup&&(!passages.has(slot.passageGroup)||passages.get(slot.passageGroup)===q.passageId))))
  candidates.sort((a,b)=>(exposure.get(a.id)??0)-(exposure.get(b.id)??0)
    ||(subjects.get(a.subject)??0)-(subjects.get(b.subject)??0)
    ||Math.abs(a.difficultyLevel-slot.difficultyLevel)-Math.abs(b.difficultyLevel-slot.difficultyLevel)||a.id.localeCompare(b.id))
  const selected=candidates[0]
  if(!selected)throw Error(`Insufficient validated ${type} bank for slot${index+1}: ${slot.section}/${slot.domain}/${slot.skill}/${slot.route}`)
  assembled.push(selected);used.add(selected.id);templates.add(selected.templateHash)
  subjects.set(selected.subject,(subjects.get(selected.subject)??0)+1)
  if(slot.passageGroup&&selected.passageId)passages.set(slot.passageGroup,selected.passageId)
 }
 return assembled
}
export const FIDELITY_VARIABLES=[
 'Structure accuracy','Timing accuracy','Section/question-count accuracy','Domain distribution','Skill distribution',
 'Difficulty distribution','Difficulty authenticity','Question archetype authenticity','Passage authenticity','Vocabulary authenticity',
 'Math reasoning authenticity','Answer-choice authenticity','Distractor quality','Graph/data representation',
 'Contextual problem distribution','Adaptive behavior — SAT','ACT pacing — ACT','Calculator/tool realism','Content diversity','Overall test-taking experience',
] as const
export type FidelityMeasure={score:number|null;weight:number;applicable:boolean;evidence:string;basis:'measured'|'editorial'|'unmeasured'}
export function fidelityAudit(type:ExamType,measures:Record<string,FidelityMeasure>){
 const rows=FIDELITY_VARIABLES.map(name=>{
  const m=measures[name]
  if(!m)throw Error(`Missing fidelity variable: ${name}`)
  const expectedApplicable=!(type==='SAT'&&name==='ACT pacing — ACT')&&!(type==='ACT'&&name==='Adaptive behavior — SAT')
  if(m.applicable!==expectedApplicable)throw Error(`Invalid applicability for${name}`)
  if(m.applicable&&(!Number.isFinite(m.weight)||m.weight<=0))throw Error(`Invalid weight for${name}`)
  if(m.score!==null&&(!Number.isFinite(m.score)||m.score<0||m.score>100))throw Error(`Invalid score for${name}`)
  if(m.applicable&&m.score!==null&&(!m.evidence.trim()||m.basis==='unmeasured'))throw Error(`Score lacks evidence for${name}`)
  return {name,...m}
 })
 const applicable=rows.filter(r=>r.applicable),measured=applicable.every(r=>r.score!==null)
 const score=measured?applicable.reduce((sum,r)=>sum+r.score!*r.weight,0)/applicable.reduce((sum,r)=>sum+r.weight,0):null
 const belowThreshold=applicable.filter(r=>r.score===null||r.score<95).map(r=>r.name)
 return {type,variables:rows,similarityScore:score,scoreBasis:'Evidence-based internal rubric; not official test equivalence',
   allApplicableCategoriesMeasured:measured,belowThreshold,passesReleaseGate:measured&&belowThreshold.length===0&&score!==null&&score>=98}
}
