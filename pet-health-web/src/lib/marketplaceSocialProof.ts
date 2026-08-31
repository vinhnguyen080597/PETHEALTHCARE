import type { Lang, Listing, WarrantyPolicy } from "./types";
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

/** Short posted date for listing card overlay pills (locale date, no time). */
export function formatListingCardPostedDate(
  iso: string | null | undefined,
  lang: Lang,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const locale = lang === "VI" ? "vi-VN" : "en-US";
  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

export type ListingHotBadge =
  | { kind: "saves"; count: number }
  | { kind: "new" };

/** Feed listing card hero height — matches mobile `LISTING_CARD_IMAGE_HEIGHT`. */
export const LISTING_CARD_IMAGE_HEIGHT_PX = 288;

export type ListingBreederFooterMetrics = {
  /** e.g. "5.0/5 (2)" when breeder has reviews; null otherwise. */
  ratingText: string | null;
  trustScore: number;
};

/** Rating + transparency score on listing card breeder row (mobile parity). */
export function listingBreederFooterMetrics(
  listing: Pick<Listing, "breeder">,
): ListingBreederFooterMetrics {
  const breeder = listing.breeder;
  const reviewCount = Math.max(0, Math.floor(Number(breeder.reviewCount) || 0));
  const reviewAvg = breeder.reviewAverage;
  const ratingText =
    reviewCount > 0 &&
    reviewAvg != null &&
    Number.isFinite(reviewAvg) &&
    reviewAvg > 0
      ? `${(Math.round(reviewAvg * 10) / 10).toFixed(1)}/5 (${reviewCount})`
      : null;
  return {
    ratingText,
    trustScore: Math.max(0, Math.min(100, Math.round(breeder.trustScore || 0))),
  };
}

/**
 * FOMO / interest badges from real signals only.
 * Uses favoriteCount (saves) and createdAt (under 24h) — matches mobile listing card.
 */
export function listingHotBadges(
  listing: Listing,
  now = Date.now(),
): ListingHotBadge[] {
  const badges: ListingHotBadge[] = [];
  const saves = Math.max(0, Math.floor(Number(listing.favoriteCount) || 0));
  if (saves > 0) badges.push({ kind: "saves", count: saves });
  if (isListingNewOnFloor(listing, now)) badges.push({ kind: "new" });
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
