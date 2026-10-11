alter table public.profiles
  add column if not exists study_credits integer not null default 0;

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.study_payouts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.study_payouts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.study_payouts
  add constraint study_payouts_status_check
  check (status in ('pending', 'paid', 'failed', 'converted'));

create table if not exists public.study_credit_grants (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  credits integer not null check (credits > 0),
  created_at timestamptz not null default now()
);

alter table public.study_credit_grants enable row level security;

drop policy if exists "read own credit grants" on public.study_credit_grants;
create policy "read own credit grants"
  on public.study_credit_grants
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.study_credit_grants to authenticated;
