import type { BreederProfile } from '../types';

export const FARM_DETAIL_TABS = ['overview', 'listings', 'warranty'] as const;
export type FarmDetailTab = (typeof FARM_DETAIL_TABS)[number];

export type FarmWarrantyPolicySummary = {
  id: string;
  title: string;
};

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
  const avatar = profile.avatar_url?.trim();
  if (avatar && !isBlankImageUrl(avatar)) return avatar;
  return null;
}

export function farmTabLabelKey(tab: FarmDetailTab): string {
  return `farm.tab.${tab}`;
}

/** Parse warranty policies from breeder metadata (web-aligned). */
export function farmWarrantyPoliciesFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): FarmWarrantyPolicySummary[] {
  const record = asRecord(meta);
  const raw = Array.isArray(record.warranty_policies)
    ? record.warranty_policies
    : Array.isArray(record.warrantyPolicies)
      ? record.warrantyPolicies
      : [];
  const out: FarmWarrantyPolicySummary[] = [];
  raw.forEach((item, index) => {
    const row = asRecord(item);
    const title = String(row.title ?? '').trim();
    if (!title) return;
    const id = String(row.id ?? `policy-${index}`).trim() || `policy-${index}`;
    out.push({ id, title });
  });
  return out;
}
