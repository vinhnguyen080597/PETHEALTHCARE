import type { Listing } from "./types";
import {
  isListingNewOnFloor,
  isListingOpenForSale,
  listingCreatedAtMs,
} from "./marketplaceSocialProof";
import { farmPetAvailability } from "./farmPets";

export type LiveTickerKind = "deposit" | "sold" | "new_listing" | "new_batch";

export type LiveTickerItem = {
  id: string;
  kind: LiveTickerKind;
  listingId?: string;
  breederName: string;
  location: string;
  petTitle: string;
  minutesAgo: number;
};

function minutesAgoFrom(ms: number | null, now: number): number {
  if (ms == null) return 3;
  return Math.max(1, Math.min(180, Math.round((now - ms) / 60_000)));
}

function titleOf(listing: Listing): string {
  return (listing.titleVI || listing.title || listing.breed || "pet").trim();
}

/**
 * Build a short live-activity feed from real listing states.
 * Prefer deposit / sold / freshly published pets — no invented buyers.
 */
export function buildLiveTickerItems(
  listings: Listing[],
  now = Date.now(),
  limit = 8,
): LiveTickerItem[] {
  const items: LiveTickerItem[] = [];

  for (const listing of listings) {
    const availability = farmPetAvailability(listing);
    const created = listingCreatedAtMs(listing, now);
    const mins = minutesAgoFrom(created, now);
    const breederName = listing.breeder.name?.trim() || "Breeder";
    const location = listing.location?.trim() || listing.breeder.location?.trim() || "";
    const petTitle = titleOf(listing);

    if (availability === "deposit_hold") {
      items.push({
        id: `deposit-${listing.id}`,
        kind: "deposit",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
      continue;
    }

    if (availability === "completed" && !listing.metadataCancelled) {
      items.push({
        id: `sold-${listing.id}`,
        kind: "sold",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
      continue;
    }

    if (isListingOpenForSale(listing) && isListingNewOnFloor(listing, now)) {
      items.push({
        id: `new-${listing.id}`,
        kind: "new_listing",
        listingId: listing.id,
        breederName,
        location,
        petTitle,
        minutesAgo: mins,
      });
    }
  }

  // Group brand-new open listings into a batch pulse when several arrived.
  const freshOpen = listings.filter(
    (l) => isListingOpenForSale(l) && isListingNewOnFloor(l, now),
  );
  if (freshOpen.length >= 3) {
    items.unshift({
      id: `batch-${freshOpen.length}`,
      kind: "new_batch",
      breederName: "",
      location: "",
      petTitle: String(freshOpen.length),
      minutesAgo: 1,
    });
  }

  // Prefer deposit/sold, then new — stable order by minutesAgo then id.
  const rank: Record<LiveTickerKind, number> = {
    deposit: 0,
    sold: 1,
    new_batch: 2,
    new_listing: 3,
  };
  items.sort((a, b) => {
    const rk = rank[a.kind] - rank[b.kind];
    if (rk !== 0) return rk;
    if (a.minutesAgo !== b.minutesAgo) return a.minutesAgo - b.minutesAgo;
    return a.id.localeCompare(b.id);
  });

  const seen = new Set<string>();
  const unique: LiveTickerItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= limit) break;
  }
  return unique;
}

export function formatTickerMinutes(minutes: number, lang: "EN" | "VI"): string {
  if (minutes <= 1) return lang === "VI" ? "vừa xong" : "just now";
  if (minutes < 60) {
    return lang === "VI" ? `${minutes} phút trước` : `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  return lang === "VI" ? `${hours} giờ trước` : `${hours}h ago`;
}
