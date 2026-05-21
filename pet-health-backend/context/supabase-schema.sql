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

-- --- Storage (image bucket): required when uploads use anon + user JWT (wrong/missing service_role key).
-- Paths from the API are `userId/...` (avatars) or `userId/petId/...` (diagnosis) — first segment must match auth.uid().
-- Replace `pet-diagnosis-images` if your bucket id differs (see SUPABASE_IMAGE_BUCKET / Dashboard → Storage).

drop policy if exists "pet_images_storage_insert_own" on storage.objects;
drop policy if exists "pet_images_storage_select_public" on storage.objects;

create policy "pet_images_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-diagnosis-images'
  and split_part(name, '/', 1) = (select auth.uid()::text)
);

create policy "pet_images_storage_select_public"
on storage.objects for select
to public
using (bucket_id = 'pet-diagnosis-images');

-- --- AI unit economics: durable credits, usage logs, and audit ledger.
-- Run before public scaling so every paid Gemini call has a server-side cost gate.

create table if not exists public.ai_credit_accounts (
  user_id text primary key,
  plan_tier text not null default 'free',
  credit_balance numeric(10,2) not null default 5,
  monthly_allowance numeric(10,2) not null default 5,
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
