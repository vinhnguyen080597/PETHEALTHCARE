-- Run this FIRST on an existing Supabase project (SQL Editor → New query → Run).
-- Safe to re-run: uses IF NOT EXISTS.

alter table public.pets add column if not exists gender text;
alter table public.pets add column if not exists birth_date date;

comment on column public.pets.age is 'Pet age stored as whole months.';
comment on column public.pets.birth_date is 'Pet date of birth (YYYY-MM-DD).';
