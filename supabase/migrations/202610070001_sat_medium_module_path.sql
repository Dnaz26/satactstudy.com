-- Module 2 can now be easier, medium, or harder.
alter table public.user_practice_exams drop constraint if exists user_practice_exams_math_path_check;
alter table public.user_practice_exams
  add constraint user_practice_exams_math_path_check
  check (math_path is null or math_path in ('easier', 'medium', 'harder'));
