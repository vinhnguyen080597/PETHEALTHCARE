import type { BreederProfile } from "./types";
import { getEffectiveTrust } from "./types";
import {
  computeEffectiveViolationPoints,
  computeTransparencyScore,
  getTransparencyTier,
  parseApprovedSocialFromMeta,
  parseTransparencyActivityFromMeta,
  SOCIAL_PLATFORMS,
  TRANSPARENCY_POINTS,
  TRANSPARENCY_TIERS,
  TRANSPARENCY_TICK_INACTIVE,
  TRANSPARENCY_VIOLATION_PENALTIES,
  transparencyTickBandColor,
  transparencyTickColor,
  type TransparencyScoreInput,
  type TransparencyScoreResult,
  type TransparencyTierInfo,
} from "./breederTransparencyScore";

/** @deprecated Use TRANSPARENCY_POINTS */
export const TRUST_MISSION_POINTS = {
  facebook: TRANSPARENCY_POINTS.socialPlatform,
  zalo: TRANSPARENCY_POINTS.socialPlatform,
  tiktok: TRANSPARENCY_POINTS.socialPlatform,
  instagram: TRANSPARENCY_POINTS.socialPlatform,
  farmFacility: TRANSPARENCY_POINTS.facilityVideo,
  businessLicense: TRANSPARENCY_POINTS.businessLicense,
  firstWarrantyPolicy: TRANSPARENCY_POINTS.firstWarranty,
} as const;

export const TRUST_UI_CAPS = {
  social: SOCIAL_PLATFORMS.length * TRANSPARENCY_POINTS.socialPlatform,
  farmFacility: TRANSPARENCY_POINTS.facilityVideo,
  businessLicense: TRANSPARENCY_POINTS.businessLicense,
  firstWarrantyPolicy: TRANSPARENCY_POINTS.firstWarranty,
  completions: 0,
  reviews: 0,
} as const;

export {
  LIGHT_VIOLATION_EXPIRY_DAYS,
  LIGHT_VIOLATION_MAX_POINTS,
} from "./breederTransparencyScore";

/** @deprecated Use TRANSPARENCY_VIOLATION_PENALTIES */
export const TRUST_VIOLATION_PENALTIES = TRANSPARENCY_VIOLATION_PENALTIES;

export type BreederTrustScoreInput = TransparencyScoreInput & {
  /** @deprecated */
  hasEkyc?: boolean;
  hasFacebook?: boolean;
  hasZalo?: boolean;
  hasTiktok?: boolean;
  hasInstagram?: boolean;
  hasFarmFacility?: boolean;
  hasBusinessLicense?: boolean;
  hasHealthDocs?: boolean;
  hasFirstWarrantyPolicy?: boolean;
  verified?: boolean;
  checklistDoneCount?: number;
  commitmentsCount?: number;
  contactCount?: number;
  hasCareEnvironment?: boolean;
  activeListings?: number;
  fastResponseMonth?: boolean;
};

export type TrustScoreBreakdownLine = TransparencyScoreResult["lines"][number];

export type BreederTrustScoreResult = TransparencyScoreResult & {
  /** @deprecated Use profilePoints + activityPoints */
  missionPoints: number;
  /** @deprecated Use activityPoints */
  transactionPoints: number;
};

export type BreederPublicTrustMetrics = {
  qualityIndex: number;
  reviewCount: number;
  rating: number | null;
  petsRehomed: number;
  responseMinutes: number | null;
};

export type TrustTierId = TransparencyTierInfo["level"];
export type TrustTierInfo = TransparencyTierInfo;

export const TRUST_TIERS = TRANSPARENCY_TIERS;
export const TRUST_TICK_INACTIVE = TRANSPARENCY_TICK_INACTIVE;

export function contactFieldCount(
  contact: BreederProfile["contact"] | Record<string, string | undefined>,
): number {
  return Object.values(contact || {}).filter(
    (v) => typeof v === "string" && v.trim().length > 0,
  ).length;
}

export const trustTickBandColor = transparencyTickBandColor;
export const trustTickColor = transparencyTickColor;
export const getTrustTier = getTransparencyTier;

export { computeEffectiveViolationPoints };

export function computeBreederTrustScore(
  input: BreederTrustScoreInput,
): BreederTrustScoreResult {
  const normalized = normalizeTransparencyInput(input);
  const result = computeTransparencyScore(normalized);
  return {
    ...result,
    missionPoints: result.profilePoints,
    transactionPoints: result.activityPoints,
  };
}

export function computeBreederQualityIndex(
  signals: BreederTrustScoreInput,
): number {
  return computeBreederTrustScore(signals).score;
}

function normalizeTransparencyInput(
  input: BreederTrustScoreInput,
): TransparencyScoreInput {
  const isVerified = input.isVerified ?? Boolean(input.verified);
  return {
    isVerified,
    approvedFacebook: input.approvedFacebook ?? Boolean(input.hasFacebook),
    approvedZalo: input.approvedZalo ?? Boolean(input.hasZalo),
    approvedTiktok: input.approvedTiktok ?? Boolean(input.hasTiktok),
    approvedInstagram: input.approvedInstagram ?? Boolean(input.hasInstagram),
    approvedFacilityVideo:
      input.approvedFacilityVideo ?? Boolean(input.hasFarmFacility),
    approvedBusinessLicense:
      input.approvedBusinessLicense ?? Boolean(input.hasBusinessLicense),
    approvedFirstWarranty:
      input.approvedFirstWarranty ?? Boolean(input.hasFirstWarrantyPolicy),
    senConfirmedCompletions: input.senConfirmedCompletions,
    fiveStarReviewCount: input.fiveStarReviewCount,
    penaltyPoints: input.penaltyPoints,
    violations: input.violations,
    now: input.now,
  };
}

export function transparencyInputFromBreeder(
  breeder: Pick<
    BreederProfile,
    | "verified"
    | "verificationStatus"
    | "penaltyPoints"
    | "violations"
    | "warrantyPolicyTrustAwarded"
  >,
  meta: Record<string, unknown> = {},
  extras?: {
    senConfirmedCompletions?: number;
    fiveStarReviewCount?: number;
  },
): TransparencyScoreInput {
  const social = parseApprovedSocialFromMeta(meta);
  const activity = parseTransparencyActivityFromMeta(meta);
  const isVerified =
    breeder.verificationStatus === "verified" || Boolean(breeder.verified);

  return {
    isVerified,
    ...social,
    approvedFacilityVideo: activity.approvedFacilityVideo,
    approvedBusinessLicense: activity.approvedBusinessLicense,
    approvedFirstWarranty:
      activity.approvedFirstWarranty ||
      Boolean(breeder.warrantyPolicyTrustAwarded),
    senConfirmedCompletions:
      extras?.senConfirmedCompletions ?? activity.senConfirmedCompletions,
    fiveStarReviewCount:
      extras?.fiveStarReviewCount ?? activity.fiveStarReviewCount,
    penaltyPoints: breeder.penaltyPoints,
    violations: breeder.violations,
  };
}

export function qualitySignalsFromBreeder(
  breeder: Pick<
    BreederProfile,
    | "verified"
    | "verificationStatus"
    | "penaltyPoints"
    | "violations"
    | "warrantyPolicyTrustAwarded"
  >,
  _listingCount?: number,
  extras?: {
    senConfirmedCompletions?: number;
    fiveStarReviewCount?: number;
  },
  meta: Record<string, unknown> = {},
): BreederTrustScoreInput {
  return transparencyInputFromBreeder(breeder, meta, extras);
}

export function getBreederPublicTrustMetrics(
  breeder: BreederProfile,
  options?: { listingCount?: number; petsRehomed?: number },
): BreederPublicTrustMetrics {
  const fromOption =
    typeof options?.petsRehomed === "number" && Number.isFinite(options.petsRehomed)
      ? Math.max(0, Math.floor(options.petsRehomed))
      : null;
  const fromProfileSold = Number(breeder.petsRehomed);
  const profileSold =
    Number.isFinite(fromProfileSold) && fromProfileSold > 0
      ? Math.floor(fromProfileSold)
      : 0;
  const sold = fromOption != null ? fromOption : profileSold;
  const reviewCount =
    Number.isFinite(breeder.reviewCount) && (breeder.reviewCount ?? 0) > 0
      ? Math.floor(breeder.reviewCount as number)
      : 0;
  const rating =
    reviewCount > 0 && Number.isFinite(breeder.reviewAverage)
      ? Math.round((breeder.reviewAverage as number) * 10) / 10
      : null;

  const qualityIndex = Number.isFinite(breeder.trustScore)
    ? getEffectiveTrust(breeder.trustScore, 0)
    : computeBreederQualityIndex(
        transparencyInputFromBreeder(breeder, {}, { senConfirmedCompletions: sold }),
      );

  return {
    qualityIndex: Math.max(0, Math.min(100, qualityIndex)),
    reviewCount,
    rating,
    petsRehomed: sold,
    responseMinutes: null,
  };
}

export function parseStoredTrustScore(
  meta: Record<string, unknown>,
): number | null {
  const raw = meta.trust_score ?? meta.trustScore ?? meta.transparency_score;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, raw));
  }
  const asNum = typeof raw === "string" ? Number(raw) : NaN;
  if (Number.isFinite(asNum)) return Math.max(0, Math.min(100, asNum));
  return null;
}

/** @deprecated Use parseTransparencyActivityFromMeta + parseApprovedSocialFromMeta */
export function parseTrustActivityFromMeta(meta: Record<string, unknown>): {
  fiveStarReviewCount: number;
  fastResponseMonth: boolean;
  hasBusinessLicense: boolean;
  hasFarmFacility: boolean;
  hasHealthDocs: boolean;
  hasEkyc: boolean;
  hasFirstWarrantyPolicy: boolean;
  senConfirmedCompletions: number;
} {
  const activity = parseTransparencyActivityFromMeta(meta);
  return {
    fiveStarReviewCount: activity.fiveStarReviewCount,
    fastResponseMonth: false,
    hasBusinessLicense: activity.approvedBusinessLicense,
    hasFarmFacility: activity.approvedFacilityVideo,
    hasHealthDocs: false,
    hasEkyc: false,
    hasFirstWarrantyPolicy: activity.approvedFirstWarranty,
    senConfirmedCompletions: activity.senConfirmedCompletions,
  };
}

export {
  computeTransparencyScore,
  getTransparencyTier,
  parseApprovedSocialFromMeta,
  parseTransparencyActivityFromMeta,
  TRANSPARENCY_POINTS,
  TRANSPARENCY_TIERS,
} from "./breederTransparencyScore";
