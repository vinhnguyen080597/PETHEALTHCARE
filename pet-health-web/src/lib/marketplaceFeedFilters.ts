/** Shared feed filter helpers for Thú cưng marketplace grid. */

export type PriceFilter = "all" | "under5" | "5to15" | "over15";

/**
 * Gender + escrow were separate dropdowns; merge into one "extra" filter
 * so the toolbar stays compact after species/province move down.
 */
export type FeedExtraFilter = "all" | "male" | "female" | "escrow";

export function parsePriceFilter(value: string): PriceFilter {
  if (value === "under5" || value === "5to15" || value === "over15") return value;
  return "all";
}

export function parseFeedExtraFilter(value: string): FeedExtraFilter {
  if (value === "male" || value === "female" || value === "escrow") return value;
  return "all";
}

export function feedExtraToGender(extra: FeedExtraFilter): string {
  if (extra === "male" || extra === "female") return extra;
  return "all";
}

export function feedExtraToEscrowOnly(extra: FeedExtraFilter): boolean {
  return extra === "escrow";
}
