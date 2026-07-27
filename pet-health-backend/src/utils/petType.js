/** @typedef {'dog' | 'cat' | 'bird' | 'fish' | 'mouse' | 'cow' | 'pig' | 'chicken'} PetType */

const PET_TYPES = new Set(['dog', 'cat', 'bird', 'fish', 'mouse', 'cow', 'pig', 'chicken']);

/**
 * @param {unknown} value
 * @returns {value is PetType}
 */
function isPetType(value) {
  return PET_TYPES.has(String(value ?? '').trim().toLowerCase());
}

/**
 * @param {unknown} value
 * @returns {PetType | null}
 */
export function normalizePetType(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'dog' || normalized === 'chó' || normalized === 'cho') return 'dog';
  if (normalized === 'cat' || normalized === 'mèo' || normalized === 'meo') return 'cat';
  if (normalized === 'bird' || normalized === 'chim') return 'bird';
  if (normalized === 'fish' || normalized === 'cá' || normalized === 'ca') return 'fish';
  if (normalized === 'mouse' || normalized === 'chuột' || normalized === 'chuot' || normalized === 'hamster') return 'mouse';
  if (normalized === 'cow' || normalized === 'bò' || normalized === 'bo' || normalized === 'cattle') return 'cow';
  if (normalized === 'pig' || normalized === 'heo' || normalized === 'lợn' || normalized === 'lon') return 'pig';
  if (normalized === 'chicken' || normalized === 'gà' || normalized === 'ga') return 'chicken';
  return isPetType(normalized) ? normalized : null;
}

/**
 * @param {unknown} speciesList
 * @returns {PetType | null}
 */
export function resolvePetTypeFromSpeciesList(speciesList) {
  if (!Array.isArray(speciesList)) return null;
  for (const item of speciesList) {
    const petType = normalizePetType(item);
    if (petType) return petType;
  }
  return null;
}

/**
 * @param {string | null | undefined} species
 * @returns {PetType | null}
 */
export function resolvePostPetType(species) {
  return normalizePetType(species);
}

/**
 * @param {{ primary_species?: unknown[] } | null | undefined} profile
 * @returns {PetType | null}
 */
export function resolveBreederPetType(profile) {
  if (!profile) return null;
  return resolvePetTypeFromSpeciesList(profile.primary_species);
}
