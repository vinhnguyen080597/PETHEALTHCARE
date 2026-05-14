/** Multipart field names — must match POST /breed-recognition backend. */
export const BREED_RECOGNITION_SLOT_ORDER = [
  'face',
  'eyes',
  'pawPads',
  'coat',
  'fullBodySun',
  'parentPedigree',
] as const;

export type BreedRecognitionSlot = (typeof BREED_RECOGNITION_SLOT_ORDER)[number];

export const BREED_RECOGNITION_REQUIRED_SLOTS: readonly BreedRecognitionSlot[] = ['face', 'eyes', 'coat'];

export const BREED_RECOGNITION_SUPPORTED_SPECIES = ['cat', 'dog'] as const;

export function isBreedRecognitionSpecies(species: string | undefined | null): boolean {
  const s = String(species ?? '')
    .toLowerCase()
    .trim();
  return (BREED_RECOGNITION_SUPPORTED_SPECIES as readonly string[]).includes(s);
}
