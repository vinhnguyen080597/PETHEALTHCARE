import type { Lang, Listing } from "./types";
import type { EnKey } from "@/i18n";
import {
  LISTING_AGE_MONTHS,
  LISTING_DEWORMING_KEYS,
  LISTING_GENDERS,
  LISTING_VACCINE_KEYS,
  listingBreedKeysForSpecies,
} from "./listingFormOptions";
import {
  canShowListingUpdateDetails,
  isListingOwner,
  listingEditHref,
} from "./listingOwnerActions";

/** Build PUT body for editing an available listing (keeps existing media on server). */
export function buildListingEditPayload(input: {
  title: string;
  species: string;
  breed: string;
  gender: string;
  ageMonths: number;
  location: string;
  priceNote: string;
  description: string;
  vaccineStatus: string;
  dewormingStatus: string;
  personality: string[];
  paperwork: string[];
}): Record<string, unknown> {
  return {
    title: input.title.trim(),
    species: input.species.trim(),
    breed: input.breed.trim(),
    gender: input.gender.trim(),
    ageMonths: input.ageMonths,
    location: input.location.trim(),
    priceNote: input.priceNote.trim(),
    description: input.description.trim(),
    vaccineStatus: input.vaccineStatus.trim(),
    dewormingStatus: input.dewormingStatus.trim(),
    personality: input.personality,
    paperwork: input.paperwork,
    status: "pending_review",
  };
}

export function matchListingStoredOption(
  keys: readonly string[],
  stored: string | null | undefined,
  fallback: string,
  resolveLabel: (key: string) => string,
): string {
  const value = String(stored ?? "").trim();
  if (!value) return fallback;
  if (keys.includes(value)) return value;
  for (const key of keys) {
    if (resolveLabel(key) === value) return key;
  }
  return fallback;
}

export function resolveListingEditBreed(
  species: string,
  storedBreed: string,
  resolveBreedLabel: (key: string) => string,
): { breedKey: string; customBreed: string } {
  const keys = listingBreedKeysForSpecies(species);
  const stored = storedBreed.trim();
  if (!stored) return { breedKey: "", customBreed: "" };
  const match = keys.find(
    (key) => key === stored || resolveBreedLabel(key) === stored,
  );
  if (match && match !== "other") {
    return { breedKey: match, customBreed: "" };
  }
  return { breedKey: "other", customBreed: stored };
}

export function matchListingChipLabels(
  stored: string[] | null | undefined,
  keys: readonly string[],
  resolveLabel: (key: string) => string,
): string[] {
  const labels = new Set(keys.map(resolveLabel));
  return (stored ?? []).filter((item) => labels.has(item));
}

export function listingEditFormDefaults(
  listing: Listing,
  lang: Lang,
  t: (lang: Lang, key: EnKey) => string,
) {
  const species = listing.species || "cat";
  const resolveGender = (key: string) =>
    t(lang, `listing.new.gender.${key}` as EnKey);
  const resolveVaccine = (key: string) =>
    key === "unknown"
      ? ""
      : t(lang, `listing.new.vaccineShort.${key}` as EnKey);
  const resolveDeworming = (key: string) =>
    key === "unknown"
      ? ""
      : t(lang, `listing.new.dewormingShort.${key}` as EnKey);
  const resolveBreed = (key: string) =>
    t(lang, `listing.new.breed.${key}` as EnKey);
  const resolvePersonality = (key: string) =>
    t(lang, `listing.new.personality.${key}` as EnKey);
  const resolvePaperwork = (key: string) =>
    t(lang, `listing.new.paperwork.${key}` as EnKey);

  const { breedKey, customBreed } = resolveListingEditBreed(
    species,
    listing.breed || "",
    resolveBreed,
  );
  const storedAge = Number(listing.ageMonths) || 0;
  const ageMonths = (LISTING_AGE_MONTHS as readonly number[]).includes(storedAge)
    ? String(storedAge)
    : storedAge > 0
      ? String(storedAge)
      : "";

  return {
    title: lang === "VI" ? listing.titleVI || listing.title : listing.title,
    species,
    breedKey,
    customBreed,
    gender: matchListingStoredOption(
      LISTING_GENDERS,
      listing.gender,
      "male",
      resolveGender,
    ),
    ageMonths,
    location: listing.location || "",
    priceNote: String(listing.price || "").replace(/[^\d]/g, ""),
    description:
      lang === "VI"
        ? listing.descriptionVI || listing.description
        : listing.description,
    vaccineKey: matchListingStoredOption(
      LISTING_VACCINE_KEYS,
      listing.vaccineStatus,
      "unknown",
      resolveVaccine,
    ),
    dewormingKey: matchListingStoredOption(
      LISTING_DEWORMING_KEYS,
      listing.dewormingStatus,
      "unknown",
      resolveDeworming,
    ),
    personality: matchListingChipLabels(
      lang === "VI"
        ? listing.personalityVI?.length
          ? listing.personalityVI
          : listing.personality
        : listing.personality,
      ["friendly", "calm", "playful", "kidFriendly", "petFriendly"],
      resolvePersonality,
    ),
    paperwork: matchListingChipLabels(
      listing.paperwork,
      ["vaccineBook", "origin", "pedigreeOnRequest"],
      resolvePaperwork,
    ),
  };
}

export function canAccessListingEditPage(input: {
  currentUserId: string | null | undefined;
  listing: Listing | null | undefined;
}): boolean {
  if (!input.listing) return false;
  const ownerId = input.listing.ownerUserId || input.listing.breeder.userId;
  return canShowListingUpdateDetails({
    isOwner: isListingOwner(input.currentUserId, ownerId),
    status: input.listing.status,
  });
}

export { listingEditHref };
