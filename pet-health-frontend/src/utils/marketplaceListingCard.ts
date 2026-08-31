import type { PetFeedPost } from '../types';

const NEW_LISTING_MS = 24 * 60 * 60 * 1000;

export type ListingWarrantyPolicy = {
  title?: string;
  careParvoCoverageDays?: number;
  respiratorySkinCoverageDays?: number;
  congenitalCoverageDays?: number;
};

export type ListingHotBadge =
  | { kind: 'saves'; count: number }
  | { kind: 'new' };

export type ListingAvailability = 'for_sale' | 'deposit_hold' | 'completed';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function listingSpeciesEmoji(species: string | null | undefined): string {
  switch (String(species ?? '').trim().toLowerCase()) {
    case 'cat':
      return '🐱';
    case 'dog':
      return '🐶';
    case 'bird':
      return '🐦';
    case 'fish':
      return '🐠';
    case 'rabbit':
      return '🐰';
    case 'hamster':
      return '🐹';
    case 'mouse':
      return '🐭';
    case 'reptile':
      return '🦎';
    default:
      return '🐾';
  }
}

export function listingCreatedAtMs(post: Pick<PetFeedPost, 'created_at'>, now = Date.now()): number | null {
  const ms = Date.parse(String(post.created_at ?? '').trim());
  if (!Number.isFinite(ms) || ms > now + 60_000) return null;
  return ms;
}

export function isListingNewOnFloor(post: Pick<PetFeedPost, 'created_at'>, now = Date.now()): boolean {
  const created = listingCreatedAtMs(post, now);
  if (created == null) return false;
  return now - created <= NEW_LISTING_MS;
}

/** Short posted date for listing card overlay pills (locale date, no time). */
export function formatListingCardPostedDate(
  iso: string | null | undefined,
  language: string,
): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const locale = language.toLowerCase().startsWith('vi') ? 'vi-VN' : 'en-US';
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function listingPreviewImages(post: Pick<PetFeedPost, 'media_urls'>, max = 4): string[] {
  const unique: string[] = [];
  for (const url of post.media_urls) {
    const trimmed = String(url ?? '').trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= max) break;
  }
  return unique;
}

export function readListingWarrantyPolicy(post: PetFeedPost): ListingWarrantyPolicy | null {
  const raw = (post as PetFeedPost & { warranty_policy?: unknown }).warranty_policy;
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const numOrUndef = (value: unknown) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  };
  const policy: ListingWarrantyPolicy = {
    title: String(row.title ?? '').trim() || undefined,
    careParvoCoverageDays: numOrUndef(row.care_parvo_coverage_days ?? row.careParvoCoverageDays),
    respiratorySkinCoverageDays: numOrUndef(
      row.respiratory_skin_coverage_days ?? row.respiratorySkinCoverageDays,
    ),
    congenitalCoverageDays: numOrUndef(row.congenital_coverage_days ?? row.congenitalCoverageDays),
  };
  const days = [
    policy.careParvoCoverageDays,
    policy.respiratorySkinCoverageDays,
    policy.congenitalCoverageDays,
  ].filter((n): n is number => typeof n === 'number' && n > 0);
  if (!policy.title && !days.length) return null;
  return policy;
}

export function listingWarrantyCoverageDays(policy: ListingWarrantyPolicy | null): number | null {
  if (!policy) return null;
  const days = [
    policy.careParvoCoverageDays,
    policy.respiratorySkinCoverageDays,
    policy.congenitalCoverageDays,
  ].filter((n): n is number => typeof n === 'number' && n > 0);
  if (!days.length) return null;
  return Math.max(...days);
}

export function listingMetadataMarksSold(metadata: Record<string, unknown>): boolean {
  const outcome = String(metadata.listing_outcome ?? metadata.outcome ?? '').trim().toLowerCase();
  if (outcome === 'cancelled' || outcome === 'canceled') return false;
  if (outcome === 'sold' || outcome === 'completed' || outcome === 'rehomed') return true;
  return metadata.sold === true || metadata.completed === true || metadata.rehomed === true;
}

export function listingMetadataMarksCancelled(metadata: Record<string, unknown>): boolean {
  const outcome = String(metadata.listing_outcome ?? metadata.outcome ?? '').trim().toLowerCase();
  if (outcome === 'cancelled' || outcome === 'canceled') return true;
  return metadata.cancelled === true;
}

export function listingAvailability(post: PetFeedPost): ListingAvailability | null {
  const meta = asRecord(post.metadata);
  if (post.status === 'deposit_hold') return 'deposit_hold';
  if (
    post.status === 'sold'
    || post.status === 'cancelled'
    || listingMetadataMarksSold(meta)
    || listingMetadataMarksCancelled(meta)
  ) {
    return 'completed';
  }
  if (post.status === 'published') return 'for_sale';
  return null;
}

/** Feed listing + detail hero height (Tailwind `h-72`). */
export const LISTING_CARD_IMAGE_HEIGHT = 288;

export function listingHotBadges(
  post: Pick<PetFeedPost, 'created_at' | 'favorite_count'>,
  now = Date.now(),
): ListingHotBadge[] {
  const badges: ListingHotBadge[] = [];
  const saves = Math.max(0, Math.floor(Number(post.favorite_count) || 0));
  if (saves > 0) badges.push({ kind: 'saves', count: saves });
  if (isListingNewOnFloor(post, now)) badges.push({ kind: 'new' });
  return badges.slice(0, 3);
}

export function listingBreederScoreLabel(post: PetFeedPost, trustScore: number): string {
  const metrics = listingBreederFooterMetrics(post, trustScore);
  if (metrics.ratingText) {
    return `⭐ ${metrics.ratingText}`;
  }
  return `${metrics.trustScore}/100`;
}

export type ListingBreederFooterMetrics = {
  /** e.g. "5.0/5 (2)" when breeder has reviews; null otherwise. */
  ratingText: string | null;
  trustScore: number;
};

/** Rating + transparency score shown on listing card breeder row (image 1 layout). */
export function isOwnListingPost(
  currentUserId: string | null | undefined,
  post: Pick<PetFeedPost, 'user_id'>,
): boolean {
  return Boolean(currentUserId && post.user_id === currentUserId);
}

export function listingCardShowsEditAction(
  isOwnPost: boolean,
  hasEditHandler: boolean,
): boolean {
  return isOwnPost && hasEditHandler;
}

export function listingBreederFooterMetrics(
  post: Pick<PetFeedPost, 'breeder_profile'>,
  trustScore: number,
): ListingBreederFooterMetrics {
  const meta = asRecord(post.breeder_profile?.metadata);
  const reviewCountRaw = Number(meta.review_count ?? meta.reviewCount);
  const reviewCount =
    Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? Math.floor(reviewCountRaw) : 0;
  const reviewAvg = Number(meta.review_avg ?? meta.reviewAverage);
  const ratingText =
    reviewCount > 0 && Number.isFinite(reviewAvg) && reviewAvg > 0
      ? `${(Math.round(reviewAvg * 10) / 10).toFixed(1)}/5 (${reviewCount})`
      : null;
  return {
    ratingText,
    trustScore: Math.max(0, Math.min(100, Math.round(trustScore))),
  };
}

export function fillTemplate(template: string, value: number | string): string {
  return template.replaceAll('{{n}}', String(value));
}
