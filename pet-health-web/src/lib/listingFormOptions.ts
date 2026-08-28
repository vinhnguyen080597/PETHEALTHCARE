/** Shared pet-feed listing create options (aligned with mobile CreatePetFeedPostScreen). */

export const LISTING_SPECIES = [
  "dog",
  "cat",
  "bird",
  "fish",
  "rabbit",
  "hamster",
  "reptile",
] as const;

export type ListingSpecies = (typeof LISTING_SPECIES)[number];

/** Shared fallbacks on every species list. */
export const LISTING_SHARED_BREED_KEYS = ["mixed", "other"] as const;

/** Popular dog breeds for VN marketplace listings. */
export const LISTING_DOG_BREED_KEYS = [
  "poodle",
  "poodle_tiny",
  "pomeranian",
  "golden_retriever",
  "labrador",
  "husky",
  "corgi",
  "shiba",
  "chihuahua",
  "pug",
  "french_bulldog",
  "german_shepherd",
  "malinois",
  "phu_quoc",
  "mixed",
  "other",
] as const;

export const LISTING_CAT_BREED_KEYS = [
  "meo_ta",
  "meo_muop",
  "persian",
  "british_shorthair",
  "british_longhair",
  "scottish_fold",
  "maine_coon",
  "ragdoll",
  "siamese",
  "russian_blue",
  "american_shorthair",
  "bengal",
  "sphynx",
  "exotic_shorthair",
  "mixed",
  "other",
] as const;

export const LISTING_BIRD_BREED_KEYS = [
  "cockatiel",
  "budgie",
  "lovebird",
  "canary",
  "parrot",
  "mixed",
  "other",
] as const;

export const LISTING_FISH_BREED_KEYS = [
  "betta",
  "goldfish",
  "guppy",
  "koi",
  "mixed",
  "other",
] as const;

export const LISTING_RABBIT_BREED_KEYS = [
  "holland_lop",
  "mini_rex",
  "netherland_dwarf",
  "mixed",
  "other",
] as const;

export const LISTING_HAMSTER_BREED_KEYS = [
  "syrian",
  "winter_white",
  "campbell",
  "roborovski",
  "mixed",
  "other",
] as const;

export const LISTING_REPTILE_BREED_KEYS = [
  "turtle",
  "gecko",
  "bearded_dragon",
  "snake",
  "mixed",
  "other",
] as const;

const LISTING_BREEDS_BY_SPECIES: Record<ListingSpecies, readonly string[]> = {
  dog: LISTING_DOG_BREED_KEYS,
  cat: LISTING_CAT_BREED_KEYS,
  bird: LISTING_BIRD_BREED_KEYS,
  fish: LISTING_FISH_BREED_KEYS,
  rabbit: LISTING_RABBIT_BREED_KEYS,
  hamster: LISTING_HAMSTER_BREED_KEYS,
  reptile: LISTING_REPTILE_BREED_KEYS,
};

export const LISTING_GENDERS = ["male", "female"] as const;
export const LISTING_AGE_MONTHS = [2, 3, 6, 12, 24] as const;

import { VIETNAM_PROVINCES } from "../constants/vietnamProvinces";

export const LISTING_LOCATIONS = [...VIETNAM_PROVINCES] as const;

export const LISTING_VACCINE_KEYS = [
  "unknown",
  "not_yet",
  "first_dose",
  "basic_done",
  "need_update",
] as const;

export const LISTING_DEWORMING_KEYS = [
  "unknown",
  "not_yet",
  "recent",
  "due",
] as const;

export const LISTING_PERSONALITY_KEYS = [
  "friendly",
  "calm",
  "playful",
  "kidFriendly",
  "petFriendly",
] as const;

export const LISTING_PAPERWORK_KEYS = [
  "vaccineBook",
  "origin",
  "pedigreeOnRequest",
] as const;

export const LISTING_MAX_PHOTOS = 6;
export const LISTING_MAX_HEALTH_EVIDENCE = 3;
/** Keep in sync with backend PET_FEED_PHOTO_MAX_BYTES. */
export const LISTING_PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const LISTING_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
/** Worst-case multipart body for create listing (photos + evidence + video + overhead). */
export const LISTING_MAX_REQUEST_BYTES =
  LISTING_MAX_PHOTOS * LISTING_PHOTO_MAX_BYTES +
  LISTING_MAX_HEALTH_EVIDENCE * LISTING_PHOTO_MAX_BYTES +
  LISTING_MAX_VIDEO_BYTES +
  2 * 1024 * 1024;

/** Next.js middleware/proxy body buffer limit for listing uploads. */
export function listingMaxRequestBodyConfig(): `${number}mb` {
  const mb = Math.ceil(LISTING_MAX_REQUEST_BYTES / (1024 * 1024));
  return `${mb}mb`;
}

export type ListingVaccineKey = (typeof LISTING_VACCINE_KEYS)[number];

export function isListingSpecies(value: string | null | undefined): value is ListingSpecies {
  return (LISTING_SPECIES as readonly string[]).includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

/** Breed dropdown keys for the selected species (always ends with mixed / other). */
export function listingBreedKeysForSpecies(
  species: string | null | undefined,
): readonly string[] {
  const key = String(species ?? "").trim().toLowerCase();
  if (isListingSpecies(key)) return LISTING_BREEDS_BY_SPECIES[key];
  return LISTING_SHARED_BREED_KEYS;
}

/**
 * When species changes: keep the current breed if it still belongs to the new
 * list (e.g. mixed / other); otherwise reset to the first breed of that species.
 * Empty breed stays empty (mobile create form uses a placeholder).
 */
export function nextListingBreedForSpecies(
  species: string | null | undefined,
  currentBreed: string | null | undefined,
): string {
  const keys = listingBreedKeysForSpecies(species);
  const breed = String(currentBreed ?? "").trim();
  if (!breed) return "";
  if (keys.includes(breed)) return breed;
  return keys[0] ?? "other";
}

/** Card / OG emoji for a listing species slug. */
export function listingSpeciesEmoji(species: string | null | undefined): string {
  switch (String(species ?? "").trim().toLowerCase()) {
    case "cat":
      return "🐱";
    case "dog":
      return "🐶";
    case "bird":
      return "🐦";
    case "fish":
      return "🐠";
    case "rabbit":
      return "🐰";
    case "hamster":
      return "🐹";
    case "mouse":
      return "🐭";
    case "reptile":
      return "🐍";
    case "cow":
      return "🐮";
    case "pig":
      return "🐷";
    case "chicken":
      return "🐔";
    default:
      return "🐾";
  }
}

/** Mirror mobile/backend: vaccinated claim requires evidence (not unknown / not yet). */
export function vaccineStatusRequiresHealthEvidence(
  vaccineStatus: string | null | undefined,
): boolean {
  const value = String(vaccineStatus ?? "").trim().toLowerCase();
  if (!value || value === "unknown") return false;
  if (
    value.includes("not yet") ||
    value.includes("not vaccinated") ||
    value.includes("chưa tiêm") ||
    value.includes("chua tiem") ||
    value === "not_yet"
  ) {
    return false;
  }
  return true;
}

export type NewListingValidationInput = {
  title: string;
  species: string;
  breed: string;
  customBreed: string;
  gender: string;
  ageMonths: string;
  location: string;
  priceNote: string;
  vaccineKey: string;
  vaccineLabel: string;
  photoCount: number;
  hasVideo: boolean;
  videoSize?: number;
  healthEvidenceCount: number;
  termsAccepted: boolean;
};

export type NewListingFieldErrors = Partial<
  Record<
    | "title"
    | "species"
    | "breed"
    | "gender"
    | "ageMonths"
    | "location"
    | "priceNote"
    | "photos"
    | "video"
    | "healthEvidence"
    | "terms",
    string
  >
>;

/** Field order for scroll-to-first-error (matches form layout). */
export const NEW_LISTING_FIELD_ORDER = [
  "title",
  "species",
  "breed",
  "gender",
  "ageMonths",
  "location",
  "priceNote",
  "healthEvidence",
  "photos",
  "video",
  "terms",
] as const;

export function firstNewListingErrorField(
  errors: NewListingFieldErrors,
): (typeof NEW_LISTING_FIELD_ORDER)[number] | null {
  for (const id of NEW_LISTING_FIELD_ORDER) {
    if (errors[id]?.trim()) return id;
  }
  return null;
}

export function validateNewListingForm(
  input: NewListingValidationInput,
  messages: Record<keyof NewListingFieldErrors, string>,
  options?: { requireTerms?: boolean },
): NewListingFieldErrors {
  const requireTerms = options?.requireTerms ?? true;
  const errors: NewListingFieldErrors = {};
  if (!input.title.trim()) errors.title = messages.title;
  if (!input.species.trim()) errors.species = messages.species;
  if (
    !input.breed.trim() ||
    (input.breed === "other" && !input.customBreed.trim())
  ) {
    errors.breed = messages.breed;
  }
  if (!input.gender.trim()) errors.gender = messages.gender;
  if (!input.ageMonths.trim()) errors.ageMonths = messages.ageMonths;
  if (!input.location.trim()) errors.location = messages.location;
  if (!input.priceNote.trim()) errors.priceNote = messages.priceNote;
  if (input.photoCount <= 0) errors.photos = messages.photos;
  else if (input.photoCount > LISTING_MAX_PHOTOS) {
    errors.photos = messages.photos;
  }
  if (!input.hasVideo) errors.video = messages.video;
  else if (
    input.videoSize != null &&
    input.videoSize > LISTING_MAX_VIDEO_BYTES
  ) {
    errors.video = messages.video;
  }
  if (
    vaccineStatusRequiresHealthEvidence(input.vaccineLabel) &&
    input.healthEvidenceCount <= 0
  ) {
    errors.healthEvidence = messages.healthEvidence;
  }
  if (requireTerms && !input.termsAccepted) errors.terms = messages.terms;
  return errors;
}

/** Append incoming files up to max (photos / health evidence). */
export function mergeListingMediaFiles(
  current: File[],
  incoming: File[],
  max: number,
): File[] {
  if (max <= 0) return [];
  const next = [...current];
  for (const file of incoming) {
    if (next.length >= max) break;
    if (file && file.size > 0) next.push(file);
  }
  return next;
}

/** Reorder listing photo list (cover = index 0). */
export function moveListingMediaItem(
  files: File[],
  fromIndex: number,
  toIndex: number,
): File[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= files.length ||
    toIndex >= files.length
  ) {
    return files;
  }
  const next = [...files];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
