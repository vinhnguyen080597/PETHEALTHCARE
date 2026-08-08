import type { BreederProfile } from "./types";

export const BREEDER_SORT_KEYS = [
  "trust",
  "listings",
  "sold",
  "name",
] as const;

export type BreederSortKey = (typeof BREEDER_SORT_KEYS)[number];

export const DEFAULT_BREEDER_SORT: BreederSortKey = "trust";

export function parseBreederSort(value: unknown): BreederSortKey {
  const s = String(value || "").trim().toLowerCase();
  return (BREEDER_SORT_KEYS as readonly string[]).includes(s)
    ? (s as BreederSortKey)
    : DEFAULT_BREEDER_SORT;
}

function petsRehomedOf(breeder: BreederProfile): number {
  const n = Number(breeder.petsRehomed);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Stable client-side sort for the Top Breeders directory. */
export function sortBreeders(
  breeders: BreederProfile[],
  sortKey: BreederSortKey = DEFAULT_BREEDER_SORT,
): BreederProfile[] {
  const key = parseBreederSort(sortKey);
  const list = [...breeders];

  list.sort((a, b) => {
    if (key === "trust") {
      const d = (b.trustScore || 0) - (a.trustScore || 0);
      if (d !== 0) return d;
      return (b.activeListings || 0) - (a.activeListings || 0);
    }
    if (key === "listings") {
      const d = (b.activeListings || 0) - (a.activeListings || 0);
      if (d !== 0) return d;
      return (b.trustScore || 0) - (a.trustScore || 0);
    }
    if (key === "sold") {
      const d = petsRehomedOf(b) - petsRehomedOf(a);
      if (d !== 0) return d;
      return (b.trustScore || 0) - (a.trustScore || 0);
    }
    // name
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  return list;
}
