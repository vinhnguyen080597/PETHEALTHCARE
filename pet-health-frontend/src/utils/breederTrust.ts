import type { BreederProfile, PetFeedPost } from '../types.ts';
import {
  computeTransparencyScore,
  getTransparencyTier,
  parseApprovedSocialFromMeta,
  parseTransparencyActivityFromMeta,
} from './breederTransparencyScore.ts';

export type TrustSignalKey =
  | 'verified'
  | 'social'
  | 'facility'
  | 'license'
  | 'warranty'
  | 'completions'
  | 'reviews';

export type BreederTrustSignal = {
  key: TrustSignalKey;
  passed: boolean;
  value: number;
  max: number;
};

export type BreederTrustSummary = {
  score: number;
  signals: BreederTrustSignal[];
};

export function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

export function metadataArray(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function hasBreederContact(profile: BreederProfile) {
  return ['phone', 'zalo', 'facebook', 'tiktok', 'instagram'].some((key) => {
    const value = profile.contact?.[key as keyof typeof profile.contact];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function postsForBreeder(posts: PetFeedPost[], profileId: string) {
  return posts.filter((post) => {
    const profile = post.breeder_profile;
    return post.breeder_profile_id === profileId || profile?.id === profileId || profile?.user_id === profileId;
  });
}

function penaltyPointsFromMetadata(metadata: Record<string, unknown>) {
  const raw = metadata.penaltyPoints ?? metadata.penalty_points;
  const points = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor(points);
}

export function computeBreederTrust(profile: BreederProfile, _posts: PetFeedPost[]): BreederTrustSummary {
  const metadata = profile.metadata ?? {};
  const social = parseApprovedSocialFromMeta(metadata);
  const activity = parseTransparencyActivityFromMeta(metadata);
  const result = computeTransparencyScore({
    isVerified: profile.verification_status === 'verified',
    ...social,
    approvedFacilityVideo: activity.approvedFacilityVideo,
    approvedBusinessLicense: activity.approvedBusinessLicense,
    approvedFirstWarranty: activity.approvedFirstWarranty,
    senConfirmedCompletions: activity.senConfirmedCompletions,
    fiveStarReviewCount: activity.fiveStarReviewCount,
    penaltyPoints: penaltyPointsFromMetadata(metadata),
  });

  const lineByKey = Object.fromEntries(result.lines.map((line) => [line.key, line]));
  const signals: BreederTrustSignal[] = [
    { key: 'verified', passed: Boolean(lineByKey.verifiedBase?.done), value: lineByKey.verifiedBase?.val ?? 0, max: 30 },
    { key: 'social', passed: Boolean(lineByKey.social?.done), value: lineByKey.social?.val ?? 0, max: 20 },
    { key: 'facility', passed: Boolean(lineByKey.facilityVideo?.done), value: lineByKey.facilityVideo?.val ?? 0, max: 10 },
    { key: 'license', passed: Boolean(lineByKey.businessLicense?.done), value: lineByKey.businessLicense?.val ?? 0, max: 30 },
    { key: 'warranty', passed: Boolean(lineByKey.firstWarranty?.done), value: lineByKey.firstWarranty?.val ?? 0, max: 10 },
  ];

  return { score: result.score, signals };
}

export function transparencyTierLabel(score: number, locale: 'vi' | 'en' = 'vi') {
  const tier = getTransparencyTier(score);
  return locale === 'vi' ? tier.nameVI : tier.nameEN;
}
