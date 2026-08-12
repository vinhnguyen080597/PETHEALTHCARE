-- Simplify breeder profiles: keep short bio only; drop scale/breeding/checklist metadata and care_environment.
update public.breeder_profiles
set
  bio = case
    when coalesce(trim(bio), '') = '' and coalesce(trim(care_environment), '') <> ''
      then trim(care_environment)
    else bio
  end,
  metadata = coalesce(metadata, '{}'::jsonb)
    - 'scaleRange'
    - 'scale_range'
    - 'breedingPetRange'
    - 'breeding_pet_range'
    - 'careChecklist'
    - 'care_checklist'
where true;

alter table public.breeder_profiles drop column if exists care_environment;
