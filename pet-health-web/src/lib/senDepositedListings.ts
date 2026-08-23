/** Account helpers for Sen soft-deposit listings. */

export function isSenAccountRole(
  role: string | null | undefined,
  isAdmin = false,
): boolean {
  if (isAdmin) return false;
  const r = String(role || "")
    .trim()
    .toLowerCase();
  if (r === "sen") return true;
  if (r === "breeder" || r === "vet" || r === "admin") return false;
  return true;
}

/**
 * Account reserved/deposit section: only when escrow is on, or legacy
 * soft-deals still need tracking while escrow is off.
 */
export function shouldShowSenDepositedSection(input: {
  role: string | null | undefined;
  isAdmin?: boolean;
  marketplaceEscrowEnabled?: boolean;
  depositedCount?: number;
}): boolean {
  if (!isSenAccountRole(input.role, Boolean(input.isAdmin))) return false;
  if (input.marketplaceEscrowEnabled === true) return true;
  return Math.max(0, Math.floor(Number(input.depositedCount) || 0)) > 0;
}
