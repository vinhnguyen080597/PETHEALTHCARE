import type { Listing, WarrantyPolicy } from "./types";
import { farmPetAvailability } from "./farmPets";

const NEW_LISTING_MS = 24 * 60 * 60 * 1000;

/** Deterministic hash for stable UI signals (not inventing live views). */
export function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function listingCreatedAtMs(listing: Listing, now = Date.now()): number | null {
  const raw = listing.createdAt?.trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms) || ms > now + 60_000) return null;
  return ms;
}

export function isListingNewOnFloor(
  listing: Listing,
  now = Date.now(),
  windowMs = NEW_LISTING_MS,
): boolean {
  const created = listingCreatedAtMs(listing, now);
  if (created == null) return false;
  return now - created <= windowMs;
}

export function listingHasVideo(listing: Listing): boolean {
  return Boolean(listing.videoUrl?.trim());
}

export function listingPreviewImages(listing: Listing, max = 4): string[] {
  const urls = (listing.mediaUrls || [])
    .map((u) => String(u || "").trim())
    .filter(Boolean);
  const primary = String(listing.mediaUrl || "").trim();
  const merged = urls.length ? urls : primary ? [primary] : [];
  const unique: string[] = [];
  for (const url of merged) {
    if (!unique.includes(url)) unique.push(url);
    if (unique.length >= max) break;
  }
  return unique;
}

export type ListingTrustTag =
  | { kind: "warranty"; days: number }
  | { kind: "escrow" }
  | { kind: "vaccine"; label: string };

export function listingWarrantyCoverageDays(
  policy: WarrantyPolicy | null | undefined,
): number | null {
  if (!policy) return null;
  const days = [
    policy.careParvoCoverageDays,
    policy.respiratorySkinCoverageDays,
    policy.congenitalCoverageDays,
  ]
    .map((n) => (typeof n === "number" && Number.isFinite(n) ? n : 0))
    .filter((n) => n > 0);
  if (!days.length) return null;
  return Math.max(...days);
}

/** Trust chips shown under price — only from real listing fields. */
export function listingTrustTags(listing: Listing): ListingTrustTag[] {
  const tags: ListingTrustTag[] = [];
  const warrantyDays = listingWarrantyCoverageDays(listing.warrantyPolicy);
  if (warrantyDays != null) {
    tags.push({ kind: "warranty", days: warrantyDays });
  }
  if (listing.escrowEnabled) {
    tags.push({ kind: "escrow" });
  }
  const vaccine = listing.vaccineStatus?.trim();
  if (vaccine && vaccine !== "—") {
    tags.push({ kind: "vaccine", label: vaccine });
  }
  return tags.slice(0, 2);
}

export type ListingHotBadge =
  | { kind: "saves"; count: number }
  | { kind: "new" }
  | { kind: "video" };

/**
 * FOMO / interest badges from real signals only.
 * Uses favoriteCount (saves), createdAt (under 24h), and videoUrl — never invents live viewers.
 */
export function listingHotBadges(
  listing: Listing,
  now = Date.now(),
): ListingHotBadge[] {
  const badges: ListingHotBadge[] = [];
  const saves = Math.max(0, Math.floor(Number(listing.favoriteCount) || 0));
  if (saves > 0) badges.push({ kind: "saves", count: saves });
  if (isListingNewOnFloor(listing, now)) badges.push({ kind: "new" });
  if (listingHasVideo(listing)) badges.push({ kind: "video" });
  return badges.slice(0, 3);
}

export function listingInterestScore(listing: Listing, now = Date.now()): number {
  const saves = Math.max(0, Math.floor(Number(listing.favoriteCount) || 0));
  const newBoost = isListingNewOnFloor(listing, now) ? 8 : 0;
  const videoBoost = listingHasVideo(listing) ? 4 : 0;
  const trust = Math.max(0, Math.round(listing.breeder.trustScore || 0)) / 10;
  return saves * 3 + newBoost + videoBoost + trust;
}

export function isListingOpenForSale(listing: Listing): boolean {
  if (listing.ownerDeleted) return false;
  if (listing.status === "cancelled" || listing.metadataCancelled) return false;
  return farmPetAvailability(listing) === "for_sale";
}
