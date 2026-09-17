create or replace function public.begin_sat_exam(p_exam_id uuid) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare e public.practice_exams; u public.user_practice_exams; sid uuid;
begin
 if auth.uid() is null then raise exception 'Unauthorized'; end if;
 -- Serialize concurrent fresh starts without creating duplicate/orphan sessions.
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_exam_id::text,0));
 select * into u from user_practice_exams where exam_id=p_exam_id and user_id=auth.uid();
 if found then return to_jsonb(u); end if;
 select * into e from practice_exams where id=p_exam_id;
 if not found or e.format_version<>2 then raise exception 'Digital SAT exam unavailable'; end if;
 if e.exam_number>1 and not exists(select 1 from user_practice_exams p join practice_exams c on c.id=p.exam_id where p.user_id=auth.uid() and p.status='completed' and c.exam_number>=e.exam_number-1) then raise exception 'Exam locked'; end if;
 insert into practice_sessions(user_id,test_type,is_timed,is_adaptive,total_questions,completed_questions,correct_count,time_spent_seconds,status,session_type,section_name,time_limit_seconds)
 values(auth.uid(),'SAT',true,true,98,0,0,0,'in_progress','full_test',e.title,8040) returning id into sid;
 insert into user_practice_exams(user_id,exam_id,session_id,status,assigned_question_ids,assigned_reading_ids,assigned_english_ids,format_version,total_questions,focused_id,module_seconds_left)
 values(auth.uid(),e.id,sid,'in_progress',e.question_ids,e.reading_ids,e.english_ids,2,98,e.question_ids[1],1920) returning * into u;
 return to_jsonb(u);
end $$;
revoke all on function public.begin_sat_exam(uuid) from public,anon;
grant execute on function public.begin_sat_exam(uuid) to authenticated;
