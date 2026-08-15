/**
 * Temporary: hide public “Verified” chrome until real eligibility rules ship.
 * Keep verification status in data/admin flows; only suppress user-facing marks.
 */
export const SHOW_BREEDER_VERIFICATION_BADGES = false;

export function showBreederVerifiedBadge(verified: boolean): boolean {
  return SHOW_BREEDER_VERIFICATION_BADGES && Boolean(verified);
}
