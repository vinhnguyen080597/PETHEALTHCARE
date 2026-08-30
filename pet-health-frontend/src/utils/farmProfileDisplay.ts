import type { BreederProfile } from '../types';
import { mapWarrantyPolicies, type WarrantyPolicy } from './warrantyPolicy.ts';
import { isUnusableFarmPhotoUrl } from './farmPhotos.ts';

export const FARM_DETAIL_TABS = ['overview', 'listings', 'warranty'] as const;
export type FarmDetailTab = (typeof FARM_DETAIL_TABS)[number];

/** @deprecated Prefer WarrantyPolicy from warrantyPolicy.ts */
export type FarmWarrantyPolicySummary = Pick<WarrantyPolicy, 'id' | 'title'>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const LEGACY_UNSPLASH_COVER =
  /images\.unsplash\.com\/photo-1573865526739-10659fec78a5/i;

export function isBlankImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('data:image/svg+xml')) return true;
  if (LEGACY_UNSPLASH_COVER.test(trimmed)) return true;
  return false;
}

/** Remote URI, otherwise the bundled web default (require() source). */
export function farmImageSource<T>(uri: string | null, fallback: T): { uri: string } | T {
  return uri ? { uri } : fallback;
}

export function coverUrlFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!meta) return undefined;
  for (const key of ['cover_url', 'coverUrl', 'coverImageUrl', 'cover_image_url']) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function resolveFarmCoverUrl(profile: BreederProfile): string | null {
  const fromMeta = coverUrlFromMetadata(asRecord(profile.metadata));
  if (fromMeta && !isBlankImageUrl(fromMeta)) return fromMeta;
  return null;
}

export function resolveFarmAvatarUrl(profile: BreederProfile): string | null {
  const meta = asRecord(profile.metadata);
  const candidates = [
    profile.avatar_url,
    typeof meta.avatar_url === 'string' ? meta.avatar_url : null,
    typeof meta.avatarUrl === 'string' ? meta.avatarUrl : null,
  ];
  for (const candidate of candidates) {
    const trimmed = String(candidate ?? '').trim();
    if (!trimmed || isBlankImageUrl(trimmed) || isUnusableFarmPhotoUrl(trimmed)) continue;
    return trimmed;
  }
  return null;
}

export function farmTabLabelKey(tab: FarmDetailTab): string {
  return `farm.tab.${tab}`;
}

/** Tab bar must not flex-grow inside the farm profile scroll content (avoids huge gap above warranty tab). */
export function farmDetailTabBarLayout() {
  return {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch' as const,
  };
}

/** Extra space under farm name for visitors (owner keeps tighter header with CTAs). */
export function farmNameExtraMargin(isOwner: boolean): number {
  return isOwner ? 0 : 4;
}

export function farmWarrantyPoliciesFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): WarrantyPolicy[] {
  const record = asRecord(meta);
  const raw = Array.isArray(record.warranty_policies)
    ? record.warranty_policies
    : Array.isArray(record.warrantyPolicies)
      ? record.warrantyPolicies
      : [];
  return mapWarrantyPolicies(raw);
}
