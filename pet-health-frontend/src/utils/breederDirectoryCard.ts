import type { BreederProfile, PetFeedPost } from '../types';
import { breederDisplaySpecies } from './breederSpeciesSelection.ts';
import { farmPetAvailability } from './farmPets.ts';
import { farmWarrantyPoliciesFromMetadata } from './farmProfileDisplay.ts';
import { parsePetFeedPriceToVnd } from './petFeedCurrency.ts';
import { computeBreederTrust } from './breederTrust.ts';
import { applyAdminReviewPenalty } from './breederTransparencyScore.ts';

export type BreederPetThumb = {
  listingId: string;
  mediaUrl: string;
  title: string;
  price: string;
  species: string;
};

export type BreederActivityCue =
  | { kind: 'fast_response' }
  | { kind: 'active_kennel' }
  | { kind: 'none' };

export type BreederDirectoryCardMetrics = {
  trustScore: number;
  reviewCount: number;
  rating: number | null;
  petsRehomed: number;
  showSold: boolean;
  activeListings: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Compact VND label for pet thumbs (web `shortPriceLabel`). */
export function shortPetPriceLabel(price: string): string {
  const n = parsePetFeedPriceToVnd(price);
  if (n == null || n <= 0) return '';
  if (n >= 1_000_000) {
    const mil = n / 1_000_000;
    const text = Number.isInteger(mil) ? String(mil) : mil.toFixed(1).replace(/\.0$/, '');
    return `${text}M`;
  }
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

export function breederCardShowsSoldCount(petsRehomed: number): boolean {
  return Number.isFinite(petsRehomed) && petsRehomed > 0;
}

export function breederCardHasPetPreview(thumbCount: number): boolean {
  return Number(thumbCount) > 0;
}

export function breederCardPetsPreviewTitleKey(
  thumbCount: number,
): 'petFeed.breedersCard.petsPreviewCount' | 'petFeed.breedersCard.petsPreviewEmpty' {
  return breederCardHasPetPreview(thumbCount)
    ? 'petFeed.breedersCard.petsPreviewCount'
    : 'petFeed.breedersCard.petsPreviewEmpty';
}

export function canShowBreederMessageAction(
  currentUserId: string | null | undefined,
  breederUserId: string,
): boolean {
  if (!currentUserId) return false;
  return currentUserId !== breederUserId;
}

export function canShowBreederEditProfileAction(
  currentUserId: string | null | undefined,
  breederUserId: string,
): boolean {
  if (!currentUserId) return false;
  return currentUserId === breederUserId;
}

/** Only the kennel owner may open the farm detail from the directory card or listing farm chip. */
export function canShowBreederVisitFarmAction(
  currentUserId: string | null | undefined,
  breederUserId: string,
): boolean {
  return canShowBreederEditProfileAction(currentUserId, breederUserId);
}

/** Other users (including guests) see “send review” instead of visiting the farm. */
export function canShowBreederReviewFarmAction(
  currentUserId: string | null | undefined,
  breederUserId: string,
): boolean {
  if (!breederUserId) return false;
  return currentUserId !== breederUserId;
}

export type BreederCardSocialId = 'facebook' | 'zalo' | 'instagram' | 'twitter' | 'tiktok';

const CARD_SOCIAL_ORDER: BreederCardSocialId[] = [
  'facebook',
  'zalo',
  'instagram',
  'twitter',
  'tiktok',
];

function httpUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  return /^https?:\/\//i.test(raw) ? raw : '';
}

function zaloHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 8 ? `https://zalo.me/${digits}` : null;
}

function twitterHref(contact: Record<string, unknown>, meta: Record<string, unknown>): string {
  return (
    httpUrl(contact.twitter)
    || httpUrl(contact.x)
    || httpUrl(meta.twitter_url)
    || httpUrl(meta.x_url)
  );
}

export function breederCardSocialLinks(profile: {
  contact?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}): { id: BreederCardSocialId; href: string | null }[] {
  const contact = profile.contact && typeof profile.contact === 'object' ? profile.contact : {};
  const meta = profile.metadata && typeof profile.metadata === 'object' ? profile.metadata : {};
  const links: { id: BreederCardSocialId; href: string | null }[] = [];
  for (const id of CARD_SOCIAL_ORDER) {
    if (id === 'twitter') {
      const href = twitterHref(contact, meta);
      if (href) links.push({ id, href });
      continue;
    }
    if (id === 'zalo') {
      const raw = String(contact.zalo || '').trim();
      if (!raw) continue;
      links.push({ id, href: zaloHref(raw) });
      continue;
    }
    const href = httpUrl(contact[id]) || httpUrl(meta[`${id}_url`]);
    if (href) links.push({ id, href });
  }
  return links;
}

export function breederCardSpecialtyLabel(
  profile: Pick<BreederProfile, 'main_breeds' | 'primary_species'>,
  lang: 'vi' | 'en',
): string {
  const breeds = (profile.main_breeds ?? []).filter(Boolean).slice(0, 2);
  const prefix = lang === 'vi' ? 'Chuyên' : 'Specialty';
  const allSpecies = breederDisplaySpecies(profile.primary_species);
  const emoji = allSpecies.includes('dog')
    ? '🐶'
    : allSpecies.includes('bird')
      ? '🦜'
      : '🐱';

  if (breeds.length > 0) {
    return `${emoji} ${prefix}: ${breeds.join(' • ')}`;
  }

  const species = allSpecies
    .map((s) => {
      if (s === 'cat') return lang === 'vi' ? 'Mèo' : 'Cat';
      if (s === 'dog') return lang === 'vi' ? 'Chó' : 'Dog';
      return s;
    })
    .filter(Boolean);

  if (species.length) {
    return `${emoji} ${prefix}: ${species.join(' • ')}`;
  }

  return lang === 'vi' ? '🐱 Chuyên: Thú cưng' : '🐱 Specialty: Pets';
}

export function breederCardReviewMetrics(metadata: Record<string, unknown> | undefined): {
  reviewCount: number;
  rating: number | null;
} {
  const meta = asRecord(metadata);
  const reviewCountRaw = Number(
    meta.review_display_count ?? meta.review_count ?? meta.reviewCount,
  );
  const reviewCount =
    Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? Math.floor(reviewCountRaw) : 0;
  const reviewAvg = applyAdminReviewPenalty(Number(meta.review_avg ?? meta.reviewAverage), meta);
  const rating =
    reviewCount > 0 && Number.isFinite(reviewAvg) && reviewAvg > 0
      ? Math.round(reviewAvg * 10) / 10
      : null;
  return { reviewCount, rating };
}

export type BreederCardFooterMetrics = {
  /** e.g. "5.0/5 (2)" when breeder has reviews; null otherwise. */
  ratingText: string | null;
  trustScore: number;
};

/** Compact rating + trust labels for breeder directory cards (matches listing card footer). */
export function breederCardFooterMetrics(
  rating: number | null,
  reviewCount: number,
  trustScore: number,
): BreederCardFooterMetrics {
  const ratingText =
    rating != null && reviewCount > 0
      ? `${rating.toFixed(1)}/5 (${reviewCount})`
      : null;
  return {
    ratingText,
    trustScore: Math.max(0, Math.min(100, Math.round(trustScore))),
  };
}

export function breederResponseHoursFromProfile(profile: BreederProfile): number | null {
  const policies = farmWarrantyPoliciesFromMetadata(asRecord(profile.metadata));
  let best: number | null = null;
  for (const policy of policies) {
    const hours = policy.breederResponseHours;
    if (typeof hours === 'number' && Number.isFinite(hours) && hours > 0) {
      best = best == null ? hours : Math.min(best, hours);
    }
  }
  return best;
}

/**
 * Activity cue for directory cards — never invents live presence.
 * Mirrors web `breederActivityCue`.
 */
export function breederActivityCue(input: {
  trustScore: number;
  reviewCount: number;
  activeListings: number;
  responseHours?: number | null;
}): BreederActivityCue {
  const trust = Math.max(0, Math.round(input.trustScore || 0));
  const reviews = Math.max(0, Math.floor(input.reviewCount || 0));
  const active = Math.max(0, Math.floor(input.activeListings || 0));
  const responseHours =
    typeof input.responseHours === 'number' && Number.isFinite(input.responseHours)
      ? input.responseHours
      : null;

  if (
    (responseHours != null && responseHours <= 1)
    || (trust >= 70 && reviews >= 3 && active > 0)
  ) {
    return { kind: 'fast_response' };
  }
  if (active > 0 || trust >= 40) {
    return { kind: 'active_kennel' };
  }
  return { kind: 'none' };
}

/** Up to `limit` open-sale pet thumbs for a farm card. */
export function buildBreederPetThumbs(posts: PetFeedPost[], limit = 4): BreederPetThumb[] {
  const thumbs: BreederPetThumb[] = [];
  for (const post of posts) {
    if (farmPetAvailability(post) !== 'for_sale') continue;
    const listingId = String(post.id || '').trim();
    if (!listingId || thumbs.some((thumb) => thumb.listingId === listingId)) continue;
    const mediaUrl = (post.media_urls ?? []).map((u) => String(u ?? '').trim()).find(Boolean);
    if (!mediaUrl) continue;
    thumbs.push({
      listingId,
      mediaUrl,
      title: String(post.title || post.breed || '').trim(),
      price: String(post.price_note || '').trim(),
      species: String(post.species || '').trim().toLowerCase(),
    });
    if (thumbs.length >= limit) break;
  }
  return thumbs;
}

export function getBreederDirectoryCardMetrics(
  profile: BreederProfile,
  posts: PetFeedPost[],
  petsRehomed: number,
): BreederDirectoryCardMetrics {
  const trustScore = computeBreederTrust(profile, posts).score;
  const { reviewCount, rating } = breederCardReviewMetrics(profile.metadata);
  const activeListings = posts.filter((post) => farmPetAvailability(post) === 'for_sale').length;
  const sold = Math.max(0, Math.floor(petsRehomed || 0));
  return {
    trustScore: Math.max(0, Math.min(100, Math.round(trustScore))),
    reviewCount,
    rating,
    petsRehomed: sold,
    showSold: breederCardShowsSoldCount(sold),
    activeListings,
  };
}

export function resolveBreederCardActivity(
  profile: BreederProfile,
  metrics: Pick<BreederDirectoryCardMetrics, 'trustScore' | 'reviewCount' | 'activeListings'>,
): BreederActivityCue {
  return breederActivityCue({
    trustScore: metrics.trustScore,
    reviewCount: metrics.reviewCount,
    activeListings: metrics.activeListings,
    responseHours: breederResponseHoursFromProfile(profile),
  });
}
