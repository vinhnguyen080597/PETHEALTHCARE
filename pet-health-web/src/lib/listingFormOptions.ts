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
  "microchip",
  "contract",
] as const;

export const LISTING_MAX_PHOTOS = 6;
export const LISTING_MAX_HEALTH_EVIDENCE = 3;
export const LISTING_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type ListingSpecies = (typeof LISTING_SPECIES)[number];
export type ListingVaccineKey = (typeof LISTING_VACCINE_KEYS)[number];

export function isListingSpecies(value: string | null | undefined): value is ListingSpecies {
  return (LISTING_SPECIES as readonly string[]).includes(
    String(value ?? "").trim().toLowerCase(),
  );
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
