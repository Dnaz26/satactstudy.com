-- Preserve historical sessions while new starts use the Digital SAT format.
alter table public.practice_exams add column if not exists format_version integer not null default 1;
alter table public.practice_exams add column if not exists test_type text not null default 'SAT';
alter table public.practice_exams add column if not exists math_module1_ids uuid[] not null default '{}';
alter table public.practice_exams add column if not exists math_module2_easy_ids uuid[] not null default '{}';
alter table public.practice_exams add column if not exists math_module2_hard_ids uuid[] not null default '{}';
alter table public.user_practice_exams add column if not exists format_version integer not null default 1;
alter table public.user_practice_exams add column if not exists assigned_question_ids uuid[] not null default '{}';
alter table public.user_practice_exams add column if not exists assigned_reading_ids uuid[] not null default '{}';
alter table public.user_practice_exams add column if not exists assigned_english_ids uuid[] not null default '{}';
alter table public.user_practice_exams add column if not exists math_path text check (math_path in ('easier','harder'));
alter table public.user_practice_exams add column if not exists total_questions integer;
alter table public.user_practice_exams add column if not exists math_correct integer;
alter table public.user_practice_exams add column if not exists rw_correct integer;
update public.user_practice_exams u set assigned_question_ids=e.question_ids, assigned_reading_ids=e.reading_ids, assigned_english_ids=e.english_ids, total_questions=coalesce(s.total_questions,e.total_questions)
from public.practice_exams e left join public.practice_sessions s on false
where u.exam_id=e.id and cardinality(u.assigned_question_ids)=0;
-- Completed legacy exams keep their own denominator, rather than the new catalog count.
update public.user_practice_exams u set total_questions=s.total_questions from public.practice_sessions s where s.id=u.session_id;
create table if not exists public.sat_question_assignments (
  exam_id uuid not null references public.practice_exams(id),
  question_id uuid not null references public.questions(id),
  module integer not null check (module in (1,2)),
  path text not null check (path in ('module1','easier','harder')),
  question_number integer not null check (question_number between 55 and 98),
  primary key(exam_id,path,question_number),
  unique(exam_id,path,question_id)
);
alter table public.sat_question_assignments enable row level security;
grant select on public.sat_question_assignments to authenticated;
create policy "Read SAT exam assignments" on public.sat_question_assignments for select to authenticated using (true);
alter table public.practice_exams add constraint digital_sat_counts check (
 format_version<>2 or (
 total_questions=98 and cardinality(question_ids)=98 and cardinality(reading_ids)=27 and cardinality(english_ids)=27 and cardinality(math_ids)=44
 and cardinality(math_module1_ids)=22 and cardinality(math_module2_easy_ids)=22 and cardinality(math_module2_hard_ids)=22
 and question_ids=reading_ids||english_ids||math_ids
 and math_ids=math_module1_ids||math_module2_easy_ids
 ));
