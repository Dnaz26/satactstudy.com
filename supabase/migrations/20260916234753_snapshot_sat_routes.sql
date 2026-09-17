-- Snapshot alternative pools once; catalog revisions cannot change an active test.
alter table public.user_practice_exams add column math_module2_easy_snapshot uuid[];
alter table public.user_practice_exams add column math_module2_hard_snapshot uuid[];
update public.user_practice_exams u set math_module2_easy_snapshot=e.math_module2_easy_ids,math_module2_hard_snapshot=e.math_module2_hard_ids
from public.practice_exams e where u.exam_id=e.id and u.format_version=2 and u.status='in_progress';
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
 insert into user_practice_exams(user_id,exam_id,session_id,status,assigned_question_ids,assigned_reading_ids,assigned_english_ids,format_version,total_questions,focused_id,module_seconds_left,math_module2_easy_snapshot,math_module2_hard_snapshot)
 values(auth.uid(),e.id,sid,'in_progress',e.question_ids,e.reading_ids,e.english_ids,2,98,e.question_ids[1],1920,e.math_module2_easy_ids,e.math_module2_hard_ids) returning * into u;
 return to_jsonb(u);
end $$;
revoke all on function public.begin_sat_exam(uuid) from public,anon;
grant execute on function public.begin_sat_exam(uuid) to authenticated;

create or replace function public.transition_sat_exam(p_exam_id uuid,p_answers jsonb,p_from integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare u public.user_practice_exams; e public.practice_exams; accepted jsonb; correct integer; path text; newids uuid[];
begin
 select * into u from public.user_practice_exams where exam_id=p_exam_id and user_id=auth.uid() for update;
 if not found or u.status<>'in_progress' or u.format_version<>2 then raise exception 'No active Digital SAT exam'; end if;
 if u.break_until is not null and u.break_until>now() then raise exception 'Scheduled break is still active'; end if;
 if u.module_index<>p_from or p_from not between 0 and 2 then raise exception 'Module transition conflict'; end if;
 select * into e from public.practice_exams where id=p_exam_id;
 select coalesce(jsonb_object_agg(id::text,coalesce(p_answers->>id::text,'')),'{}') into accepted
 from unnest(u.assigned_question_ids) with ordinality t(id,n)
 where n between (case p_from when 0 then 1 when 1 then 28 else 55 end) and (case p_from when 0 then 27 when 1 then 54 else 76 end);
 newids:=u.assigned_question_ids; path:=u.math_path;
 if p_from=2 then
  select count(*) into correct from public.questions q where q.id=any(u.assigned_question_ids[55:76]) and public.sat_answer_matches(accepted->>q.id::text,q.correct_answer);
  path:=case when correct>=15 then 'harder' else 'easier' end;
  if cardinality(u.math_module2_hard_snapshot)<>22 or cardinality(u.math_module2_easy_snapshot)<>22 then raise exception 'Saved adaptive pools unavailable'; end if;
  newids:=u.assigned_question_ids[1:76] || case when path='harder' then u.math_module2_hard_snapshot else u.math_module2_easy_snapshot end;
 end if;
 update public.user_practice_exams set answers=u.answers||accepted,assigned_question_ids=newids,math_path=path,module_index=p_from+1,
  break_until=case when p_from=1 then now()+interval '10 minutes' else u.break_until end,
  completed_questions=(select count(*) from jsonb_each_text(u.answers||accepted) where value<>''),
  module_seconds_left=case when p_from=0 then 1920 else 2100 end, focused_id=newids[case p_from when 0 then 28 when 1 then 55 else 77 end],updated_at=now()
 where id=u.id;
 return jsonb_build_object('mathPath',path,'questionIds',newids,'moduleIndex',p_from+1,'breakUntil',case when p_from=1 then now()+interval '10 minutes' else u.break_until end);
end $$;

