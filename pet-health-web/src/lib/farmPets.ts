import type { Listing } from "./types";

/** Listing statuses shown on the farm "Thú cưng" tab. */
export type FarmPetAvailability = "for_sale" | "deposit_hold" | "completed";

/** Filter options for the farm pets toolbar (includes show-all). */
export type FarmPetAvailabilityFilter = "all" | FarmPetAvailability;

export const FARM_PET_AVAILABILITY_FILTERS = [
  "all",
  "for_sale",
  "deposit_hold",
  "completed",
] as const satisfies readonly FarmPetAvailabilityFilter[];

export type FarmPetAvailabilityCounts = Record<FarmPetAvailability, number>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** True when metadata marks a listing as sold/rehomed (positive close). */
export function listingMetadataMarksSold(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const meta = asRecord(metadata);
  const outcome = String(meta.listing_outcome ?? meta.outcome ?? "")
    .trim()
    .toLowerCase();
  if (outcome === "cancelled" || outcome === "canceled") return false;
  if (outcome === "sold" || outcome === "completed" || outcome === "rehomed") {
    return true;
  }
  return (
    meta.sold === true ||
    meta.completed === true ||
    meta.rehomed === true ||
    meta.sold === 1 ||
    meta.sold === "true" ||
    meta.sold === "1"
  );
}

/** True when metadata marks a listing as deposit-cancelled (negative close). */
export function listingMetadataMarksCancelled(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const meta = asRecord(metadata);
  const outcome = String(meta.listing_outcome ?? meta.outcome ?? "")
    .trim()
    .toLowerCase();
  if (outcome === "cancelled" || outcome === "canceled") return true;
  return (
    meta.cancelled === true ||
    meta.cancelled === 1 ||
    meta.cancelled === "true" ||
    meta.cancelled === "1"
  );
}

/** Future trust scoring: sold adds, cancelled subtracts. */
export function listingTrustOutcome(
  listing: Pick<FarmPetListingFields, "status" | "metadataSold" | "metadataCancelled">,
): "positive" | "negative" | null {
  if (listing.status === "cancelled" || listing.metadataCancelled) return "negative";
  if (listing.status === "sold" || listing.metadataSold) return "positive";
  return null;
}

export type FarmPetListingFields = Pick<Listing, "status"> & {
  metadataSold?: boolean;
  metadataCancelled?: boolean;
  ownerDeleted?: boolean;
};

export function farmPetAvailability(
  listing: FarmPetListingFields,
): FarmPetAvailability | null {
  if (listing.ownerDeleted) return null;
  if (listing.status === "deposit_hold") return "deposit_hold";
  if (
    listing.status === "sold" ||
    listing.status === "cancelled" ||
    listing.metadataSold ||
    listing.metadataCancelled
  ) {
    return "completed";
  }
  if (listing.status === "published") return "for_sale";
  return null;
}

/** Rehomed count for trust — sold only, never cancelled. */
export function isFarmRehomedListing(listing: FarmPetListingFields): boolean {
  if (listing.ownerDeleted) return false;
  if (listing.status === "cancelled" || listing.metadataCancelled) return false;
  return listing.status === "sold" || Boolean(listing.metadataSold);
}

export function countFarmPetsRehomed(listings: FarmPetListingFields[]): number {
  return listings.filter(isFarmRehomedListing).length;
}

/** Pets for sale + deposit hold + completed/sold. */
export function isFarmPetListing(listing: FarmPetListingFields): boolean {
  return farmPetAvailability(listing) != null;
}

function availabilityRank(value: FarmPetAvailability | null): number {
  if (value === "for_sale") return 0;
  if (value === "deposit_hold") return 1;
  if (value === "completed") return 2;
  return 9;
}

/** For-sale first, then deposit hold, then completed. */
export function sortFarmPets<T extends FarmPetListingFields>(listings: T[]): T[] {
  return [...listings]
    .filter(isFarmPetListing)
    .sort(
      (a, b) =>
        availabilityRank(farmPetAvailability(a)) -
        availabilityRank(farmPetAvailability(b)),
    );
}

export function farmPetTabCount(listings: FarmPetListingFields[]): number {
  return listings.filter(isFarmPetListing).length;
}

export function countFarmPetsByAvailability(
  listings: FarmPetListingFields[],
): FarmPetAvailabilityCounts {
  const counts: FarmPetAvailabilityCounts = {
    for_sale: 0,
    deposit_hold: 0,
    completed: 0,
  };
  for (const listing of listings) {
    const availability = farmPetAvailability(listing);
    if (availability) counts[availability] += 1;
  }
  return counts;
}

export function parseFarmPetAvailabilityFilter(
  value: string | null | undefined,
): FarmPetAvailabilityFilter {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (
    raw === "for_sale" ||
    raw === "deposit_hold" ||
    raw === "completed" ||
    raw === "all"
  ) {
    return raw;
  }
  return "all";
}

export function filterFarmPetsByAvailability<T extends FarmPetListingFields>(
  listings: T[],
  filter: FarmPetAvailabilityFilter,
): T[] {
  const sorted = sortFarmPets(listings);
  if (filter === "all") return sorted;
  return sorted.filter((listing) => farmPetAvailability(listing) === filter);
}
