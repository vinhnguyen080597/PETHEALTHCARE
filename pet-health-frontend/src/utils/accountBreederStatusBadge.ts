/**
 * Temporary: do not show the “verified breeder” mark on Account or Edit
 * Breeder profile until real eligibility rules ship. Other statuses
 * (pending / rejected / …) still surface so owners know request state.
 */
export function showAccountBreederStatusBadge(status: string): boolean {
  return String(status || '').toLowerCase() !== 'verified';
}

/** Verified kennel profile edits go live immediately — no admin re-review. */
export function breederProfileSavePublishesImmediately(status: string | null | undefined): boolean {
  return String(status || '').trim().toLowerCase() === 'verified';
}
