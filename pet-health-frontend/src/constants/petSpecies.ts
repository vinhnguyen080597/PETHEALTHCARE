/** Launch scope: cat-only until dog health flows are fully tested. */
export const ACTIVE_PET_SPECIES = ['cat'] as const;

/** Add / edit pet form — dog and cat picker (UI always shows both). */
export const ADD_PET_SPECIES_OPTIONS = ['dog', 'cat'] as const;

export type ActivePetSpecies = (typeof ACTIVE_PET_SPECIES)[number];

export const DEFAULT_PET_SPECIES: ActivePetSpecies = 'cat';

/** Species pickers for breeder profile registration. */
export const ACTIVE_BREEDER_SPECIES_OPTIONS = [
  'dog',
  'cat',
  'bird',
  'fish',
  'rabbit',
  'hamster',
  'reptile',
] as const;

/** Pet Feed listing create form + filter chips (excludes legacy `all`). */
export const ACTIVE_PET_FEED_SPECIES = [
  'dog',
  'cat',
  'bird',
  'fish',
  'rabbit',
  'hamster',
  'reptile',
] as const;

export type ActivePetFeedSpecies = (typeof ACTIVE_PET_FEED_SPECIES)[number];

export function isActivePetSpecies(value: string | undefined | null): value is ActivePetSpecies {
  return ACTIVE_PET_SPECIES.includes(String(value ?? '').trim().toLowerCase() as ActivePetSpecies);
}
