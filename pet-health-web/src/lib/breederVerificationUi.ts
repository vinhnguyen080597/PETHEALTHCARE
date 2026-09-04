/**
 * Farm chrome Verified badges stay behind this flag until product enables them.
 * Marketplace call sites pass `gated: false` so listing/home badges still render,
 * while compliance strip can hide them everywhere.
 */
export const SHOW_BREEDER_VERIFICATION_BADGES = false;

export function showBreederVerifiedBadge(
  verified: boolean,
  options?: { complianceStripped?: boolean; gated?: boolean },
): boolean {
  if (!verified) return false;
  if (options?.complianceStripped) return false;
  const gated = options?.gated !== false;
  if (gated && !SHOW_BREEDER_VERIFICATION_BADGES) return false;
  return true;
}
