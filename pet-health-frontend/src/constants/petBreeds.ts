/** Keep in sync with pet-health-web `listingFormOptions` breed catalogs. */

export const LISTING_SHARED_BREED_KEYS = ['mixed', 'other'] as const;

export const LISTING_DOG_BREED_KEYS = [
  'poodle',
  'poodle_tiny',
  'pomeranian',
  'golden_retriever',
  'labrador',
  'husky',
  'corgi',
  'shiba',
  'chihuahua',
  'pug',
  'french_bulldog',
  'german_shepherd',
  'malinois',
  'phu_quoc',
  'mixed',
  'other',
] as const;

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

export const LISTING_BIRD_BREED_KEYS = [
  'cockatiel',
  'budgie',
  'lovebird',
  'canary',
  'parrot',
  'mixed',
  'other',
] as const;

export const LISTING_FISH_BREED_KEYS = [
  'betta',
  'goldfish',
  'guppy',
  'koi',
  'mixed',
  'other',
] as const;

export const LISTING_RABBIT_BREED_KEYS = [
  'holland_lop',
  'mini_rex',
  'netherland_dwarf',
  'mixed',
  'other',
] as const;

export const LISTING_HAMSTER_BREED_KEYS = [
  'syrian',
  'winter_white',
  'campbell',
  'roborovski',
  'mixed',
  'other',
] as const;

export const LISTING_REPTILE_BREED_KEYS = [
  'turtle',
  'gecko',
  'bearded_dragon',
  'snake',
  'mixed',
  'other',
] as const;

const BREEDS_BY_SPECIES: Record<string, readonly string[]> = {
  dog: LISTING_DOG_BREED_KEYS,
  cat: POPULAR_CAT_BREED_KEYS,
  bird: LISTING_BIRD_BREED_KEYS,
  fish: LISTING_FISH_BREED_KEYS,
  rabbit: LISTING_RABBIT_BREED_KEYS,
  hamster: LISTING_HAMSTER_BREED_KEYS,
  reptile: LISTING_REPTILE_BREED_KEYS,
};

export function listingBreedKeysForSpecies(species: string | null | undefined): readonly string[] {
  const key = String(species ?? '').trim().toLowerCase();
  return BREEDS_BY_SPECIES[key] ?? LISTING_SHARED_BREED_KEYS;
}

/**
 * When species changes: keep the current breed if it still belongs to the new
 * list (e.g. mixed / other); otherwise reset to the first breed of that species.
 * Empty breed stays empty so the create form can keep its placeholder.
 */
export function nextListingBreedForSpecies(
  species: string | null | undefined,
  currentBreed: string | null | undefined,
): string {
  const keys = listingBreedKeysForSpecies(species);
  const breed = String(currentBreed ?? '').trim();
  if (!breed) return '';
  if (keys.includes(breed)) return breed;
  return keys[0] ?? 'other';
}
