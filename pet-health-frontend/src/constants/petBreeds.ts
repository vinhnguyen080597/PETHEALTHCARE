/** Popular cat breeds for Pet Feed create form (VN market). */
export const POPULAR_CAT_BREED_KEYS = [
  'meo_ta',
  'meo_muop',
  'persian',
  'british_shorthair',
  'british_longhair',
  'scottish_fold',
  'maine_coon',
  'ragdoll',
  'siamese',
  'russian_blue',
  'american_shorthair',
  'bengal',
  'sphynx',
  'exotic_shorthair',
  'mixed',
  'other',
] as const;

export type PopularCatBreedKey = (typeof POPULAR_CAT_BREED_KEYS)[number];
