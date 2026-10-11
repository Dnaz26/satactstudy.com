create table if not exists public.study_payout_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null unique,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null check (status in ('pending', 'paid', 'failed')),
  stripe_transfer_id text unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists study_payouts_one_pending
  on public.study_payouts (user_id)
  where status = 'pending';

alter table public.study_payout_accounts enable row level security;
alter table public.study_payouts enable row level security;

drop policy if exists "read own payout account" on public.study_payout_accounts;
create policy "read own payout account"
  on public.study_payout_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "read own payouts" on public.study_payouts;
create policy "read own payouts"
  on public.study_payouts
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select on public.study_payout_accounts to authenticated;
grant select on public.study_payouts to authenticated;
