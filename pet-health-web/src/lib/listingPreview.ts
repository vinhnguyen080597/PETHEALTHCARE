import type { BreederProfile, Listing, WarrantyPolicy } from "./types";

export type ListingPreviewInput = {
  title: string;
  untitledFallback: string;
  species: string;
  breed: string;
  gender: string;
  ageMonths: number;
  location: string;
  priceNote: string;
  description: string;
  personality: string[];
  vaccineStatus: string;
  dewormingStatus: string;
  mediaUrl: string;
  breeder: BreederProfile;
  warrantyPolicy?: WarrantyPolicy | null;
  escrowEnabled?: boolean;
};

/** Build a Listing shaped like New Pets cards for create-form review preview. */
export function buildListingPreview(input: ListingPreviewInput): Listing {
  const title = input.title.trim() || input.untitledFallback;
  const mediaUrl = input.mediaUrl.trim();
  return {
    id: "preview",
    title,
    titleVI: title,
    species: input.species,
    breed: input.breed,
    gender: input.gender,
    ageMonths: Number.isFinite(input.ageMonths) ? input.ageMonths : 0,
    location: input.location,
    price: input.priceNote,
    description: input.description,
    descriptionVI: input.description,
    personality: input.personality,
    personalityVI: input.personality,
    vaccineStatus: input.vaccineStatus,
    dewormingStatus: input.dewormingStatus,
    mediaUrl,
    mediaUrls: mediaUrl ? [mediaUrl] : [],
    status: "pending_review",
    breeder: input.breeder,
    saved: false,
    escrowEnabled: Boolean(input.escrowEnabled),
    warrantyPolicy: input.warrantyPolicy ?? null,
    deal: null,
  };
}
