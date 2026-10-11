-- Mini onboarding survey + diagnostic fields on profiles.
alter table public.profiles
  add column if not exists age integer,
  add column if not exists exam_history text,
  add column if not exists planned_exam text,
  add column if not exists study_method text,
  add column if not exists struggle_areas text[],
  add column if not exists discovery_source text,
  add column if not exists prior_study_method text,
  add column if not exists diagnostic_sat integer,
  add column if not exists diagnostic_act integer,
  add column if not exists diagnostic_correct integer;
