import type { AppFeatureFlags } from '../types';

/** Escrow/deposit UI is explicit opt-in. When off, users only see connect (chat/call). */
export function isMarketplaceEscrowEnabled(
  flags: Partial<AppFeatureFlags> | null | undefined,
): boolean {
  return flags?.marketplace_escrow === true;
}

/** Show deal panel when escrow is on, or when a legacy in-flight soft-deal must be completed. */
export function shouldShowMarketplaceDealUi(
  flags: Partial<AppFeatureFlags> | null | undefined,
  hasActiveDeal: boolean,
): boolean {
  return isMarketplaceEscrowEnabled(flags) || hasActiveDeal;
}
