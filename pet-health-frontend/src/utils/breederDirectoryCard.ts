import type { BreederProfile, PetFeedPost } from '../types';
import { breederDisplaySpecies } from './breederSpeciesSelection.ts';
import { farmPetAvailability } from './farmPets.ts';
import { farmWarrantyPoliciesFromMetadata } from './farmProfileDisplay.ts';
import { parsePetFeedPriceToVnd } from './petFeedCurrency.ts';
import { computeBreederTrust } from './breederTrust.ts';

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
  const reviewCountRaw = Number(meta.review_count ?? meta.reviewCount);
  const reviewCount =
    Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? Math.floor(reviewCountRaw) : 0;
  const reviewAvg = Number(meta.review_avg ?? meta.reviewAverage);
  const rating =
    reviewCount > 0 && Number.isFinite(reviewAvg) && reviewAvg > 0
      ? Math.round(reviewAvg * 10) / 10
      : null;
  return { reviewCount, rating };
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
    const mediaUrl = (post.media_urls ?? []).map((u) => String(u ?? '').trim()).find(Boolean);
    if (!mediaUrl) continue;
    thumbs.push({
      listingId: post.id,
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
