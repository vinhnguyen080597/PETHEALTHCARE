import type { Listing } from "./types";
import { isListingNewOnFloor, isListingOpenForSale } from "./marketplaceSocialProof";

export type QuickCategoryId =
  | "all"
  | "british_shorthair"
  | "corgi"
  | "poodle"
  | "munchkin"
  | "just_arrived";

export type QuickCategoryDef = {
  id: QuickCategoryId;
  emoji: string;
  /** Match against breed / title (lowercase). Empty for all / just_arrived. */
  needles: string[];
};

export const MARKETPLACE_QUICK_CATEGORIES: QuickCategoryDef[] = [
  { id: "all", emoji: "✨", needles: [] },
  {
    id: "british_shorthair",
    emoji: "🐱",
    needles: ["british", "aln", "anh lông ngắn", "british shorthair"],
  },
  { id: "corgi", emoji: "🐶", needles: ["corgi"] },
  { id: "poodle", emoji: "🐩", needles: ["poodle"] },
  {
    id: "munchkin",
    emoji: "🐱",
    needles: ["munchkin", "chân ngắn", "chan ngan"],
  },
  { id: "just_arrived", emoji: "🆕", needles: [] },
];

export function parseQuickCategory(raw: string | null | undefined): QuickCategoryId {
  const id = String(raw || "").trim() as QuickCategoryId;
  return MARKETPLACE_QUICK_CATEGORIES.some((c) => c.id === id) ? id : "all";
}

function haystack(listing: Listing): string {
  return `${listing.breed} ${listing.title} ${listing.titleVI}`.toLowerCase();
}

export function listingMatchesQuickCategory(
  listing: Listing,
  category: QuickCategoryId,
  now = Date.now(),
): boolean {
  if (category === "all") return true;
  if (category === "just_arrived") {
    return isListingOpenForSale(listing) && isListingNewOnFloor(listing, now);
  }
  const def = MARKETPLACE_QUICK_CATEGORIES.find((c) => c.id === category);
  if (!def || !def.needles.length) return true;
  const hay = haystack(listing);
  return def.needles.some((n) => hay.includes(n));
}
