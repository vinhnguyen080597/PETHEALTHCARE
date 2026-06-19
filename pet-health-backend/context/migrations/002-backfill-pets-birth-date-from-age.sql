-- Optional one-time backfill for legacy pets that only have `age` (months).
-- Run after 001-pets-birth-date.sql. Safe to re-run: only updates rows still missing birth_date.

update public.pets
set birth_date = (current_date - make_interval(months => age))::date
where birth_date is null
  and age is not null
  and age >= 0;
