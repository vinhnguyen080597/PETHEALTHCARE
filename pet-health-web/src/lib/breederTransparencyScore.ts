/** Breeder transparency score (0–100) — Phase 1 spec. */

export const TRANSPARENCY_SCORE_MAX = 100;

export const TRANSPARENCY_POINTS = {
  verifiedBase: 30,
  socialPlatform: 5,
  facilityVideo: 10,
  businessLicense: 30,
  firstWarranty: 10,
} as const;

export const SOCIAL_PLATFORMS = [
  "facebook",
  "zalo",
  "tiktok",
  "instagram",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type TransparencyScoreInput = {
  /** Admin-approved breeder profile only. Unverified → score 0. */
  isVerified?: boolean;
  approvedFacebook?: boolean;
  approvedZalo?: boolean;
  approvedTiktok?: boolean;
  approvedInstagram?: boolean;
  approvedFacilityVideo?: boolean;
  approvedBusinessLicense?: boolean;
  approvedFirstWarranty?: boolean;
  /** @deprecated No longer used in transparency score. */
  senConfirmedCompletions?: number;
  /** @deprecated No longer used in transparency score. */
  fiveStarReviewCount?: number;
  penaltyPoints?: number;
  violations?: Array<{ points: number; date?: string; reason?: string }>;
  now?: Date;
};

export type TransparencyBreakdownLine = {
  key: string;
  group: "profile" | "activity" | "penalty";
  val: number;
  max: number;
  done: boolean;
};

export type TransparencyScoreResult = {
  score: number;
  profilePoints: number;
  activityPoints: number;
  violationPoints: number;
  lines: TransparencyBreakdownLine[];
};

export type TransparencyTierId = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type TransparencyTierInfo = {
  level: TransparencyTierId;
  nameVI: string;
  nameEN: string;
  meaningVI: string;
  meaningEN: string;
  chipClass: string;
  min: number;
  max: number;
  color: string;
};

export const TRANSPARENCY_TIERS: TransparencyTierInfo[] = [
  {
    level: "L0",
    nameVI: "Sắp bị khóa",
    nameEN: "At risk of suspension",
    meaningVI: "Điểm minh bạch rất thấp — cần khắc phục ngay.",
    meaningEN: "Very low transparency — immediate action required.",
    chipClass: "bg-red-100 text-red-800 border-red-300",
    min: 0,
    max: 15,
    color: "#DC2626",
  },
  {
    level: "L1",
    nameVI: "Trại bị cảnh báo",
    nameEN: "Warning",
    meaningVI: "Điểm minh bạch dưới mức an toàn — hoàn thiện hồ sơ và giảm vi phạm.",
    meaningEN: "Transparency below safe level — complete your profile and avoid violations.",
    chipClass: "bg-red-50 text-red-700 border-red-200",
    min: 16,
    max: 29,
    color: "#EF4444",
  },
  {
    level: "L2",
    nameVI: "Trại mới",
    nameEN: "New kennel",
    meaningVI: "Hồ sơ đã được duyệt — tiếp tục bổ sung minh bạch để tăng điểm.",
    meaningEN: "Profile approved — add more transparency to grow your score.",
    chipClass: "bg-orange-50 text-orange-700 border-orange-200",
    min: 30,
    max: 49,
    color: "#F97316",
  },
  {
    level: "L3",
    nameVI: "Trại tiềm năng",
    nameEN: "Promising kennel",
    meaningVI: "Hồ sơ minh bạch tốt, đang xây dựng uy tín với cộng đồng.",
    meaningEN: "Good transparency — building community trust.",
    chipClass: "bg-amber-50 text-amber-800 border-amber-200",
    min: 50,
    max: 79,
    color: "#F59E0B",
  },
  {
    level: "L4",
    nameVI: "Ngôi sao đang lên",
    nameEN: "Rising star",
    meaningVI: "Minh bạch cao, có giao dịch và phản hồi tích cực.",
    meaningEN: "High transparency with strong activity and feedback.",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    min: 80,
    max: 99,
    color: "#10B981",
  },
  {
    level: "L5",
    nameVI: "Trại uy tín hàng đầu",
    nameEN: "Top trusted kennel",
    meaningVI: "Mức minh bạch tối đa trên PetCare.",
    meaningEN: "Maximum transparency on PetCare.",
    chipClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    min: 100,
    max: 100,
    color: "#059669",
  },
];

export const TRANSPARENCY_TICK_INACTIVE = "#E5E7EB";

/** @deprecated Violations moved to compliance score — always ignored for transparency. */
export const LIGHT_VIOLATION_EXPIRY_DAYS = 90;
/** @deprecated */
export const LIGHT_VIOLATION_MAX_POINTS = 10;

/** @deprecated Use COMPLIANCE_MATRIX / mapReportReasonToCompliance instead. */
export const TRANSPARENCY_VIOLATION_PENALTIES = {
  inaccurate_listing: 10,
  stock_photo_spam: 5,
  confirmed_scam: 40,
  concealed_illness: 30,
  abusive_communication: 5,
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(TRANSPARENCY_SCORE_MAX, Math.round(value)));
}

/** @deprecated Transparency no longer subtracts violations (compliance score owns penalties). */
export function computeEffectiveViolationPoints(
  _input: Pick<TransparencyScoreInput, "penaltyPoints" | "violations" | "now">,
): number {
  return 0;
}

export function socialTransparencyPoints(
  input: Pick<
    TransparencyScoreInput,
    | "approvedFacebook"
    | "approvedZalo"
    | "approvedTiktok"
    | "approvedInstagram"
  >,
): number {
  let total = 0;
  if (input.approvedFacebook) total += TRANSPARENCY_POINTS.socialPlatform;
  if (input.approvedZalo) total += TRANSPARENCY_POINTS.socialPlatform;
  if (input.approvedTiktok) total += TRANSPARENCY_POINTS.socialPlatform;
  if (input.approvedInstagram) total += TRANSPARENCY_POINTS.socialPlatform;
  return total;
}

export function computeTransparencyScore(
  input: TransparencyScoreInput,
): TransparencyScoreResult {
  if (!input.isVerified) {
    return {
      score: 0,
      profilePoints: 0,
      activityPoints: 0,
      violationPoints: 0,
      lines: [
        {
          key: "verifiedBase",
          group: "profile",
          val: 0,
          max: TRANSPARENCY_POINTS.verifiedBase,
          done: false,
        },
      ],
    };
  }

  const verifiedBase = TRANSPARENCY_POINTS.verifiedBase;
  const social = socialTransparencyPoints(input);
  const facilityVideo = input.approvedFacilityVideo
    ? TRANSPARENCY_POINTS.facilityVideo
    : 0;
  const businessLicense = input.approvedBusinessLicense
    ? TRANSPARENCY_POINTS.businessLicense
    : 0;
  const firstWarranty = input.approvedFirstWarranty
    ? TRANSPARENCY_POINTS.firstWarranty
    : 0;
  const profilePoints =
    verifiedBase + social + facilityVideo + businessLicense + firstWarranty;
  const activityPoints = 0;
  const violationPoints = 0;
  const score = clampScore(profilePoints + activityPoints);

  const lines: TransparencyBreakdownLine[] = [
    {
      key: "verifiedBase",
      group: "profile",
      val: verifiedBase,
      max: TRANSPARENCY_POINTS.verifiedBase,
      done: true,
    },
    {
      key: "social",
      group: "profile",
      val: social,
      max: SOCIAL_PLATFORMS.length * TRANSPARENCY_POINTS.socialPlatform,
      done: social >= SOCIAL_PLATFORMS.length * TRANSPARENCY_POINTS.socialPlatform,
    },
    {
      key: "facilityVideo",
      group: "profile",
      val: facilityVideo,
      max: TRANSPARENCY_POINTS.facilityVideo,
      done: facilityVideo > 0,
    },
    {
      key: "businessLicense",
      group: "profile",
      val: businessLicense,
      max: TRANSPARENCY_POINTS.businessLicense,
      done: businessLicense > 0,
    },
    {
      key: "firstWarranty",
      group: "profile",
      val: firstWarranty,
      max: TRANSPARENCY_POINTS.firstWarranty,
      done: firstWarranty > 0,
    },
  ];

  return {
    score,
    profilePoints,
    activityPoints,
    violationPoints,
    lines,
  };
}

/** Profile-checklist completion (0–100), not the overall transparency score. */
export function transparencyProfileCompletionPercent(
  result: Pick<TransparencyScoreResult, "lines">,
): number {
  const lines = result.lines.filter((line) => line.group === "profile");
  const max = lines.reduce((sum, line) => sum + line.max, 0);
  if (max <= 0) return 0;
  const val = lines.reduce((sum, line) => sum + Math.max(0, line.val), 0);
  return Math.max(0, Math.min(100, Math.round((val / max) * 100)));
}

export function getTransparencyTier(score: number): TransparencyTierInfo {
  const s = clampScore(score);
  if (s >= 100) return TRANSPARENCY_TIERS[5];
  if (s >= 80) return TRANSPARENCY_TIERS[4];
  if (s >= 50) return TRANSPARENCY_TIERS[3];
  if (s >= 30) return TRANSPARENCY_TIERS[2];
  if (s >= 16) return TRANSPARENCY_TIERS[1];
  return TRANSPARENCY_TIERS[0];
}

/**
 * Transparency is an accumulative profile signal, so the gauge never uses alarm
 * red — a low score means "not finished yet", not "penalised".
 */
export const TRANSPARENCY_GAUGE_COLORS = {
  starting: "#F97316",
  building: "#0284C7",
  complete: "#10B981",
} as const;

export function transparencyScoreColor(score: number): string {
  const s = clampScore(score);
  if (s >= 80) return TRANSPARENCY_GAUGE_COLORS.complete;
  if (s >= 40) return TRANSPARENCY_GAUGE_COLORS.building;
  return TRANSPARENCY_GAUGE_COLORS.starting;
}

/** @deprecated Per-tick tier colors read as penalties — use transparencyScoreColor. */
export function transparencyTickBandColor(tickIndex: number): string {
  if (tickIndex <= 15) return TRANSPARENCY_TIERS[0].color;
  if (tickIndex <= 29) return TRANSPARENCY_TIERS[1].color;
  if (tickIndex <= 49) return TRANSPARENCY_TIERS[2].color;
  if (tickIndex <= 79) return TRANSPARENCY_TIERS[3].color;
  if (tickIndex <= 99) return TRANSPARENCY_TIERS[4].color;
  return TRANSPARENCY_TIERS[5].color;
}

export function transparencyTickColor(tickIndex: number, score: number): string {
  if (tickIndex > score) return TRANSPARENCY_TICK_INACTIVE;
  return transparencyScoreColor(score);
}

export function parseApprovedSocialFromMeta(meta: Record<string, unknown>): {
  approvedFacebook: boolean;
  approvedZalo: boolean;
  approvedTiktok: boolean;
  approvedInstagram: boolean;
} {
  const awarded = parseTrustAwardedFromMeta(meta);
  return {
    approvedFacebook: awarded.socialFacebook,
    approvedZalo: awarded.socialZalo,
    approvedTiktok: awarded.socialTiktok,
    approvedInstagram: awarded.socialInstagram,
  };
}

export type TrustAwardedFlags = {
  verifiedBase: boolean;
  socialFacebook: boolean;
  socialZalo: boolean;
  socialTiktok: boolean;
  socialInstagram: boolean;
  facilityVideo: boolean;
  businessLicense: boolean;
  firstWarranty: boolean;
};

function metaFlag(meta: Record<string, unknown>, ...keys: string[]): boolean {
  return keys.some((k) => {
    const v = meta[k];
    return v === true || v === 1 || v === "1" || v === "true";
  });
}

function trustAwardedFromMeta(
  meta: Record<string, unknown>,
  trustKey: string,
  ...legacyApprovedKeys: string[]
): boolean {
  if (metaFlag(meta, trustKey)) return true;
  return legacyApprovedKeys.some((k) => metaFlag(meta, k));
}

/** One-time transparency awards — legacy approved flags count until trust_awarded is set. */
export function parseTrustAwardedFromMeta(
  meta: Record<string, unknown>,
): TrustAwardedFlags {
  const policies = Array.isArray(meta.warranty_policies)
    ? meta.warranty_policies
    : [];
  return {
    verifiedBase: metaFlag(meta, "verified_base_trust_awarded"),
    socialFacebook: trustAwardedFromMeta(
      meta,
      "social_facebook_trust_awarded",
      "social_facebook_approved",
      "approved_social_facebook",
    ),
    socialZalo: trustAwardedFromMeta(
      meta,
      "social_zalo_trust_awarded",
      "social_zalo_approved",
      "approved_social_zalo",
    ),
    socialTiktok: trustAwardedFromMeta(
      meta,
      "social_tiktok_trust_awarded",
      "social_tiktok_approved",
      "approved_social_tiktok",
    ),
    socialInstagram: trustAwardedFromMeta(
      meta,
      "social_instagram_trust_awarded",
      "social_instagram_approved",
      "approved_social_instagram",
    ),
    facilityVideo: trustAwardedFromMeta(
      meta,
      "facility_video_trust_awarded",
      "facility_verified",
      "farm_video_verified",
      "environment_verified",
      "facility_video_approved",
    ),
    businessLicense: trustAwardedFromMeta(
      meta,
      "business_license_trust_awarded",
      "business_license_verified",
      "license_verified",
      "farm_license_verified",
      "business_license_approved",
    ),
    firstWarranty:
      trustAwardedFromMeta(
        meta,
        "warranty_policy_trust_awarded",
        "first_warranty_approved",
      ) || policies.length > 0,
  };
}

export function parseTransparencyActivityFromMeta(
  meta: Record<string, unknown>,
): {
  senConfirmedCompletions: number;
  fiveStarReviewCount: number;
  approvedFacilityVideo: boolean;
  approvedBusinessLicense: boolean;
  approvedFirstWarranty: boolean;
} {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const awarded = parseTrustAwardedFromMeta(meta);

  return {
    senConfirmedCompletions: num(
      meta.sen_confirmed_completions ??
        meta.senConfirmedCompletions ??
        meta.pets_rehomed ??
        meta.petsRehomed,
    ),
    fiveStarReviewCount: num(
      meta.five_star_review_count ?? meta.review_5star_count,
    ),
    approvedFacilityVideo: awarded.facilityVideo,
    approvedBusinessLicense: awarded.businessLicense,
    approvedFirstWarranty: awarded.firstWarranty,
  };
}
