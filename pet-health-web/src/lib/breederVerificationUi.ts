/**
 * Public Verified badge respects compliance strip / low compliance bands.
 * Global chrome flag remains off until product enables it; when on, compliance can still hide.
 */
export const SHOW_BREEDER_VERIFICATION_BADGES = false;

export function showBreederVerifiedBadge(
  verified: boolean,
  options?: { complianceStripped?: boolean },
): boolean {
  if (!SHOW_BREEDER_VERIFICATION_BADGES) return false;
  if (!verified) return false;
  if (options?.complianceStripped) return false;
  return true;
}
