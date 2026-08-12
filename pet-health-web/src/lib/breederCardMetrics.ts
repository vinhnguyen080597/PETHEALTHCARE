import type { BreederProfile, Lang } from "./types";
import { getBreederPublicTrustMetrics } from "./breederTrust";
import { breederDisplaySpecies } from "./breederSpeciesSelection";

export function breederCardSpecialtyLabel(
  breeder: BreederProfile,
  lang: Lang,
): string {
  const breeds = breeder.mainBreeds.filter(Boolean).slice(0, 2);
  const prefix = lang === "VI" ? "Chuyên" : "Specialty";
  const allSpecies = breederDisplaySpecies(breeder.primarySpecies);
  const emoji = allSpecies.includes("dog")
    ? "🐶"
    : allSpecies.includes("bird")
      ? "🦜"
      : "🐱";

  if (breeds.length > 0) {
    return `${emoji} ${prefix}: ${breeds.join(" • ")}`;
  }

  const species = allSpecies
    .map((s) =>
      s === "cat"
        ? lang === "VI"
          ? "Mèo"
          : "Cat"
        : s === "dog"
          ? lang === "VI"
            ? "Chó"
            : "Dog"
          : s,
    )
    .filter(Boolean);

  if (species.length) {
    return `${emoji} ${prefix}: ${species.join(" • ")}`;
  }

  return lang === "VI" ? "🐱 Chuyên: Thú cưng" : "🐱 Specialty: Pets";
}

/** Escrow deposit CTA is deferred — never invent "accepts deposit" from verified alone. */
export function breederCardShowsDepositBadge(_breeder: BreederProfile): boolean {
  return false;
}

export function breederCardShowsSoldCount(petsRehomed: number): boolean {
  return Number.isFinite(petsRehomed) && petsRehomed > 0;
}

export function getBreederCardMetrics(breeder: BreederProfile) {
  const metrics = getBreederPublicTrustMetrics(breeder, {
    listingCount: breeder.activeListings,
  });
  return {
    trustScore: metrics.qualityIndex,
    reviewCount: metrics.reviewCount,
    rating: metrics.rating,
    petsRehomed: metrics.petsRehomed,
    showSold: breederCardShowsSoldCount(metrics.petsRehomed),
    showDepositBadge: breederCardShowsDepositBadge(breeder),
    activeListings: Math.max(0, breeder.activeListings || 0),
  };
}
