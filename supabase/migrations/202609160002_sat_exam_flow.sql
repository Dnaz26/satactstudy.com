create or replace function public.sat_answer_matches(selected text, canonical text) returns boolean
language plpgsql immutable strict set search_path=public as $$
declare av numeric; bv numeric; a text:=trim(selected); b text:=trim(canonical);
begin
 if a='' or b='' then return false; end if;
 if upper(a)=upper(b) then return true; end if;
 if a ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then av:=a::numeric;
 elsif a ~ '^[+-]?[0-9]+\s*/\s*[+-]?[0-9]+$' then av:=split_part(a,'/',1)::numeric/nullif(split_part(a,'/',2)::numeric,0);
 else return false; end if;
 if b ~ '^[+-]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$' then bv:=b::numeric;
 elsif b ~ '^[+-]?[0-9]+\s*/\s*[+-]?[0-9]+$' then bv:=split_part(b,'/',1)::numeric/nullif(split_part(b,'/',2)::numeric,0);
 else return false; end if;
 return coalesce(abs(av-bv)<0.000000001,false);
end $$;

-- One locked transition selects and persists Module 2. Previously completed
-- module answers cannot be rewritten through a later autosave or transition.
create or replace function public.transition_sat_exam(p_exam_id uuid,p_answers jsonb,p_from integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare u public.user_practice_exams; e public.practice_exams; accepted jsonb; correct integer; path text; newids uuid[];
begin
 select * into u from public.user_practice_exams where exam_id=p_exam_id and user_id=auth.uid() for update;
 if not found or u.status<>'in_progress' or u.format_version<>2 then raise exception 'No active Digital SAT exam'; end if;
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
  module_seconds_left=case when p_from=0 then 1920 else 2100 end, focused_id=newids[case p_from when 0 then 28 when 1 then 55 else 77 end],updated_at=now()
 where id=u.id;
 return jsonb_build_object('mathPath',path,'questionIds',newids,'moduleIndex',p_from+1);
end $$;

-- Finalize using database keys, not a client-supplied score, and write analytics
-- exactly once under the same row lock. Unanswered questions count as incorrect.
create or replace function public.complete_sat_exam(p_exam_id uuid,p_answers jsonb,p_seconds integer)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare u public.user_practice_exams; finalanswers jsonb; correct integer; mc integer; rc integer; prior boolean;
begin
 select * into u from public.user_practice_exams where exam_id=p_exam_id and user_id=auth.uid() for update;
 if not found then raise exception 'Exam not started'; end if;
 if u.format_version<>2 then raise exception 'Use legacy completion'; end if;
 if u.status='completed' then return jsonb_build_object('correctCount',u.correct_count,'total',u.total_questions,'alreadyCompleted',true); end if;
 if u.module_index<>3 or u.math_path is null or cardinality(u.assigned_question_ids)<>98 then raise exception 'Complete each module first'; end if;
 select coalesce(jsonb_object_agg(id::text,coalesce(p_answers->>id::text,'')),'{}') into finalanswers
 from unnest(u.assigned_question_ids) with ordinality t(id,n) where n between 77 and 98;
 finalanswers:=u.answers||finalanswers;
 select count(*) filter(where ok), count(*) filter(where ok and n>54),count(*) filter(where ok and n<=54) into correct,mc,rc
 from (select t.n,public.sat_answer_matches(coalesce(finalanswers->>q.id::text,''),q.correct_answer) ok from unnest(u.assigned_question_ids) with ordinality t(id,n) join questions q on q.id=t.id) g;
 if u.session_id is not null then
 insert into public.attempts(user_id,session_id,question_id,selected_answer,correct,time_spent_seconds,tutor_used,hint_used,desmos_used)
 select u.user_id,u.session_id,q.id,coalesce(finalanswers->>q.id::text,''),public.sat_answer_matches(coalesce(finalanswers->>q.id::text,''),q.correct_answer),greatest(p_seconds,0)/98,false,false,false
 from questions q where q.id=any(u.assigned_question_ids) and not exists(select 1 from attempts a where a.session_id=u.session_id and a.question_id=q.id and a.user_id=u.user_id);
 update public.practice_sessions set status='completed',completed_at=now(),total_questions=98,completed_questions=98,correct_count=correct,time_spent_seconds=greatest(p_seconds,0) where id=u.session_id and user_id=u.user_id;
 end if;
 update public.user_practice_exams set status='completed',completed_at=now(),updated_at=now(),correct_count=correct,math_correct=mc,rw_correct=rc,completed_questions=98,total_questions=98,time_spent_seconds=greatest(p_seconds,0),answers=finalanswers,marks='{}',hint_used='{}',focused_id=null,module_seconds_left=null where id=u.id;
 return jsonb_build_object('correctCount',correct,'mathCorrect',mc,'rwCorrect',rc,'total',98,'mathPath',u.math_path,'alreadyCompleted',false);
end $$;
revoke all on function public.transition_sat_exam(uuid,jsonb,integer) from public,anon;
revoke all on function public.complete_sat_exam(uuid,jsonb,integer) from public,anon;
grant execute on function public.transition_sat_exam(uuid,jsonb,integer) to authenticated;
grant execute on function public.complete_sat_exam(uuid,jsonb,integer) to authenticated;
