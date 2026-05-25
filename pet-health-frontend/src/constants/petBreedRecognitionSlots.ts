/** Multipart field names — must match POST /breed-recognition backend. */
export const BREED_RECOGNITION_ALL_SLOTS = [
  'face',
  'fullBodySide',
  'coat',
  'eyes',
  'headProfile',
  'pawPads',
  'tail',
  'frontFullBody',
  'ears',
  'parentPedigree',
] as const;

export type BreedRecognitionSlot = (typeof BREED_RECOGNITION_ALL_SLOTS)[number];

export type BreedRecognitionSpecies = 'cat' | 'dog';

const COMMON_REQUIRED_SLOTS: readonly BreedRecognitionSlot[] = ['face', 'fullBodySide', 'coat'];

const CAT_SLOT_ORDER: readonly BreedRecognitionSlot[] = [
  'face',
  'fullBodySide',
  'coat',
  'eyes',
  'headProfile',
  'pawPads',
  'tail',
  'parentPedigree',
];

const DOG_SLOT_ORDER: readonly BreedRecognitionSlot[] = [
  'face',
  'fullBodySide',
  'coat',
  'frontFullBody',
  'headProfile',
  'ears',
  'tail',
  'parentPedigree',
];

export const BREED_RECOGNITION_SLOT_ORDER = BREED_RECOGNITION_ALL_SLOTS;

export const BREED_RECOGNITION_REQUIRED_SLOTS = COMMON_REQUIRED_SLOTS;

export const BREED_RECOGNITION_SUPPORTED_SPECIES = ['cat', 'dog'] as const;

export function normalizeBreedRecognitionSpecies(species: string | undefined | null): BreedRecognitionSpecies | null {
  const s = String(species ?? '')
    .toLowerCase()
    .trim();
  return (BREED_RECOGNITION_SUPPORTED_SPECIES as readonly string[]).includes(s) ? (s as BreedRecognitionSpecies) : null;
}

export function isBreedRecognitionSpecies(species: string | undefined | null): boolean {
  return Boolean(normalizeBreedRecognitionSpecies(species));
}

export function getBreedRecognitionSlotOrder(species: string | undefined | null): readonly BreedRecognitionSlot[] {
  return normalizeBreedRecognitionSpecies(species) === 'dog' ? DOG_SLOT_ORDER : CAT_SLOT_ORDER;
}

export function getBreedRecognitionRequiredSlots(_species: string | undefined | null): readonly BreedRecognitionSlot[] {
  return COMMON_REQUIRED_SLOTS;
}
