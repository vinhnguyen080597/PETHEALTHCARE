import type { BreederProfile } from "./types";
import { getEffectiveTrust } from "./types";

/** Inputs for signal-based quality (aligned with Farm Health / mobile). */
export type BreederQualitySignals = {
  verified: boolean;
  checklistDoneCount: number;
  commitmentsCount: number;
  contactCount: number;
  hasCareEnvironment: boolean;
  activeListings: number;
};

export type BreederPublicTrustMetrics = {
  qualityIndex: number;
  /** Real buyer reviews — 0 until reviews API ships. */
  reviewCount: number;
  /** Average rating 1–5 when reviews exist; null otherwise. */
  rating: number | null;
  /** Pets sold/rehomed — 0 until sold-count ships on public API. */
  petsRehomed: number;
  /** Response SLA minutes — null until messaging metrics exist. */
  responseMinutes: number | null;
};

export function contactFieldCount(
  contact: BreederProfile["contact"] | Record<string, string | undefined>,
): number {
  return Object.values(contact || {}).filter(
    (v) => typeof v === "string" && v.trim().length > 0,
  ).length;
}

/**
 * Quality index from profile completeness signals (0–100).
 * Does not invent social proof (reviews, sold, response time).
 */
export function computeBreederQualityIndex(signals: BreederQualitySignals): number {
  const checklistVal = Math.min(15, Math.max(0, signals.checklistDoneCount) * 3);
  const commitmentsVal = Math.min(15, Math.max(0, signals.commitmentsCount) * 7.5);
  const contactVal =
    signals.contactCount >= 2 ? 15 : signals.contactCount >= 1 ? 7 : 0;
  const careVal = signals.hasCareEnvironment ? 15 : 0;
  const listingsVal = Math.min(10, Math.max(0, signals.activeListings) * 2);
  const verifiedVal = signals.verified ? 30 : 0;
  return Math.round(
    verifiedVal + checklistVal + commitmentsVal + contactVal + careVal + listingsVal,
  );
}

export function qualitySignalsFromBreeder(
  breeder: Pick<
    BreederProfile,
    | "verified"
    | "checklist"
    | "commitments"
    | "contact"
    | "careEnvironment"
    | "bio"
    | "activeListings"
  >,
  listingCount?: number,
): BreederQualitySignals {
  const care =
    (breeder.careEnvironment || "").trim() || (breeder.bio || "").trim();
  return {
    verified: Boolean(breeder.verified),
    checklistDoneCount: breeder.checklist.filter((c) => c.done).length,
    commitmentsCount: breeder.commitments.length,
    contactCount: contactFieldCount(breeder.contact),
    hasCareEnvironment: Boolean(care),
    activeListings:
      typeof listingCount === "number" ? listingCount : breeder.activeListings,
  };
}

/**
 * Public farm / directory metrics.
 * Uses mapped trustScore (stored or signal-computed) after penalty;
 * never fabricates reviews / rating / sold / response.
 */
export function getBreederPublicTrustMetrics(
  breeder: BreederProfile,
  options?: { listingCount?: number },
): BreederPublicTrustMetrics {
  const listingCount = options?.listingCount ?? breeder.activeListings;
  // Prefer profile.trustScore when mapper already resolved stored-or-signals;
  // recompute from signals if score is missing/invalid.
  const fromProfile = getEffectiveTrust(breeder.trustScore, breeder.penaltyPoints);
  const qualityIndex = Number.isFinite(breeder.trustScore)
    ? fromProfile
    : computeBreederQualityIndex(qualitySignalsFromBreeder(breeder, listingCount));

  return {
    qualityIndex: Math.max(0, Math.min(100, qualityIndex)),
    reviewCount: 0,
    rating: null,
    petsRehomed: 0,
    responseMinutes: null,
  };
}

/** Parse metadata trust_score only — no invented verified=70 defaults. */
export function parseStoredTrustScore(meta: Record<string, unknown>): number | null {
  const raw = meta.trust_score ?? meta.trustScore;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, raw));
  }
  const asNum = typeof raw === "string" ? Number(raw) : NaN;
  if (Number.isFinite(asNum)) return Math.max(0, Math.min(100, asNum));
  return null;
}
