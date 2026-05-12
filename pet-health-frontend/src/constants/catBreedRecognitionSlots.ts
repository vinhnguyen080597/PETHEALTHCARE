/** Multipart field names — must match POST /breed-recognition backend. */
export const CAT_BREED_SLOT_ORDER = [
  'face',
  'eyes',
  'pawPads',
  'coat',
  'fullBodySun',
  'parentPedigree',
] as const;

export type CatBreedSlot = (typeof CAT_BREED_SLOT_ORDER)[number];

export const CAT_BREED_REQUIRED_SLOTS: readonly CatBreedSlot[] = ['face', 'eyes', 'coat'];
