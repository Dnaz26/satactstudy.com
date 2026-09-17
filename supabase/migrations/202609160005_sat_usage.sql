alter table public.user_practice_exams add column if not exists usage jsonb not null default '{}';
create or replace function public.complete_sat_exam(p_exam_id uuid,p_answers jsonb,p_seconds integer,p_usage jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path=public as $$
declare u public.user_practice_exams; finalanswers jsonb; correct integer; mc integer; rc integer; prior boolean;
begin
 select * into u from public.user_practice_exams where exam_id=p_exam_id and user_id=auth.uid() for update;
 if not found then raise exception 'Exam not started'; end if;
 if u.format_version<>2 then raise exception 'Use legacy completion'; end if;
 if u.status='completed' then return jsonb_build_object('correctCount',u.correct_count,'total',u.total_questions,'alreadyCompleted',true,'mathCorrect',u.math_correct,'rwCorrect',u.rw_correct,'mathPath',u.math_path); end if;
 if u.module_index<>3 or u.math_path is null or cardinality(u.assigned_question_ids)<>98 then raise exception 'Complete each module first'; end if;
 select coalesce(jsonb_object_agg(id::text,coalesce(p_answers->>id::text,'')),'{}') into finalanswers
 from unnest(u.assigned_question_ids) with ordinality t(id,n) where n between 77 and 98;
 finalanswers:=u.answers||finalanswers;
 p_usage:=jsonb_build_object(
  'hintUsed',coalesce(u.hint_used,'{}')||coalesce(p_usage->'hintUsed','{}'),
  'tutorUsed',coalesce(u.usage->'tutorUsed','{}')||coalesce(p_usage->'tutorUsed','{}'),
  'desmosUsed',coalesce(u.usage->'desmosUsed','{}')||coalesce(p_usage->'desmosUsed','{}'));

 select count(*) filter(where ok), count(*) filter(where ok and n>54),count(*) filter(where ok and n<=54) into correct,mc,rc
 from (select t.n,public.sat_answer_matches(coalesce(finalanswers->>q.id::text,''),q.correct_answer) ok from unnest(u.assigned_question_ids) with ordinality t(id,n) join questions q on q.id=t.id) g;
 if u.session_id is not null then
 insert into public.attempts(user_id,session_id,question_id,selected_answer,correct,time_spent_seconds,tutor_used,hint_used,desmos_used)
 select u.user_id,u.session_id,q.id,coalesce(finalanswers->>q.id::text,''),public.sat_answer_matches(coalesce(finalanswers->>q.id::text,''),q.correct_answer),greatest(p_seconds,0)/98,coalesce((p_usage->'tutorUsed'->>q.id::text)::boolean,false),coalesce((p_usage->'hintUsed'->>q.id::text)::boolean,false),coalesce((p_usage->'desmosUsed'->>q.id::text)::boolean,false)
 from questions q where q.id=any(u.assigned_question_ids) and not exists(select 1 from attempts a where a.session_id=u.session_id and a.question_id=q.id and a.user_id=u.user_id);
 update public.practice_sessions set status='completed',completed_at=now(),total_questions=98,completed_questions=98,correct_count=correct,time_spent_seconds=greatest(p_seconds,0) where id=u.session_id and user_id=u.user_id;
 end if;
 update public.user_practice_exams set status='completed',completed_at=now(),updated_at=now(),correct_count=correct,math_correct=mc,rw_correct=rc,completed_questions=98,total_questions=98,time_spent_seconds=greatest(p_seconds,0),answers=finalanswers,marks='{}',hint_used='{}',focused_id=null,module_seconds_left=null where id=u.id;
 return jsonb_build_object('correctCount',correct,'mathCorrect',mc,'rwCorrect',rc,'total',98,'mathPath',u.math_path,'alreadyCompleted',false);
end $$;
revoke all on function public.transition_sat_exam(uuid,jsonb,integer) from public,anon;
revoke all on function public.complete_sat_exam(uuid,jsonb,integer,jsonb) from public,anon;
grant execute on function public.transition_sat_exam(uuid,jsonb,integer) to authenticated;
grant execute on function public.complete_sat_exam(uuid,jsonb,integer,jsonb) to authenticated;
