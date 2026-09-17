-- User profile preferences collected on mobile complete-profile step.
alter table public.app_user_profiles
  add column if not exists interested_species text[] not null default '{}'::text[];

alter table public.app_user_profiles
  add column if not exists living_area text not null default '';

comment on column public.app_user_profiles.interested_species is
  'Pet species the user cares about (e.g. dog, cat); used for feed personalization.';

comment on column public.app_user_profiles.living_area is
  'User living area / province; used to filter nearby farms and listings.';

create index if not exists idx_app_user_profiles_living_area
  on public.app_user_profiles (living_area)
  where living_area <> '';
