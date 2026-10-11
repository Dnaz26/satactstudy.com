alter table public.profiles
  add column if not exists ui_language text not null default 'en';
