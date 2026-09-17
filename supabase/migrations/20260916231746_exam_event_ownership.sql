grant insert on public.exam_item_events to authenticated;
create policy "Record own assigned exam events" on public.exam_item_events for insert to authenticated with check(
 (select auth.uid())=user_id
 and exists(select 1 from public.practice_sessions s where s.id=session_id and s.user_id=(select auth.uid()))
 and exists(select 1 from public.user_practice_exams u where u.session_id=exam_item_events.session_id and u.user_id=(select auth.uid()) and question_id=any(u.assigned_question_ids))
);
