alter table public.app_user_profiles
  add column if not exists is_for_testing boolean not null default false;
