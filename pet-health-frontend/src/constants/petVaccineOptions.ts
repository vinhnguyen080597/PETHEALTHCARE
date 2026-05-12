/** Stable ids for FormData / server; labels come from i18n `healthCheck.vaccines.<id>`. */

export const DOG_VACCINE_IDS = ['dog_5in1_dhppl', 'dog_7in1', 'dog_rabies', 'dog_bordetella'] as const;
export const CAT_VACCINE_IDS = ['cat_3in1_fvrcp', 'cat_4in1', 'cat_rabies', 'cat_felv'] as const;

const DOG_SET = new Set<string>(DOG_VACCINE_IDS);
const CAT_SET = new Set<string>(CAT_VACCINE_IDS);

export function vaccineIdsForPetSpecies(species: string): readonly string[] | null {
  const s = species.trim().toLowerCase();
  if (s === 'dog') return DOG_VACCINE_IDS;
  if (s === 'cat') return CAT_VACCINE_IDS;
  return null;
}

export function isKnownVaccineIdForSpecies(species: string, id: string): boolean {
  const s = species.trim().toLowerCase();
  if (s === 'dog') return DOG_SET.has(id);
  if (s === 'cat') return CAT_SET.has(id);
  return false;
}
