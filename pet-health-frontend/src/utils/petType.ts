import type { BreederProfile, PetFeedPost } from '../types';

export type PetType =
  | 'dog'
  | 'cat'
  | 'bird'
  | 'fish'
  | 'rabbit'
  | 'hamster'
  | 'mouse'
  | 'reptile'
  | 'cow'
  | 'pig'
  | 'chicken';

export type PetTypeFilter = 'all' | PetType;

export const PET_TYPES: readonly PetType[] = [
  'dog',
  'cat',
  'bird',
  'fish',
  'rabbit',
  'hamster',
  'mouse',
  'reptile',
  'cow',
  'pig',
  'chicken',
] as const;

const PET_TYPE_SET = new Set<string>(PET_TYPES);

export function isPetType(value: string | null | undefined): value is PetType {
  return PET_TYPE_SET.has(String(value ?? '').trim().toLowerCase());
}

export function normalizePetType(value: string | null | undefined): PetType | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dog' || normalized === 'chó' || normalized === 'cho') return 'dog';
  if (normalized === 'cat' || normalized === 'mèo' || normalized === 'meo') return 'cat';
  if (normalized === 'bird' || normalized === 'chim') return 'bird';
  if (
    normalized === 'fish' ||
    normalized === 'cá' ||
    normalized === 'ca' ||
    normalized === 'cá cảnh' ||
    normalized === 'ca canh' ||
    normalized === 'aquarium'
  ) {
    return 'fish';
  }
  if (normalized === 'rabbit' || normalized === 'thỏ' || normalized === 'tho') return 'rabbit';
  if (normalized === 'hamster') return 'hamster';
  if (normalized === 'mouse' || normalized === 'chuột' || normalized === 'chuot') return 'mouse';
  if (
    normalized === 'reptile' ||
    normalized === 'reptiles' ||
    normalized === 'bò sát' ||
    normalized === 'bo sat'
  ) {
    return 'reptile';
  }
  if (normalized === 'cow' || normalized === 'bò' || normalized === 'bo' || normalized === 'cattle') return 'cow';
  if (normalized === 'pig' || normalized === 'heo' || normalized === 'lợn' || normalized === 'lon') return 'pig';
  if (normalized === 'chicken' || normalized === 'gà' || normalized === 'ga') return 'chicken';
  return isPetType(normalized) ? normalized : null;
}

export function resolvePostPetType(post: Pick<PetFeedPost, 'pet_type' | 'species'>): PetType | null {
  if (isPetType(post.pet_type)) return post.pet_type;
  return normalizePetType(post.species);
}

export function resolvePetTypeFromSpeciesList(speciesList: unknown): PetType | null {
  if (!Array.isArray(speciesList)) return null;
  for (const item of speciesList) {
    const petType = normalizePetType(String(item ?? ''));
    if (petType) return petType;
  }
  return null;
}

export function postMatchesPetType(post: Pick<PetFeedPost, 'pet_type' | 'species'>, filter: PetType): boolean {
  return resolvePostPetType(post) === filter;
}

export function resolveBreederPetType(
  profile: Pick<BreederProfile, 'pet_type' | 'primary_species'>,
): PetType | null {
  if (isPetType(profile.pet_type)) return profile.pet_type;
  return resolvePetTypeFromSpeciesList(profile.primary_species);
}

export function breederMatchesPetType(
  profile: Pick<BreederProfile, 'pet_type' | 'primary_species'>,
  filter: PetType,
  postSpecies: string[] = [],
): boolean {
  const primary = Array.isArray(profile.primary_species) ? profile.primary_species : [];
  if (primary.some((species) => normalizePetType(species) === filter)) {
    return true;
  }
  if (resolveBreederPetType(profile) === filter) return true;
  return postSpecies.some((species) => normalizePetType(species) === filter);
}
