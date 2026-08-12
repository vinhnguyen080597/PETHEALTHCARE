-- Breeder profile: one primary species + optional secondary species list.
alter table public.breeder_profiles
  add column if not exists secondary_species jsonb not null default '[]'::jsonb;
