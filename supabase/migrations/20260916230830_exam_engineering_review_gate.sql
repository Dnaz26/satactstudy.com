-- Additive only: preserve questions, catalogs, sessions, and all historical attempts.
create table public.exam_item_metadata (
 question_id uuid not null references public.questions(id), version integer not null default 1 check(version>0),
 exam_type text not null check(exam_type in ('SAT','ACT')), section text not null,
 domain text not null, skill text not null, subskill text not null,
 difficulty_level integer check(difficulty_level between 1 and 7),
 difficulty_basis text not null default 'editorial' check(difficulty_basis in ('editorial','empirical')),
 module_eligibility jsonb not null default '[]', estimated_seconds integer check(estimated_seconds between 1 and 1800),
 distractor_rationales jsonb not null default '{}', graphic_type text, graphic_data jsonb,
 calculator_expected boolean not null default false, contextual boolean not null default false,
 validation_status text not null default 'pending' check(validation_status in ('pending','rejected','validated')),
 validation_evidence jsonb not null default '{}', originality_evidence jsonb not null default '{}',
 content_hash text not null, created_at timestamptz not null default now(),
 primary key(question_id,version),
 constraint independent_validation_required check(validation_status<>'validated' or (
  estimated_seconds is not null and difficulty_level is not null
  and validation_evidence @> '{"independent_solution":true,"answer_verified":true,"distractors_verified":true,"ambiguity_review":true,"style_review":true,"difficulty_review":true,"blueprint_classification":true}'::jsonb
  and originality_evidence @> '{"original_authorship":true,"no_official_item_reconstruction":true}'::jsonb))
);
create table public.exam_engineering_forms (
 id uuid primary key default gen_random_uuid(), exam_type text not null check(exam_type in ('SAT','ACT')),
 name text not null, spec_version text not null, version integer not null default 1 check(version>0),
 blueprint jsonb not null, status text not null default 'draft' check(status in ('draft','review','validated','published','retired')),
 audit jsonb not null default '{}', reviewer_evidence jsonb not null default '{}',
 created_at timestamptz not null default now(), unique(exam_type,name,version),
 constraint review_before_publish check(status not in ('validated','published') or (
  audit @> '{"all_critical_categories_pass":true,"all_applicable_categories_measured":true}'::jsonb
  and reviewer_evidence @> '{"independent_adversarial_review":true,"issues_resolved":true}'::jsonb))
);
create table public.exam_item_events (
 id uuid primary key default gen_random_uuid(), event_key uuid not null,
 user_id uuid not null references auth.users(id), session_id uuid not null references public.practice_sessions(id),
 question_id uuid not null references public.questions(id),
 event_type text not null check(event_type in ('view','answer','change','skip','submit')),
 elapsed_ms integer not null check(elapsed_ms between 0 and 3600000),
 selected_answer text check(length(selected_answer)<=64), client_sequence integer not null check(client_sequence>=0),
 recorded_at timestamptz not null default now(), unique(user_id,event_key)
);
create index exam_item_events_session_idx on public.exam_item_events(user_id,session_id,question_id,client_sequence);
create index exam_item_metadata_classification_idx on public.exam_item_metadata(exam_type,section,domain,skill,validation_status);
create table public.exam_bank_reviews (
 question_id uuid not null references public.questions(id), review_version integer not null default 1,
 content_hash text not null, findings jsonb not null, status text not null check(status in ('requires_review','automated_checks_only','rejected','validated')),
 reviewed_at timestamptz not null default now(), primary key(question_id,review_version)
);
create table public.exam_calibration_reports (
 question_id uuid primary key references public.questions(id), sample_size integer not null check(sample_size>=0),
 measures jsonb not null, flags jsonb not null default '[]', updated_at timestamptz not null default now()
);
alter table public.exam_item_metadata enable row level security;
alter table public.exam_engineering_forms enable row level security;
alter table public.exam_item_events enable row level security;
alter table public.exam_bank_reviews enable row level security;
alter table public.exam_calibration_reports enable row level security;
revoke all on public.exam_item_metadata,public.exam_engineering_forms,public.exam_item_events,public.exam_bank_reviews,public.exam_calibration_reports from anon,authenticated;
grant select on public.exam_item_events to authenticated;
create policy "Own item events" on public.exam_item_events for select to authenticated using((select auth.uid())=user_id);
-- Server validates session ownership and assigned-question membership before writes.
grant select,insert,update,delete on public.exam_item_metadata,public.exam_engineering_forms,public.exam_item_events,public.exam_bank_reviews,public.exam_calibration_reports to service_role;
