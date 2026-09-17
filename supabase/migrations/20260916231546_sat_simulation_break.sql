-- Additive scheduled break; existing module assignments and answers preserved.
alter table public.user_practice_exams add column if not exists break_until timestamptz;
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
  select count(*) into correct from public.questions q where q.id=any(e.math_module1_ids) and public.sat_answer_matches(accepted->>q.id::text,q.correct_answer);
  path:=case when correct>=15 then 'harder' else 'easier' end;
  newids:=u.assigned_question_ids[1:76] || case when path='harder' then e.math_module2_hard_ids else e.math_module2_easy_ids end;
 end if;
 update public.user_practice_exams set answers=u.answers||accepted,assigned_question_ids=newids,math_path=path,module_index=p_from+1,
  break_until=case when p_from=1 then now()+interval '10 minutes' else u.break_until end,
  completed_questions=(select count(*) from jsonb_each_text(u.answers||accepted) where value<>''),
  module_seconds_left=case when p_from=0 then 1920 else 2100 end, focused_id=newids[case p_from when 0 then 28 when 1 then 55 else 77 end],updated_at=now()
 where id=u.id;
 return jsonb_build_object('mathPath',path,'questionIds',newids,'moduleIndex',p_from+1,'breakUntil',case when p_from=1 then now()+interval '10 minutes' else u.break_until end);
end $$;

