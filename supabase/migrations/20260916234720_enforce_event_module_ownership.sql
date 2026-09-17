drop policy "Record own assigned exam events" on public.exam_item_events;
create policy "Record own assigned exam events" on public.exam_item_events for insert to authenticated with check(
 (select auth.uid())=user_id
 and exists(select 1 from public.practice_sessions s where s.id=session_id and s.user_id=(select auth.uid()) and s.status='in_progress')
 and exists(select 1 from public.user_practice_exams u where u.session_id=exam_item_events.session_id
  and u.user_id=(select auth.uid()) and u.status='in_progress' and u.format_version=2
  and cardinality(u.assigned_question_ids)=98 and u.module_index between 0 and 3
  and (u.break_until is null or u.break_until<=now())
  and question_id=any(u.assigned_question_ids[
   case u.module_index when 0 then 1 when 1 then 28 when 2 then 55 else 77 end:
   case u.module_index when 0 then 27 when 1 then 54 when 2 then 76 else 98 end]))
);
