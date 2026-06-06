import type { BreederProfile, PetFeedPost } from '../types';

export type TrustSignalKey =
  | 'verified'
  | 'careChecklist'
  | 'commitments'
  | 'contact'
  | 'careEnvironment'
  | 'activeListings';

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
  return ['phone', 'zalo', 'facebook'].some((key) => {
    const value = profile.contact?.[key];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function postsForBreeder(posts: PetFeedPost[], profileId: string) {
  return posts.filter((post) => {
    const profile = post.breeder_profile;
    return post.breeder_profile_id === profileId || profile?.id === profileId || profile?.user_id === profileId;
  });
}

export function computeBreederTrust(profile: BreederProfile, posts: PetFeedPost[]): BreederTrustSummary {
  const careChecklistCount = metadataArray(profile.metadata, 'careChecklist').length;
  const commitmentsCount = metadataArray(profile.metadata, 'transparencyCommitments').length;
  const activeListingCount = posts.length;
  const signals: BreederTrustSignal[] = [
    { key: 'verified', passed: profile.verification_status === 'verified', value: profile.verification_status === 'verified' ? 30 : 0, max: 30 },
    { key: 'careChecklist', passed: careChecklistCount >= 3, value: Math.min(15, careChecklistCount * 3), max: 15 },
    { key: 'commitments', passed: commitmentsCount >= 2, value: Math.min(15, commitmentsCount * 7.5), max: 15 },
    { key: 'contact', passed: hasBreederContact(profile), value: hasBreederContact(profile) ? 15 : 0, max: 15 },
    { key: 'careEnvironment', passed: Boolean(profile.care_environment || profile.bio), value: profile.care_environment || profile.bio ? 15 : 0, max: 15 },
    { key: 'activeListings', passed: activeListingCount > 0, value: Math.min(10, activeListingCount * 2), max: 10 },
  ];
  const score = Math.round(signals.reduce((sum, signal) => sum + signal.value, 0));
  return { score, signals };
}
