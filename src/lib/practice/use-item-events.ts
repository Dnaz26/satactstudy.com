'use client'
import * as React from 'react'
type ItemEvent={eventKey:string;questionId:string;eventType:'view'|'answer'|'change'|'skip'|'submit';elapsedMs:number;selectedAnswer:string|null;clientSequence:number}
/** Client times are research observations, never authoritative grading inputs. */
export function useItemEvents(sessionId:string|null,focusedId:string|null,enabled:boolean){
 const queue=React.useRef<ItemEvent[]>([]),sequence=React.useRef(0),active=React.useRef<{id:string;at:number;answer:string|null}|null>(null)
 const inFlight=React.useRef<Promise<boolean>|null>(null)
 const record=React.useCallback((id:string,type:ItemEvent['eventType'],answer:string|null)=>{
  const now=performance.now(),previous=active.current
  const elapsed=previous?.id===id?Math.max(0,Math.round(now-previous.at)):0
  queue.current.push({eventKey:crypto.randomUUID(),questionId:id,eventType:type,elapsedMs:elapsed,selectedAnswer:answer,clientSequence:sequence.current++})
  active.current={id,at:now,answer}
 },[])
 const flush=React.useCallback(async(drain=false):Promise<void>=>{
  if(!sessionId)return
  const deadline=performance.now()+8000
  // Serialize module-close uploads behind the periodic request already running.
  while(inFlight.current){const ok=await inFlight.current;if(!ok)return}
  do{
   if(!queue.current.length||performance.now()>=deadline)return
   const events=queue.current.splice(0,100)
   const task=(async()=>{
    try{
     const res=await fetch('/api/practice/exams/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,events}),keepalive:true,signal:AbortSignal.timeout(Math.max(1,Math.min(5000,Math.ceil(deadline-performance.now()))))})
     if(!res.ok&&res.status!==403&&res.status!==409)queue.current.unshift(...events)
     return res.ok
    }catch{queue.current.unshift(...events);return false}
   })()
   inFlight.current=task
   const ok=await task
   if(inFlight.current===task)inFlight.current=null
   // Research upload failures must not prevent a student from completing an exam.
   if(!ok)return
  }while(drain)
 },[sessionId])
 React.useEffect(()=>{
  const previous=active.current
  if(previous)record(previous.id,previous.answer?'submit':'skip',previous.answer)
  active.current=null
  if(enabled&&focusedId)record(focusedId,'view',null)
  return ()=>{const current=active.current;if(current)record(current.id,current.answer?'submit':'skip',current.answer);active.current=null}
 },[enabled,focusedId,record])
 React.useEffect(()=>{
  if(!sessionId)return
  const id=window.setInterval(()=>{void flush()},5000)
  const hide=()=>{const a=active.current;if(a)record(a.id,a.answer?'submit':'skip',a.answer);void flush()}
  window.addEventListener('pagehide',hide)
  return ()=>{window.clearInterval(id);window.removeEventListener('pagehide',hide)}
 },[flush,sessionId,record])
 const answer=React.useCallback((id:string,value:string,previous:string|undefined)=>{if(enabled)record(id,previous?'change':'answer',value)},[enabled,record])
 const close=React.useCallback(async()=>{const a=active.current;if(a)record(a.id,a.answer?'submit':'skip',a.answer);active.current=null;await flush(true)},[record,flush])
 return {answer,close}
}
