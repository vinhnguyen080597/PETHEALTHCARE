import type { AppFeatureFlags } from '../types';

/** Escrow/deposit UI is explicit opt-in. When off, users only see connect (chat/call). */
export function isMarketplaceEscrowEnabled(
  flags: Partial<AppFeatureFlags> | null | undefined,
): boolean {
  return flags?.marketplace_escrow === true;
}
