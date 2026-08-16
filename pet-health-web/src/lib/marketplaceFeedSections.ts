import type { BreederProfile, Listing } from "./types";
import {
  isListingNewOnFloor,
  isListingOpenForSale,
  listingInterestScore,
} from "./marketplaceSocialProof";

export function pickTopInterestedListings(
  listings: Listing[],
  limit = 8,
  now = Date.now(),
): Listing[] {
  return listings
    .filter(isListingOpenForSale)
    .map((listing) => ({
      listing,
      score: listingInterestScore(listing, now),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.listing.id.localeCompare(b.listing.id);
    })
    .slice(0, limit)
    .map((row) => row.listing);
}

export function pickJustArrivedListings(
  listings: Listing[],
  limit = 8,
  now = Date.now(),
): Listing[] {
  return listings
    .filter((l) => isListingOpenForSale(l) && isListingNewOnFloor(l, now))
    .sort((a, b) => {
      const ta = Date.parse(a.createdAt || "") || 0;
      const tb = Date.parse(b.createdAt || "") || 0;
      if (tb !== ta) return tb - ta;
      return a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}

/** @deprecated Prefer pickHallOfFameBreeders for directory podium. */
export function pickFeaturedBreedersOfWeek(
  breeders: BreederProfile[],
  limit = 3,
): BreederProfile[] {
  return pickHallOfFameBreeders(breeders, limit).map((row) => row.breeder);
}

export type HallOfFameRank = 1 | 2 | 3;

export type HallOfFameEntry = {
  breeder: BreederProfile;
  rank: HallOfFameRank;
  medal: "gold" | "silver" | "bronze";
};

function hallOfFameScore(breeder: BreederProfile): number {
  const rating = Number(breeder.reviewAverage) || 0;
  const reviews = Math.max(0, Math.floor(Number(breeder.reviewCount) || 0));
  const trust = Math.max(0, Math.round(breeder.trustScore || 0));
  const sold = Math.max(0, Math.floor(Number(breeder.petsRehomed) || 0));
  return rating * 1000 + reviews * 20 + trust * 2 + sold;
}

/**
 * Top kennels for Hall of Fame — ranking by review quality/volume, then trust.
 * Medals: gold / silver / bronze for ranks 1–3.
 */
export function pickHallOfFameBreeders(
  breeders: BreederProfile[],
  limit = 3,
): HallOfFameEntry[] {
  const medals = ["gold", "silver", "bronze"] as const;
  return [...breeders]
    .filter((b) => (b.reviewCount || 0) > 0 || (b.trustScore || 0) >= 40)
    .sort((a, b) => {
      const d = hallOfFameScore(b) - hallOfFameScore(a);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.min(3, limit))
    .map((breeder, index) => ({
      breeder,
      rank: (index + 1) as HallOfFameRank,
      medal: medals[index]!,
    }));
}

export function hallOfFameMonthKey(now = new Date()): string {
  const month = now.getMonth() + 1;
  return String(month).padStart(2, "0");
}

export type BreederPetThumb = {
  listingId: string;
  mediaUrl: string;
  title: string;
  price: string;
  species: string;
};

/** Up to `perBreeder` open-sale pet thumbs keyed by breeder id. */
export function groupBreederPetThumbs(
  listings: Listing[],
  perBreeder = 4,
): Record<string, BreederPetThumb[]> {
  const map: Record<string, BreederPetThumb[]> = {};
  for (const listing of listings) {
    if (!isListingOpenForSale(listing)) continue;
    const breederId = listing.breeder?.id;
    if (!breederId) continue;
    const mediaUrl = String(listing.mediaUrl || "").trim();
    if (!mediaUrl) continue;
    const bucket = map[breederId] || (map[breederId] = []);
    if (bucket.length >= perBreeder) continue;
    bucket.push({
      listingId: listing.id,
      mediaUrl,
      title: (listing.titleVI || listing.title || listing.breed || "").trim(),
      price: String(listing.price || "").trim(),
      species: String(listing.species || "").trim().toLowerCase(),
    });
  }
  return map;
}
