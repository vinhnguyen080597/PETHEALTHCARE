import type { BreederProfile } from "./types";

/**
 * Activity cue for directory cards — never invents a live "online" presence.
 * Uses review volume + trust + active listings as a response-readiness signal.
 */
export type BreederActivityCue =
  | { kind: "fast_response" }
  | { kind: "active_kennel" }
  | { kind: "none" };

export function breederActivityCue(breeder: BreederProfile): BreederActivityCue {
  const trust = Math.max(0, Math.round(breeder.trustScore || 0));
  const reviews = Math.max(0, Math.floor(breeder.reviewCount || 0));
  const active = Math.max(0, Math.floor(breeder.activeListings || 0));
  const responseHours =
    breeder.warrantyPolicies?.find((p) => (p.breederResponseHours || 0) > 0)
      ?.breederResponseHours ?? null;

  if (
    (responseHours != null && responseHours <= 1) ||
    (trust >= 70 && reviews >= 3 && active > 0)
  ) {
    return { kind: "fast_response" };
  }
  if (active > 0 || trust >= 40) {
    return { kind: "active_kennel" };
  }
  return { kind: "none" };
}
