import { LISTING_SPECIES } from "./listingFormOptions";
import type { BreederProfile } from "./types";
import { provinceMatchNeedles } from "./vietnamProvinceSelection";

export const BREEDER_SORT_KEYS = [
  "trust",
  "listings",
  "sold",
  "name",
] as const;

export const BREEDER_SPECIES_FILTERS = [
  "all",
  ...LISTING_SPECIES,
] as const;
export type BreederSpeciesFilter = (typeof BREEDER_SPECIES_FILTERS)[number];
export const DEFAULT_BREEDER_SPECIES: BreederSpeciesFilter = "all";

export type BreederSortKey = (typeof BREEDER_SORT_KEYS)[number];

export const DEFAULT_BREEDER_SORT: BreederSortKey = "trust";

export function parseBreederSort(value: unknown): BreederSortKey {
  const s = String(value || "").trim().toLowerCase();
  return (BREEDER_SORT_KEYS as readonly string[]).includes(s)
    ? (s as BreederSortKey)
    : DEFAULT_BREEDER_SORT;
}

export function parseBreederSpecies(value: unknown): BreederSpeciesFilter {
  const s = String(value || "").trim().toLowerCase();
  return (BREEDER_SPECIES_FILTERS as readonly string[]).includes(s)
    ? (s as BreederSpeciesFilter)
    : DEFAULT_BREEDER_SPECIES;
}

export function breederMatchesSpecies(
  breeder: Pick<BreederProfile, "primarySpecies">,
  species: unknown,
): boolean {
  const want = parseBreederSpecies(species);
  if (want === "all") return true;
  const list = Array.isArray(breeder.primarySpecies) ? breeder.primarySpecies : [];
  return list.some((item) => String(item || "").trim().toLowerCase() === want);
}

export function filterBreedersBySpecies(
  breeders: BreederProfile[],
  species: unknown = DEFAULT_BREEDER_SPECIES,
): BreederProfile[] {
  return breeders.filter((breeder) => breederMatchesSpecies(breeder, species));
}

function compactLocation(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function breederMatchesProvince(
  breeder: Pick<BreederProfile, "location">,
  province: string,
): boolean {
  const needles = provinceMatchNeedles(province);
  if (!needles.length) return true;
  const haystack = compactLocation(String(breeder.location || ""));
  if (!haystack) return false;
  return needles.some((needle) => haystack.includes(needle));
}

export function filterBreedersByProvince(
  breeders: BreederProfile[],
  province: string,
): BreederProfile[] {
  const trimmed = String(province || "").trim();
  if (!trimmed) return breeders;
  return breeders.filter((b) => breederMatchesProvince(b, trimmed));
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
