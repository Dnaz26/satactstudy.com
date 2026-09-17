-- Prevent old bulk regeneration RPCs from bypassing the new content release gate.
-- These administrative writers remain available to the service role.
revoke execute on function public.rebuild_practice_exams() from public,anon,authenticated;
revoke execute on function public.seed_original_questions(jsonb) from public,anon,authenticated;
revoke execute on function public.seed_expanded_bank(jsonb) from public,anon,authenticated;
grant execute on function public.rebuild_practice_exams() to service_role;
grant execute on function public.seed_original_questions(jsonb) to service_role;
grant execute on function public.seed_expanded_bank(jsonb) to service_role;
create policy "Internal metadata only" on public.exam_item_metadata for all to authenticated using(false) with check(false);
create policy "Internal forms only" on public.exam_engineering_forms for all to authenticated using(false) with check(false);
create policy "Internal reviews only" on public.exam_bank_reviews for all to authenticated using(false) with check(false);
create policy "Internal calibration only" on public.exam_calibration_reports for all to authenticated using(false) with check(false);
