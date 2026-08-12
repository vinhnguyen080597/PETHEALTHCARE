import type { BreederProfile, PetFeedPost } from '../types.ts';
import {
  computeBreederTrust,
  hasBreederContact,
  metadataArray,
  metadataString,
} from './breederTrust.ts';

const HOME_BREEDER_QUOTA = 0.25;
const HOME_BREEDER_TRUST_MIN = 40;
/** Freshness half-life in ms (~14 days). */
const FRESHNESS_HALFLIFE_MS = 14 * 24 * 60 * 60 * 1000;

export type BreederRankCandidate = {
  profile: BreederProfile;
  posts: PetFeedPost[];
  latestPostAt: number;
  postCount: number;
};

export type BreederQualityBreakdown = {
  trust: number;
  listingQuality: number;
  activityFreshness: number;
  profileCompleteness: number;
  qualityIndex: number;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function isVaccinatedClaim(vaccineStatus: string) {
  const value = vaccineStatus.trim().toLowerCase();
  if (!value || value === 'unknown') return false;
  if (value.includes('not') || value.includes('chưa') || value.includes('chua')) return false;
  return true;
}

/** 0–100 listing quality from published posts. */
export function computeListingQualityScore(posts: PetFeedPost[]): number {
  const published = posts.filter((post) => post.status === 'published' || !post.status);
  if (published.length === 0) return 0;

  let total = 0;
  for (const post of published) {
    let score = 0;
    const mediaCount = Array.isArray(post.media_urls) ? post.media_urls.filter(Boolean).length : 0;
    if (mediaCount >= 1) score += 25;
    if (mediaCount >= 3) score += 15;
    if (post.video_url) score += 10;
    if (post.description && post.description.trim().length >= 40) score += 15;
    if (post.breed?.trim()) score += 10;
    if (post.age_months != null) score += 5;
    if (isVaccinatedClaim(post.vaccine_status || '')) score += 10;
    if (Array.isArray(post.paperwork) && post.paperwork.length > 0) score += 10;
    total += Math.min(100, score);
  }
  return Math.round(total / published.length);
}

export function computeActivityFreshnessScore(latestPostAt: number, now = Date.now()): number {
  if (!Number.isFinite(latestPostAt) || latestPostAt <= 0) return 0;
  const age = Math.max(0, now - latestPostAt);
  const freshness = Math.exp((-Math.LN2 * age) / FRESHNESS_HALFLIFE_MS);
  return Math.round(100 * clamp01(freshness));
}

export function computeProfileCompletenessScore(profile: BreederProfile): number {
  let score = 0;
  if (hasBreederContact(profile)) score += 30;
  if (metadataArray(profile.metadata, 'transparencyCommitments').length >= 2) score += 20;
  if (profile.bio?.trim()) score += 15;
  if (profile.location?.trim()) score += 5;
  if ((profile.primary_species?.length ?? 0) > 0) score += 5;
  return Math.min(100, score);
}

export function computeBreederQualityIndex(
  profile: BreederProfile,
  posts: PetFeedPost[],
  latestPostAt: number,
  now = Date.now(),
): BreederQualityBreakdown {
  const trust = computeBreederTrust(profile, posts).score;
  const listingQuality = computeListingQualityScore(posts);
  const activityFreshness = computeActivityFreshnessScore(latestPostAt, now);
  const profileCompleteness = computeProfileCompletenessScore(profile);
  const qualityIndex = Math.round(
    0.4 * trust + 0.3 * listingQuality + 0.2 * activityFreshness + 0.1 * profileCompleteness,
  );
  return { trust, listingQuality, activityFreshness, profileCompleteness, qualityIndex };
}

export function getBreederPenaltyPoints(profile: BreederProfile): number {
  const raw = profile.metadata?.penaltyPoints;
  const points = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor(points);
}

export type BreederViolation = {
  id: string;
  reportId?: string;
  reason: string;
  points: number;
  createdAt: string;
  status: 'active' | 'cleared';
};

export function getActiveBreederViolations(profile: BreederProfile): BreederViolation[] {
  const raw = profile.metadata?.violations;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): BreederViolation | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id : '';
      if (!id) return null;
      const status = row.status === 'cleared' ? 'cleared' : 'active';
      if (status !== 'active') return null;
      const pointsRaw = typeof row.points === 'number' ? row.points : Number(row.points);
      return {
        id,
        reportId: typeof row.reportId === 'string' ? row.reportId : undefined,
        reason: typeof row.reason === 'string' ? row.reason : 'report_upheld',
        points: Number.isFinite(pointsRaw) ? Math.max(0, Math.floor(pointsRaw)) : 0,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
        status,
      };
    })
    .filter((item): item is BreederViolation => item != null);
}

export function effectiveTrustScore(profile: BreederProfile, posts: PetFeedPost[]): number {
  const base = computeBreederTrust(profile, posts).score;
  return Math.max(0, base - getBreederPenaltyPoints(profile));
}

export function isHomeBreederEligible(profile: BreederProfile, trustScore: number): boolean {
  if (trustScore < HOME_BREEDER_TRUST_MIN) return false;
  const type = metadataString(profile.metadata, 'breederType');
  return type === 'home_breeder';
}

/**
 * Sort by qualityIndex desc, then apply ~25% Home Breeder quota in the ranked list
 * without dropping other verified breeders.
 */
export function rankBreedersWithHomeQuota<T extends BreederRankCandidate>(
  candidates: T[],
  now = Date.now(),
): Array<T & { qualityIndex: number }> {
  const scored = candidates.map((item) => {
    const breakdown = computeBreederQualityIndex(item.profile, item.posts, item.latestPostAt, now);
    return { ...item, qualityIndex: breakdown.qualityIndex, trust: breakdown.trust };
  });

  scored.sort((a, b) => {
    if (b.qualityIndex !== a.qualityIndex) return b.qualityIndex - a.qualityIndex;
    if (b.latestPostAt !== a.latestPostAt) return b.latestPostAt - a.latestPostAt;
    return (b.postCount ?? 0) - (a.postCount ?? 0);
  });

  if (scored.length <= 1) {
    return scored.map((item) => {
      const { trust: _trust, ...rest } = item;
      return rest as T & { qualityIndex: number };
    });
  }

  const quotaSlots = Math.max(1, Math.floor(scored.length * HOME_BREEDER_QUOTA));
  const homeEligible = scored.filter((item) => isHomeBreederEligible(item.profile, item.trust));
  if (homeEligible.length === 0) {
    return scored.map((item) => {
      const { trust: _trust, ...rest } = item;
      return rest as T & { qualityIndex: number };
    });
  }

  const result: Array<T & { qualityIndex: number; trust: number }> = [];
  const used = new Set<string>();
  const keyOf = (item: (typeof scored)[0]) => item.profile.id || item.profile.user_id;

  let homeInserted = 0;
  let homePtr = 0;
  let organicPtr = 0;

  while (result.length < scored.length) {
    const wantHome = homeInserted < quotaSlots && homePtr < homeEligible.length;
    if (wantHome) {
      while (homePtr < homeEligible.length && used.has(keyOf(homeEligible[homePtr]))) homePtr += 1;
      if (homePtr < homeEligible.length) {
        const pick = homeEligible[homePtr];
        result.push(pick);
        used.add(keyOf(pick));
        homeInserted += 1;
        homePtr += 1;
        continue;
      }
    }
    while (organicPtr < scored.length && used.has(keyOf(scored[organicPtr]))) organicPtr += 1;
    if (organicPtr >= scored.length) break;
    const pick = scored[organicPtr];
    result.push(pick);
    used.add(keyOf(pick));
    organicPtr += 1;
  }

  return result.map((item) => {
    const { trust: _trust, ...rest } = item;
    return rest as T & { qualityIndex: number };
  });
}
