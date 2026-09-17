/** Real authenticated HTTP/RLS integration test. Temporary users and all their
 * exam data are removed in finally; no email is sent by admin creation. */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { createServerClient } from '@supabase/ssr'
import { db,checked } from './db.mjs'
const base=process.env.SAT_TEST_URL??'http://localhost:3100'
const users=[]
const authClients=[]
const report=[]
async function testPath(right,wantPath,answerModule2=true){
 const email=`sat-flow-${randomUUID()}@example.com`,password=randomUUID()+'Aa1!'
 const created=checked(await db.auth.admin.createUser({email,password,email_confirm:true}));users.push(created.user.id)
 const jar=new Map()
 const auth=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(c=>jar.set(c.name,c.value))}})
 authClients.push(auth)
 checked(await auth.auth.signInWithPassword({email,password}))
 async function request(path,method='GET',body){
  const res=await fetch(base+path,{method,headers:{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})
  const data=await res.json();return {status:res.status,data}
 }
 const catalog=await request('/api/practice/exams');assert.equal(catalog.status,200);assert.equal(catalog.data.exams.length,36)
 const id=catalog.data.exams[0].id,second=catalog.data.exams[1].id
 assert.equal((await request('/api/practice/exams','POST',{examId:second})).status,403)
 const starts=await Promise.all([request('/api/practice/exams','POST',{examId:id}),request('/api/practice/exams','POST',{examId:id})])
 assert.equal(starts[0].status,200,JSON.stringify(starts[0].data));assert.equal(starts[1].status,200,JSON.stringify(starts[1].data))
 assert.equal(starts[0].data.sessionId,starts[1].data.sessionId)
 let start=starts[0].data;assert.equal(start.questions.length,98)
 assert.ok(start.questions.every(q=>q.correct_answer===''&&q.official_explanation===null&&q.ai_explanation===null),'No answer keys or solutions before completion')
 const examRecord=checked(await db.from('practice_exams').select('question_ids,math_module2_hard_ids').eq('id',id).single())
 const canonicalRows=checked(await db.from('questions').select('id,correct_answer').in('id',[...new Set([...examRecord.question_ids,...examRecord.math_module2_hard_ids])]))
 const canonical=new Map(canonicalRows.map(q=>[q.id,q.correct_answer]))
 const sid=start.sessionId
 const event={eventKey:randomUUID(),questionId:start.questions[0].id,eventType:'view',elapsedMs:0,selectedAnswer:null,clientSequence:0}
 const eventBody={sessionId:sid,events:[event]}
 assert.equal((await request('/api/practice/exams/events','POST',eventBody)).status,200)
 assert.equal((await request('/api/practice/exams/events','POST',eventBody)).status,200)
 const observed=checked(await db.from('exam_item_events').select('id').eq('user_id',created.user.id).eq('event_key',event.eventKey));assert.equal(observed.length,1,'Event retries are idempotent')
 assert.equal((await request('/api/practice/exams/events','POST',{sessionId:sid,events:[{...event,eventKey:randomUUID(),questionId:start.questions[54].id}]})).status,403)
 assert.equal((await request('/api/practice/exams/events','POST',{sessionId:randomUUID(),events:[event]})).status,404)
 const sessionCount=await db.from('practice_sessions').select('id',{count:'exact',head:true}).eq('user_id',created.user.id);checked(sessionCount);assert.equal(sessionCount.count,1)
 assert.equal((await request('/api/practice/exams/module','POST',{examId:id,fromModule:2,answers:{}})).status,409)
 function key(q) {
  const answer=canonical.get(q.id);assert.ok(answer)
  if(q.question_type!=='student_produced_response')return answer
  const fraction=answer.split('/').map(Number)
  return fraction.length===2 ? String(fraction[0]/fraction[1]) : String(Number(answer)*10)+'/10'
 }
 let answers={}
 for(let mod=0;mod<2;mod++){
  const ids=mod===0?start.exam.readingIds:start.exam.englishIds
  for(const q of start.questions.filter(q=>ids.includes(q.id)))answers[q.id]=key(q)
  const transition=await request('/api/practice/exams/module','POST',{examId:id,fromModule:mod,answers})
  assert.equal(transition.status,200,JSON.stringify(transition.data));assert.equal(transition.data.moduleIndex,mod+1)
  const resume=await request('/api/practice/exams','POST',{examId:id});assert.equal(resume.status,200);assert.equal(resume.data.progress.moduleIndex,mod+1)
  start=resume.data
 }
 assert.equal((await request('/api/practice/exams/events','POST',eventBody)).status,409,'No events during scheduled break')
 assert.ok(Date.parse(start.progress.breakUntil)>Date.now()+590000,'Persist ten-minute break')
 assert.equal((await request('/api/practice/exams/module','POST',{examId:id,fromModule:2,answers})).status,409,'Cannot submit Math during break')
 // Advance only this disposable fixture deadline; production students cannot skip.
 checked(await db.from('user_practice_exams').update({break_until:new Date(Date.now()-1000).toISOString()}).eq('user_id',created.user.id).eq('exam_id',id))
 const math1=start.questions.slice(54,76)
 math1.forEach((q,i)=>answers[q.id]=i<right?key(q):'')
 const saved=await request('/api/practice/exams/progress','PATCH',{examId:id,answers,moduleIndex:2,moduleSecondsLeft:2000,elapsed:300,sessionId:sid,focusedId:math1[0].id,hintUsed:{[math1[0].id]:true},usage:{tutorUsed:{[math1[0].id]:true},desmosUsed:{[math1[0].id]:true}}})
 assert.equal(saved.status,200,JSON.stringify(saved.data))
 const resumed=await request('/api/practice/exams','POST',{examId:id});assert.equal(resumed.data.progress.answers[math1[0].id],right>0?key(math1[0]):'')
 const transition=await request('/api/practice/exams/module','POST',{examId:id,fromModule:2,answers})
 assert.equal(transition.status,200,JSON.stringify(transition.data));assert.equal(transition.data.mathPath,wantPath)
 const resumed2=await request('/api/practice/exams','POST',{examId:id})
 assert.equal(resumed2.data.exam.mathPath,wantPath);assert.deepEqual(resumed2.data.exam.mathIds,transition.data.mathIds)
 assert.equal((await request('/api/practice/exams/progress','PATCH',{examId:id,answers:{},moduleIndex:2})).status,409)
 const math2=resumed2.data.questions.slice(76)
 math2.forEach(q=>answers[q.id]=answerModule2?key(q):'')
 // A changed answer to a locked earlier module must be ignored at completion.
 const firstRw=resumed2.data.questions[0].id;answers[firstRw]='intentionally wrong'
 const completed=await request('/api/practice/exams/progress','POST',{examId:id,answers,timeSpentSeconds:450,sessionId:sid,correctCount:9999,completedQuestions:9999})
 assert.equal(completed.status,200,JSON.stringify(completed.data));assert.equal(completed.data.correctCount,54+right+(answerModule2?22:0));assert.equal(completed.data.total,98)
 assert.equal(completed.data.mathCorrect,right+(answerModule2?22:0));assert.equal(completed.data.rwCorrect,54)
 const again=await request('/api/practice/exams/progress','POST',{examId:id,answers:{},timeSpentSeconds:1});assert.equal(again.status,200);assert.equal(again.data.alreadyCompleted,true)
 assert.equal((await request('/api/practice/exams','POST',{examId:id})).status,409)
 const final=checked(await db.from('practice_sessions').select('*').eq('id',sid).single());assert.equal(final.status,'completed');assert.equal(final.total_questions,98);assert.equal(final.completed_questions,98);assert.equal(final.correct_count,54+right+(answerModule2?22:0))
 const attempts=checked(await db.from('attempts').select('question_id,correct,hint_used,tutor_used,desmos_used').eq('session_id',sid));assert.equal(attempts.length,98);assert.equal(new Set(attempts.map(a=>a.question_id)).size,98);assert.equal(attempts.filter(a=>a.correct).length,54+right+(answerModule2?22:0))
 const assisted=attempts.find(a=>a.question_id===math1[0].id)
 assert.equal(assisted.hint_used,true);assert.equal(assisted.tutor_used,true);assert.equal(assisted.desmos_used,true)
 const mastery=checked(await db.from('topic_mastery').select('topic_id,total_attempts').eq('user_id',created.user.id));assert.ok(mastery.length>0);assert.equal(mastery.reduce((n,m)=>n+m.total_attempts,0),98)
 const next=await request('/api/practice/exams');assert.equal(next.data.exams[1].unlocked,true);assert.equal(next.data.exams[0].completedQuestions,98)
 for(const page of ['/practice/results?correct='+completed.data.correctCount+'&total=98&math='+completed.data.mathCorrect+'&rw=54&path='+wantPath,'/analytics','/dashboard','/mistakes']){
  const res=await fetch(base+page,{headers:{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}});assert.equal(res.status,200,page)
 }
 const snapshot=await request('/api/snapshot/daily','POST',{});assert.equal(snapshot.status,200,JSON.stringify(snapshot.data))
 report.push({module1Correct:right,selectedPath:wantPath,score:completed.data.correctCount,total:98,concurrentStart:true,resume:true,tenMinuteBreak:true,earlyMathRejected:true,answerKeysHidden:true,itemEventsIdempotent:true,wrongModuleEventsRejected:true,foreignSessionRejected:true,breakEventsRejected:true,staleSaveRejected:true,lockedAnswersPreserved:true,attempts:98,analytics:true,mastery:true,usage:true,equivalentFractionAnswers:true,unansweredMath2:!answerModule2})
 checked(await auth.auth.signOut())
}
try{
 await testPath(14,'easier');await testPath(15,'harder');await testPath(0,'easier',false);await testPath(22,'harder')
 console.log(JSON.stringify({passed:true,cases:report},null,2))
 writeFileSync(new URL('./flow-report.json',import.meta.url),JSON.stringify({passed:true,cases:report},null,2))
}finally{
 for(const auth of authClients) await auth.auth.signOut()
 for(const id of users){
  // Auth deletion cascades profile-owned records. Remove session/exam rows first
  // to accommodate databases whose historical foreign keys use NO ACTION.
  checked(await db.from('exam_item_events').delete().eq('user_id',id))
  checked(await db.from('attempts').delete().eq('user_id',id))
  checked(await db.from('user_practice_exams').delete().eq('user_id',id))
  checked(await db.from('practice_sessions').delete().eq('user_id',id))
  checked(await db.auth.admin.deleteUser(id))
 }
}
