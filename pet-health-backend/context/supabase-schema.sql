create extension if not exists "pgcrypto";

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  species text not null,
  breed text,
  age integer,
  gender text,
  avatar_url text,
  created_at timestamptz not null default now()
);

comment on column public.pets.age is 'Pet age stored as whole months.';

-- Existing projects: run once if `pets` was created before `gender` existed.
alter table public.pets add column if not exists gender text;

create index if not exists idx_pets_user_id on public.pets(user_id);
create index if not exists idx_pets_created_at on public.pets(created_at desc);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pet_id uuid not null references public.pets(id) on delete cascade,
  diagnosis text not null,
  severity text not null,
  symptoms jsonb not null default '[]'::jsonb,
  treatment text not null,
  confidence double precision not null default 0,
  disclaimer text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_analyses_user_pet on public.analyses(user_id, pet_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

-- Health check / diagnosis extras (run in SQL Editor on existing projects).
alter table public.analyses add column if not exists extra_image_urls jsonb not null default '[]'::jsonb;
alter table public.analyses add column if not exists video_url text;
alter table public.analyses add column if not exists weight_kg double precision;
alter table public.analyses add column if not exists vaccination_status text;
alter table public.analyses add column if not exists vaccine_type text;
alter table public.analyses add column if not exists neutering_status text;
alter table public.analyses add column if not exists medical_history text;
alter table public.analyses add column if not exists symptom_description text;

-- Original output language + cached translations for Vietnamese UI (see analysis translate-display API).
alter table public.analyses add column if not exists output_locale text;
alter table public.analyses add column if not exists display_translations jsonb not null default '{}'::jsonb;

-- Normalized, policy-checked source of truth for AI health output.
-- Legacy columns above are retained for compatibility and are derived from this assessment contract.
alter table public.analyses add column if not exists assessment jsonb not null default '{}'::jsonb;

-- Health analysis RLS: rows contain pet health data and must only be visible to the owner.
alter table public.analyses enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
drop policy if exists "analyses_insert_own" on public.analyses;
drop policy if exists "analyses_update_own" on public.analyses;
drop policy if exists "analyses_delete_own" on public.analyses;

create policy "analyses_select_own"
on public.analyses for select
to authenticated
using (auth.uid()::text = user_id);

create policy "analyses_insert_own"
on public.analyses for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "analyses_update_own"
on public.analyses for update
to authenticated
using (auth.uid()::text = user_id);

create policy "analyses_delete_own"
on public.analyses for delete
to authenticated
using (auth.uid()::text = user_id);

-- --- Pet RLS: required when the API uses the anon key + user JWT (not service role).
-- Run this block in the SQL Editor if POST /api/v1/pets fails with row-level security errors.
alter table public.pets enable row level security;

drop policy if exists "pets_select_own" on public.pets;
drop policy if exists "pets_insert_own" on public.pets;
drop policy if exists "pets_update_own" on public.pets;
drop policy if exists "pets_delete_own" on public.pets;

create policy "pets_select_own" on public.pets for select using (auth.uid()::text = user_id);
create policy "pets_insert_own" on public.pets for insert with check (auth.uid()::text = user_id);
create policy "pets_update_own" on public.pets for update using (auth.uid()::text = user_id);
create policy "pets_delete_own" on public.pets for delete using (auth.uid()::text = user_id);

-- --- Storage buckets.
-- Private health/profile media uses signed URLs; Pet Feed listing media is public after moderation.
-- Paths from the API are `userId/...` — first segment must match auth.uid() when using user-scoped uploads.

drop policy if exists "pet_images_storage_insert_own" on storage.objects;
drop policy if exists "pet_images_storage_select_public" on storage.objects;
drop policy if exists "private_media_storage_insert_own" on storage.objects;
drop policy if exists "private_media_storage_select_own" on storage.objects;
drop policy if exists "public_pet_feed_storage_insert_own" on storage.objects;
drop policy if exists "public_pet_feed_storage_select_public" on storage.objects;

insert into storage.buckets (id, name, public)
values
  ('pet-health-private-media', 'pet-health-private-media', false),
  ('pet-feed-public-media', 'pet-feed-public-media', true)
on conflict (id) do nothing;

create policy "private_media_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-health-private-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "private_media_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-health-private-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "public_pet_feed_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-feed-public-media'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "public_pet_feed_storage_select_public"
on storage.objects for select
to public
using (bucket_id = 'pet-feed-public-media');

-- --- AI unit economics: durable credits, usage logs, and audit ledger.
-- Run before public scaling so every paid Gemini call has a server-side cost gate.

create table if not exists public.ai_credit_accounts (
  user_id text primary key,
  plan_tier text not null default 'free',
  credit_balance numeric(10,2) not null default 2,
  monthly_allowance numeric(10,2) not null default 0,
  monthly_reset_at timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pet_id uuid references public.pets(id) on delete set null,
  feature text not null,
  model text,
  status text not null,
  cached boolean not null default false,
  credit_cost numeric(10,2) not null default 0,
  estimated_input_tokens integer not null default 0,
  estimated_output_tokens integer not null default 0,
  estimated_cost_usd numeric(10,6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  delta numeric(10,2) not null,
  reason text not null,
  feature text,
  pet_id uuid references public.pets(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_usage_events_user_created on public.ai_usage_events(user_id, created_at desc);
create index if not exists idx_ai_usage_events_feature_created on public.ai_usage_events(feature, created_at desc);
create index if not exists idx_ai_credit_ledger_user_created on public.ai_credit_ledger(user_id, created_at desc);

alter table public.ai_credit_accounts enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.ai_credit_ledger enable row level security;

drop policy if exists "ai_credit_accounts_select_own" on public.ai_credit_accounts;
drop policy if exists "ai_usage_events_select_own" on public.ai_usage_events;
drop policy if exists "ai_credit_ledger_select_own" on public.ai_credit_ledger;

create policy "ai_credit_accounts_select_own"
on public.ai_credit_accounts for select
to authenticated
using (auth.uid()::text = user_id);

create policy "ai_usage_events_select_own"
on public.ai_usage_events for select
to authenticated
using (auth.uid()::text = user_id);

create policy "ai_credit_ledger_select_own"
on public.ai_credit_ledger for select
to authenticated
using (auth.uid()::text = user_id);

-- --- Free core pet care records: diary, vet visits, documents, reminders.

create table if not exists public.pet_care_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pet_id uuid not null references public.pets(id) on delete cascade,
  type text not null check (type in ('diary', 'vet_visit', 'document', 'reminder', 'vaccine', 'weight')),
  title text not null,
  note text not null default '',
  occurred_at timestamptz not null default now(),
  due_at timestamptz,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing projects: widen the record type check when new Care Passport types are added.
alter table public.pet_care_records drop constraint if exists pet_care_records_type_check;
alter table public.pet_care_records add constraint pet_care_records_type_check
check (type in ('diary', 'vet_visit', 'document', 'reminder', 'vaccine', 'weight'));

create index if not exists idx_pet_care_records_user_pet on public.pet_care_records(user_id, pet_id, occurred_at desc);
create index if not exists idx_pet_care_records_type on public.pet_care_records(user_id, type, occurred_at desc);
create index if not exists idx_pet_care_records_due on public.pet_care_records(user_id, due_at) where due_at is not null;

alter table public.pet_care_records enable row level security;

drop policy if exists "pet_care_records_select_own" on public.pet_care_records;
drop policy if exists "pet_care_records_insert_own" on public.pet_care_records;
drop policy if exists "pet_care_records_update_own" on public.pet_care_records;
drop policy if exists "pet_care_records_delete_own" on public.pet_care_records;

create policy "pet_care_records_select_own"
on public.pet_care_records for select
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_care_records_insert_own"
on public.pet_care_records for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "pet_care_records_update_own"
on public.pet_care_records for update
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_care_records_delete_own"
on public.pet_care_records for delete
to authenticated
using (auth.uid()::text = user_id);

-- --- Product analytics events for activation and monetization funnels.

create table if not exists public.app_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pet_id uuid references public.pets(id) on delete set null,
  event text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_events_created on public.app_events(created_at desc);
create index if not exists idx_app_events_user_created on public.app_events(user_id, created_at desc);
create index if not exists idx_app_events_event_created on public.app_events(event, created_at desc);

alter table public.app_events enable row level security;

drop policy if exists "app_events_select_own" on public.app_events;
create policy "app_events_select_own"
on public.app_events for select
to authenticated
using (auth.uid()::text = user_id);

-- --- App account profiles and primary roles.

create table if not exists public.app_user_profiles (
  user_id text primary key,
  email text,
  login_identifier text not null default '',
  display_name text not null default '',
  primary_role text not null default 'sen' check (primary_role in ('sen', 'breeder', 'admin', 'vet')),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_user_profiles_role on public.app_user_profiles(primary_role);
create index if not exists idx_app_user_profiles_status on public.app_user_profiles(account_status);

alter table public.app_user_profiles enable row level security;

drop policy if exists "app_user_profiles_select_own" on public.app_user_profiles;

create policy "app_user_profiles_select_own"
on public.app_user_profiles for select
to authenticated
using (auth.uid()::text = user_id);

-- --- Structured pet discovery feed: breeder profiles, moderated posts, and saved listings.

create table if not exists public.breeder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  display_name text not null,
  bio text not null default '',
  location text not null default '',
  avatar_url text,
  contact jsonb not null default '{}'::jsonb,
  primary_species jsonb not null default '[]'::jsonb,
  main_breeds jsonb not null default '[]'::jsonb,
  care_environment text not null default '',
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected', 'suspended')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.breeder_profiles
  add column if not exists primary_species jsonb not null default '[]'::jsonb,
  add column if not exists main_breeds jsonb not null default '[]'::jsonb,
  add column if not exists care_environment text not null default '';

alter table public.breeder_profiles drop constraint if exists breeder_profiles_verification_status_check;
alter table public.breeder_profiles
  add constraint breeder_profiles_verification_status_check
  check (verification_status in ('unverified', 'pending_review', 'verified', 'rejected', 'suspended'));

create table if not exists public.pet_feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  breeder_profile_id uuid references public.breeder_profiles(id) on delete set null,
  title text not null,
  species text not null,
  breed text not null default '',
  gender text not null default '',
  age_months integer,
  location text not null default '',
  price_note text not null default '',
  description text not null default '',
  personality jsonb not null default '[]'::jsonb,
  vaccine_status text not null default '',
  deworming_status text not null default '',
  paperwork jsonb not null default '[]'::jsonb,
  media_urls jsonb not null default '[]'::jsonb,
  video_url text,
  contact jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pet_feed_posts add column if not exists video_url text;

create table if not exists public.pet_feed_favorites (
  user_id text not null,
  post_id uuid not null references public.pet_feed_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.pet_feed_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  target_type text not null default 'post' check (target_type in ('post', 'breeder_profile')),
  post_id uuid references public.pet_feed_posts(id) on delete cascade,
  breeder_profile_id uuid references public.breeder_profiles(id) on delete cascade,
  reason text not null,
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pet_feed_reports add column if not exists target_type text not null default 'post';
alter table public.pet_feed_reports add column if not exists breeder_profile_id uuid references public.breeder_profiles(id) on delete cascade;
alter table public.pet_feed_reports alter column post_id drop not null;
alter table public.pet_feed_reports drop constraint if exists pet_feed_reports_target_type_check;
alter table public.pet_feed_reports
  add constraint pet_feed_reports_target_type_check
  check (target_type in ('post', 'breeder_profile'));
alter table public.pet_feed_reports drop constraint if exists pet_feed_reports_target_required_check;
alter table public.pet_feed_reports
  add constraint pet_feed_reports_target_required_check
  check (
    (target_type = 'post' and post_id is not null)
    or (target_type = 'breeder_profile' and breeder_profile_id is not null)
  );

create table if not exists public.pet_feed_blocked_breeders (
  user_id text not null,
  breeder_profile_id uuid not null references public.breeder_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, breeder_profile_id)
);

create index if not exists idx_breeder_profiles_user on public.breeder_profiles(user_id);
create index if not exists idx_pet_feed_posts_status_created on public.pet_feed_posts(status, created_at desc);
create index if not exists idx_pet_feed_posts_user_created on public.pet_feed_posts(user_id, created_at desc);
create index if not exists idx_pet_feed_favorites_user on public.pet_feed_favorites(user_id, created_at desc);
create index if not exists idx_pet_feed_reports_status_created on public.pet_feed_reports(status, created_at desc);
create index if not exists idx_pet_feed_reports_breeder_profile on public.pet_feed_reports(breeder_profile_id);
create index if not exists idx_pet_feed_blocked_breeders_user on public.pet_feed_blocked_breeders(user_id, created_at desc);

alter table public.breeder_profiles enable row level security;
alter table public.pet_feed_posts enable row level security;
alter table public.pet_feed_favorites enable row level security;
alter table public.pet_feed_reports enable row level security;
alter table public.pet_feed_blocked_breeders enable row level security;

drop policy if exists "breeder_profiles_select_visible" on public.breeder_profiles;
drop policy if exists "breeder_profiles_insert_own" on public.breeder_profiles;
drop policy if exists "breeder_profiles_update_own" on public.breeder_profiles;
drop policy if exists "pet_feed_posts_select_visible" on public.pet_feed_posts;
drop policy if exists "pet_feed_posts_insert_own" on public.pet_feed_posts;
drop policy if exists "pet_feed_posts_update_own" on public.pet_feed_posts;
drop policy if exists "pet_feed_favorites_select_own" on public.pet_feed_favorites;
drop policy if exists "pet_feed_favorites_insert_own" on public.pet_feed_favorites;
drop policy if exists "pet_feed_favorites_delete_own" on public.pet_feed_favorites;
drop policy if exists "pet_feed_reports_select_own" on public.pet_feed_reports;
drop policy if exists "pet_feed_reports_insert_own" on public.pet_feed_reports;
drop policy if exists "pet_feed_blocked_breeders_select_own" on public.pet_feed_blocked_breeders;
drop policy if exists "pet_feed_blocked_breeders_insert_own" on public.pet_feed_blocked_breeders;
drop policy if exists "pet_feed_blocked_breeders_delete_own" on public.pet_feed_blocked_breeders;

create policy "breeder_profiles_select_visible"
on public.breeder_profiles for select
to authenticated
using (verification_status <> 'suspended' or auth.uid()::text = user_id);

create policy "breeder_profiles_insert_own"
on public.breeder_profiles for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "breeder_profiles_update_own"
on public.breeder_profiles for update
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_feed_posts_select_visible"
on public.pet_feed_posts for select
to authenticated
using (status = 'published' or auth.uid()::text = user_id);

create policy "pet_feed_posts_insert_own"
on public.pet_feed_posts for insert
to authenticated
with check (auth.uid()::text = user_id and status in ('draft', 'pending_review'));

create policy "pet_feed_posts_update_own"
on public.pet_feed_posts for update
to authenticated
using (auth.uid()::text = user_id)
with check (auth.uid()::text = user_id and status in ('draft', 'pending_review'));

create policy "pet_feed_favorites_select_own"
on public.pet_feed_favorites for select
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_feed_favorites_insert_own"
on public.pet_feed_favorites for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "pet_feed_favorites_delete_own"
on public.pet_feed_favorites for delete
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_feed_reports_select_own"
on public.pet_feed_reports for select
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_feed_reports_insert_own"
on public.pet_feed_reports for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "pet_feed_blocked_breeders_select_own"
on public.pet_feed_blocked_breeders for select
to authenticated
using (auth.uid()::text = user_id);

create policy "pet_feed_blocked_breeders_insert_own"
on public.pet_feed_blocked_breeders for insert
to authenticated
with check (auth.uid()::text = user_id);

create policy "pet_feed_blocked_breeders_delete_own"
on public.pet_feed_blocked_breeders for delete
to authenticated
using (auth.uid()::text = user_id);
