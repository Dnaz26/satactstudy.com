import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { dbId } from '@/lib/schema'
const schema=z.object({sessionId:z.string().uuid(),events:z.array(z.object({
  eventKey:z.string().uuid(),questionId:dbId(),eventType:z.enum(['view','answer','change','skip','submit']),
  elapsedMs:z.number().int().min(0).max(3600000),selectedAnswer:z.string().max(64).nullable(),clientSequence:z.number().int().min(0),
})).min(1).max(100)})
export async function POST(request:NextRequest){
 const db=await createClient();const {data:{user}}=await db.auth.getUser()
 if(!user)return Response.json({error:'Unauthorized'},{status:401})
 const parsed=schema.safeParse(await request.json().catch(()=>null))
 if(!parsed.success)return Response.json({error:'Invalid item events'},{status:400})
 const body=parsed.data
 const {data:exam}=await db.from('user_practice_exams').select('assigned_question_ids,module_index,break_until,status,format_version').eq('user_id',user.id).eq('session_id',body.sessionId).single()
 if(!exam)return Response.json({error:'Exam session not found'},{status:404})
 if(exam.format_version!==2||!Array.isArray(exam.assigned_question_ids)||exam.assigned_question_ids.length!==98||exam.module_index<0||exam.module_index>3)return Response.json({error:'Unsupported exam event format'},{status:409})
 if(exam.status!=='in_progress'||(exam.break_until&&Date.parse(exam.break_until)>Date.now()))return Response.json({error:'Exam not accepting events'},{status:409})
 const allowed=new Set(exam.assigned_question_ids.slice([0,27,54,76][exam.module_index],[27,54,76,98][exam.module_index]))
 if(body.events.some(e=>!allowed.has(e.questionId)))return Response.json({error:'Event outside current module'},{status:403})
 const {error}=await db.from('exam_item_events').upsert(body.events.map(e=>({event_key:e.eventKey,user_id:user.id,session_id:body.sessionId,
  question_id:e.questionId,event_type:e.eventType,elapsed_ms:e.elapsedMs,selected_answer:e.selectedAnswer,client_sequence:e.clientSequence})),{onConflict:'user_id,event_key',ignoreDuplicates:true})
 if(error)return Response.json({error:'Could not save item events'},{status:500})
 return Response.json({saved:true})
}
