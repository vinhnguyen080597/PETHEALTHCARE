import type { BreederProfile, PetFeedPost, PetFeedReport } from '../types';
import { getBreederPenaltyPoints, getActiveBreederViolations } from './breederQualityIndex';
import { healthEvidenceUrlsFromMetadata } from './petFeedHealthEvidence';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function adminReportReasonLabel(t: Translate, reason: string | null | undefined) {
  const value = String(reason ?? '').trim();
  if (!value) return t('adminRequests.report');
  const fromPetFeed = t(`petFeed.reportReasons.${value}`, { defaultValue: '' });
  if (fromPetFeed && fromPetFeed !== `petFeed.reportReasons.${value}`) return fromPetFeed;
  const fromBreeder = t(`breederDetail.reportReasons.${value}`, { defaultValue: '' });
  if (fromBreeder && fromBreeder !== `breederDetail.reportReasons.${value}`) return fromBreeder;
  return value;
}

export function adminReportTargetSubtitle(
  t: Translate,
  report: PetFeedReport,
  posts: PetFeedPost[] = [],
) {
  if (report.target_type === 'breeder_profile' || report.breeder_profile_id) {
    const name = report.breeder_profile?.display_name || report.breeder_profile_id || '—';
    return `${t('adminRequests.types.breeder')}: ${name}`;
  }
  if (report.post_id) {
    const post = posts.find((item) => item.id === report.post_id);
    const title = post?.title?.trim() || report.post_id;
    return `${t('adminRequests.types.post')}: ${title}`;
  }
  if (report.comment_id) {
    return t('adminRequests.commentTarget');
  }
  return t('adminRequests.unknownTarget');
}

export function adminBreederPenaltySummary(profile: BreederProfile) {
  const points = getBreederPenaltyPoints(profile);
  const violations = getActiveBreederViolations(profile).length;
  return { points, violations };
}

export function adminPostHealthEvidenceUrls(post: PetFeedPost) {
  return healthEvidenceUrlsFromMetadata(post.metadata);
}
