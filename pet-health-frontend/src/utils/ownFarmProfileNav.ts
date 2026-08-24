/** Resolve id used to open own farm profile detail (profile id preferred). */
export function resolveOwnFarmProfileId(
  profile: { id?: string | null; user_id?: string | null } | null | undefined,
): string | null {
  const id = String(profile?.id ?? '').trim();
  if (id) return id;
  const userId = String(profile?.user_id ?? '').trim();
  return userId || null;
}

/** Whether Account may show / open "View farm profile". */
export function canOpenOwnFarmProfile(
  profile: { id?: string | null; user_id?: string | null; verification_status?: string | null } | null | undefined,
): boolean {
  if (!resolveOwnFarmProfileId(profile)) return false;
  const status = String(profile?.verification_status ?? '').trim().toLowerCase();
  return status === 'verified' || status === 'pending_review';
}
