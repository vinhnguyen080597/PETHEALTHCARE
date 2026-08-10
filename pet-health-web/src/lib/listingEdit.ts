import type { Listing } from "./types";
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
    status: "pending_review",
  };
}

export function listingEditFormDefaults(listing: Listing, lang: "EN" | "VI") {
  return {
    title: lang === "VI" ? listing.titleVI || listing.title : listing.title,
    species: listing.species || "cat",
    breed: listing.breed || "",
    gender: listing.gender || "",
    ageMonths: String(listing.ageMonths || ""),
    location: listing.location || "",
    priceNote: String(listing.price || "").replace(/[^\d]/g, ""),
    description:
      lang === "VI"
        ? listing.descriptionVI || listing.description
        : listing.description,
    vaccineStatus: listing.vaccineStatus || "",
    dewormingStatus: listing.dewormingStatus || "",
    personality:
      lang === "VI"
        ? listing.personalityVI?.length
          ? listing.personalityVI
          : listing.personality
        : listing.personality,
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
