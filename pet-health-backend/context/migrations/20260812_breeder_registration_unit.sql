-- Breeder profile: dedicated registration unit column; drop secondary_species.
alter table public.breeder_profiles
  add column if not exists registration_unit text not null default '',
  add column if not exists registration_unit_other text not null default '';

update public.breeder_profiles
set
  registration_unit = coalesce(
    nullif(trim(registration_unit), ''),
    nullif(trim(metadata->>'registrationUnit'), ''),
    nullif(trim(metadata->>'registration_unit'), ''),
    ''
  ),
  metadata = coalesce(metadata, '{}'::jsonb)
    - 'registrationUnit'
    - 'registration_unit'
where true;

alter table public.breeder_profiles
  drop column if exists secondary_species;
