-- The pre-upgrade loader created three empty progress records without sessions
-- because it used an invalid session type. Upgrade only untouched starts.
do $$
declare u public.user_practice_exams; e public.practice_exams; sid uuid;
begin
 for u in select * from user_practice_exams where format_version=1 and status='in_progress' and module_index=0 and answers='{}'::jsonb and marks='{}'::jsonb and session_id is null for update loop
  select * into e from practice_exams where id=u.exam_id and format_version=2;
  if not found then continue; end if;
  insert into practice_sessions(user_id,test_type,is_timed,is_adaptive,total_questions,completed_questions,correct_count,time_spent_seconds,status,session_type,section_name,time_limit_seconds)
  values(u.user_id,'SAT',true,true,98,0,0,u.elapsed_seconds,'in_progress','full_test',e.title,8040) returning id into sid;
  update user_practice_exams set session_id=sid,format_version=2,total_questions=98,assigned_question_ids=e.question_ids,assigned_reading_ids=e.reading_ids,assigned_english_ids=e.english_ids,focused_id=e.question_ids[1],module_seconds_left=1920,completed_questions=0,correct_count=0,updated_at=now() where id=u.id;
 end loop;
end $$;
