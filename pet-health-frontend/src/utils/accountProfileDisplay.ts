import type { BreederVerificationStatus, UserRole } from '../types';

/** Initials for avatar fallback from display name or login/email. */
export function accountProfileInitials(displayName?: string | null, emailOrLogin?: string | null) {
  const name = (displayName ?? '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const login = (emailOrLogin ?? '').trim();
  if (!login) return '?';
  const local = login.includes('@') ? login.split('@')[0]! : login;
  return local.slice(0, 2).toUpperCase() || '?';
}

/** Show green "Verified" badge for admin or verified breeders (hidden when compliance-stripped). */
export function accountShowsVerifiedBadge(
  role: UserRole | undefined,
  breederStatus: BreederVerificationStatus | string | undefined,
  options?: { complianceStripped?: boolean },
) {
  if (options?.complianceStripped) return false;
  if (role === 'admin') return true;
  return breederStatus === 'verified';
}
