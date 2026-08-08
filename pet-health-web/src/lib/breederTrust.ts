import type { BreederProfile } from "./types";
import { getEffectiveTrust } from "./types";

/**
 * Official design: P_mission max stated as 50.
 * Line items currently sum to 45 (10+4+3+3+10+10+5) — keep headroom at 50.
 */
export const TRUST_MISSION_MAX = 50;

/** Part A — mission point awards (exact design table). */
export const TRUST_MISSION_POINTS = {
  ekyc: 10,
  facebook: 4,
  zalo: 3,
  tiktok: 3,
  farmFacility: 10,
  businessLicense: 10,
  healthDocs: 5,
} as const;

/** UI consolidated caps (wireframe). Escrow scoring deferred until Escrow ships. */
export const TRUST_UI_CAPS = {
  ekycLicense:
    TRUST_MISSION_POINTS.ekyc + TRUST_MISSION_POINTS.businessLicense, // 20
  social:
    TRUST_MISSION_POINTS.facebook +
    TRUST_MISSION_POINTS.zalo +
    TRUST_MISSION_POINTS.tiktok, // 10
  farmFacility: TRUST_MISSION_POINTS.farmFacility, // 10
  healthDocs: TRUST_MISSION_POINTS.healthDocs, // 5
  reviews: 10,
  response: 5,
} as const;

/** Part B without Escrow — reviews + response only (max 15). */
export const TRUST_TRANSACTION_MAX =
  TRUST_UI_CAPS.reviews + TRUST_UI_CAPS.response;

export const TRUST_TRANSACTION_CAPS = {
  reviews: TRUST_UI_CAPS.reviews,
  response: TRUST_UI_CAPS.response,
} as const;

export const LIGHT_VIOLATION_EXPIRY_DAYS = 90;
/** Light violations (e.g. inaccurate listing −5/−10) auto-expire. */
export const LIGHT_VIOLATION_MAX_POINTS = 10;

/** Confirmed-report penalty schedule (Part C) — reference for admin tooling. */
export const TRUST_VIOLATION_PENALTIES = {
  inaccurate_listing: 10,
  stock_photo_spam: 5,
  confirmed_scam: 40,
  concealed_illness: 30,
  abusive_communication: 5,
} as const;

/** @deprecated Prefer BreederTrustScoreInput mission flags. Kept for mapper bridge. */
export type BreederQualitySignals = {
  verified: boolean;
  checklistDoneCount: number;
  commitmentsCount: number;
  contactCount: number;
  hasCareEnvironment: boolean;
  activeListings: number;
};

export type BreederTrustScoreInput = {
  /** Part A flags */
  hasEkyc?: boolean;
  hasFacebook?: boolean;
  hasZalo?: boolean;
  hasTiktok?: boolean;
  /** Address + facility video (admin/geo verified when available). */
  hasFarmFacility?: boolean;
  hasBusinessLicense?: boolean;
  hasHealthDocs?: boolean;

  /** Legacy bridge fields (mapped into flags when flags omitted). */
  verified?: boolean;
  checklistDoneCount?: number;
  commitmentsCount?: number;
  contactCount?: number;
  hasCareEnvironment?: boolean;
  activeListings?: number;

  /** Part B (Escrow deferred) */
  fiveStarReviewCount?: number;
  fastResponseMonth?: boolean;

  /** Part C */
  penaltyPoints?: number;
  violations?: Array<{ points: number; date?: string; reason?: string }>;
  now?: Date;
};

export type TrustScoreBreakdownLine = {
  key: string;
  group: "mission" | "transaction" | "penalty";
  val: number;
  max: number;
  done: boolean;
};

export type BreederTrustScoreResult = {
  score: number;
  missionPoints: number;
  transactionPoints: number;
  violationPoints: number;
  lines: TrustScoreBreakdownLine[];
};

export type BreederPublicTrustMetrics = {
  qualityIndex: number;
  reviewCount: number;
  rating: number | null;
  petsRehomed: number;
  responseMinutes: number | null;
};

export type TrustTierId = "L0" | "L1" | "L2" | "L3" | "L4";

export type TrustTierInfo = {
  level: TrustTierId;
  nameVI: string;
  nameEN: string;
  meaningVI: string;
  meaningEN: string;
  chipClass: string;
  min: number;
  max: number;
  color: string;
};

export const TRUST_TIERS: TrustTierInfo[] = [
  {
    level: "L0",
    nameVI: "Cảnh báo rủi ro",
    nameEN: "Risk warning",
    meaningVI: "Hồ sơ có vi phạm nặng hoặc dấu hiệu bất thường.",
    meaningEN: "Serious violations or unusual risk signals on the profile.",
    chipClass: "bg-red-50 text-red-700 border-red-200",
    min: 0,
    max: 20,
    color: "#EF4444",
  },
  {
    level: "L1",
    nameVI: "Hồ sơ mới",
    nameEN: "New profile",
    meaningVI: "Trại mới tham gia, cần hoàn thiện thông tin xác minh.",
    meaningEN: "New kennel — finish verification details to build trust.",
    chipClass: "bg-orange-50 text-orange-700 border-orange-200",
    min: 21,
    max: 40,
    color: "#F97316",
  },
  {
    level: "L2",
    nameVI: "Đang xác minh",
    nameEN: "Verifying",
    meaningVI: "Đã cung cấp kênh liên hệ cơ bản, chưa có nhiều giao dịch.",
    meaningEN: "Basic contact on file; limited transaction history yet.",
    chipClass: "bg-amber-50 text-amber-800 border-amber-200",
    min: 41,
    max: 60,
    color: "#F59E0B",
  },
  {
    level: "L3",
    nameVI: "Đã kiểm định",
    nameEN: "Inspected",
    meaningVI: "Hồ sơ đầy đủ, đã xác minh danh tính và kênh liên hệ.",
    meaningEN: "Complete profile with verified identity and contact channels.",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    min: 61,
    max: 80,
    color: "#10B981",
  },
  {
    level: "L4",
    nameVI: "Trại tiêu chuẩn",
    nameEN: "Standard kennel",
    meaningVI: "Minh bạch tối đa, phản hồi tốt và đánh giá tích cực từ cộng đồng.",
    meaningEN: "Maximum transparency with strong community feedback.",
    chipClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    min: 81,
    max: 100,
    color: "#059669",
  },
];

export const TRUST_TICK_INACTIVE = "#E5E7EB";

export function contactFieldCount(
  contact: BreederProfile["contact"] | Record<string, string | undefined>,
): number {
  return Object.values(contact || {}).filter(
    (v) => typeof v === "string" && v.trim().length > 0,
  ).length;
}

export function trustTickBandColor(tickIndex: number): string {
  if (tickIndex <= 20) return TRUST_TIERS[0].color;
  if (tickIndex <= 40) return TRUST_TIERS[1].color;
  if (tickIndex <= 60) return TRUST_TIERS[2].color;
  if (tickIndex <= 80) return TRUST_TIERS[3].color;
  return TRUST_TIERS[4].color;
}

export function trustTickColor(tickIndex: number, score: number): string {
  if (tickIndex > score) return TRUST_TICK_INACTIVE;
  return trustTickBandColor(tickIndex);
}

export function getTrustTier(score: number): TrustTierInfo {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s <= 20) return TRUST_TIERS[0];
  if (s <= 40) return TRUST_TIERS[1];
  if (s <= 60) return TRUST_TIERS[2];
  if (s <= 80) return TRUST_TIERS[3];
  return TRUST_TIERS[4];
}

function daysBetween(isoDate: string, now: Date): number | null {
  const t = Date.parse(isoDate);
  if (!Number.isFinite(t)) return null;
  return (now.getTime() - t) / (1000 * 60 * 60 * 24);
}

export function computeEffectiveViolationPoints(
  input: Pick<BreederTrustScoreInput, "penaltyPoints" | "violations" | "now">,
): number {
  const now = input.now ?? new Date();
  const list = input.violations;
  if (Array.isArray(list) && list.length > 0) {
    let sum = 0;
    for (const v of list) {
      const pts = Math.max(0, Number(v.points) || 0);
      if (pts <= 0) continue;
      if (pts <= LIGHT_VIOLATION_MAX_POINTS && v.date) {
        const age = daysBetween(v.date, now);
        if (age != null && age > LIGHT_VIOLATION_EXPIRY_DAYS) continue;
      }
      sum += pts;
    }
    return sum;
  }
  return Math.max(0, Number(input.penaltyPoints) || 0);
}

function resolveMissionFlags(input: BreederTrustScoreInput): {
  hasEkyc: boolean;
  hasFacebook: boolean;
  hasZalo: boolean;
  hasTiktok: boolean;
  hasFarmFacility: boolean;
  hasBusinessLicense: boolean;
  hasHealthDocs: boolean;
} {
  const hasEkyc = input.hasEkyc ?? Boolean(input.verified);
  const hasFarmFacility =
    input.hasFarmFacility ?? Boolean(input.hasCareEnvironment);
  const hasHealthDocs =
    input.hasHealthDocs ?? (input.checklistDoneCount ?? 0) > 0;
  const hasFacebook = input.hasFacebook ?? false;
  const hasZalo = input.hasZalo ?? false;
  const hasTiktok = input.hasTiktok ?? false;
  const hasBusinessLicense = input.hasBusinessLicense ?? false;

  return {
    hasEkyc,
    hasFacebook,
    hasZalo,
    hasTiktok,
    hasFarmFacility,
    hasBusinessLicense,
    hasHealthDocs,
  };
}

/**
 * S = clamp(0, 100, P_mission + P_tx − P_violation)
 * Escrow transaction points deferred until Escrow is available.
 */
export function computeBreederTrustScore(
  input: BreederTrustScoreInput,
): BreederTrustScoreResult {
  const flags = resolveMissionFlags(input);

  const ekyc = flags.hasEkyc ? TRUST_MISSION_POINTS.ekyc : 0;
  const facebook = flags.hasFacebook ? TRUST_MISSION_POINTS.facebook : 0;
  const zalo = flags.hasZalo ? TRUST_MISSION_POINTS.zalo : 0;
  const tiktok = flags.hasTiktok ? TRUST_MISSION_POINTS.tiktok : 0;
  const farmFacility = flags.hasFarmFacility
    ? TRUST_MISSION_POINTS.farmFacility
    : 0;
  const businessLicense = flags.hasBusinessLicense
    ? TRUST_MISSION_POINTS.businessLicense
    : 0;
  const healthDocs = flags.hasHealthDocs ? TRUST_MISSION_POINTS.healthDocs : 0;

  const missionPoints = Math.min(
    TRUST_MISSION_MAX,
    ekyc +
      facebook +
      zalo +
      tiktok +
      farmFacility +
      businessLicense +
      healthDocs,
  );

  const reviews = Math.min(
    TRUST_TRANSACTION_CAPS.reviews,
    Math.max(0, input.fiveStarReviewCount ?? 0),
  );
  const response = input.fastResponseMonth
    ? TRUST_TRANSACTION_CAPS.response
    : 0;
  const transactionPoints = Math.min(
    TRUST_TRANSACTION_MAX,
    reviews + response,
  );

  const violationPoints = computeEffectiveViolationPoints(input);
  const raw = missionPoints + transactionPoints - violationPoints;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const ekycLicense = ekyc + businessLicense;
  const social = facebook + zalo + tiktok;

  const lines: TrustScoreBreakdownLine[] = [
    {
      key: "ekycLicense",
      group: "mission",
      val: ekycLicense,
      max: TRUST_UI_CAPS.ekycLicense,
      done: ekycLicense >= TRUST_UI_CAPS.ekycLicense,
    },
    {
      key: "social",
      group: "mission",
      val: social,
      max: TRUST_UI_CAPS.social,
      done: social >= TRUST_UI_CAPS.social,
    },
    {
      key: "farmFacility",
      group: "mission",
      val: farmFacility,
      max: TRUST_UI_CAPS.farmFacility,
      done: farmFacility > 0,
    },
    {
      key: "healthDocs",
      group: "mission",
      val: healthDocs,
      max: TRUST_UI_CAPS.healthDocs,
      done: healthDocs > 0,
    },
    {
      key: "reviews",
      group: "transaction",
      val: reviews,
      max: TRUST_UI_CAPS.reviews,
      done: reviews > 0,
    },
    {
      key: "response",
      group: "transaction",
      val: response,
      max: TRUST_UI_CAPS.response,
      done: response > 0,
    },
    {
      key: "penalty",
      group: "penalty",
      val: -violationPoints,
      max: 0,
      done: violationPoints === 0,
    },
  ];

  return {
    score,
    missionPoints: Math.round(missionPoints),
    transactionPoints: Math.round(transactionPoints),
    violationPoints,
    lines,
  };
}

export function computeBreederQualityIndex(
  signals: BreederTrustScoreInput,
): number {
  return computeBreederTrustScore(signals).score;
}

export function qualitySignalsFromBreeder(
  breeder: Pick<
    BreederProfile,
    | "verified"
    | "checklist"
    | "commitments"
    | "contact"
    | "careEnvironment"
    | "bio"
    | "activeListings"
    | "penaltyPoints"
    | "violations"
    | "verificationTier"
  >,
  listingCount?: number,
  extras?: {
    fiveStarReviewCount?: number;
    fastResponseMonth?: boolean;
    hasBusinessLicense?: boolean;
    hasFarmFacility?: boolean;
    hasHealthDocs?: boolean;
    hasEkyc?: boolean;
  },
): BreederTrustScoreInput {
  const care =
    (breeder.careEnvironment || "").trim() || (breeder.bio || "").trim();
  const contact = breeder.contact || {};
  return {
    hasEkyc: extras?.hasEkyc ?? Boolean(breeder.verified),
    hasFacebook: Boolean(contact.facebook?.trim()),
    hasZalo: Boolean(contact.zalo?.trim()),
    hasTiktok: Boolean(contact.tiktok?.trim()),
    hasFarmFacility: extras?.hasFarmFacility ?? Boolean(care),
    hasBusinessLicense:
      extras?.hasBusinessLicense ??
      (breeder.verificationTier != null && breeder.verificationTier >= 2),
    hasHealthDocs:
      extras?.hasHealthDocs ?? breeder.checklist.some((c) => c.done),
    verified: Boolean(breeder.verified),
    checklistDoneCount: breeder.checklist.filter((c) => c.done).length,
    commitmentsCount: breeder.commitments.length,
    contactCount: contactFieldCount(contact),
    hasCareEnvironment: Boolean(care),
    activeListings:
      typeof listingCount === "number" ? listingCount : breeder.activeListings,
    penaltyPoints: breeder.penaltyPoints,
    violations: breeder.violations,
    fiveStarReviewCount: extras?.fiveStarReviewCount ?? 0,
    fastResponseMonth: extras?.fastResponseMonth ?? false,
  };
}

export function getBreederPublicTrustMetrics(
  breeder: BreederProfile,
  options?: { listingCount?: number },
): BreederPublicTrustMetrics {
  const listingCount = options?.listingCount ?? breeder.activeListings;
  const fromProfile = getEffectiveTrust(
    breeder.trustScore,
    breeder.penaltyPoints,
  );
  const qualityIndex = Number.isFinite(breeder.trustScore)
    ? fromProfile
    : computeBreederQualityIndex(
        qualitySignalsFromBreeder(breeder, listingCount),
      );

  return {
    qualityIndex: Math.max(0, Math.min(100, qualityIndex)),
    reviewCount: 0,
    rating: null,
    petsRehomed: 0,
    responseMinutes: null,
  };
}

export function parseStoredTrustScore(
  meta: Record<string, unknown>,
): number | null {
  const raw = meta.trust_score ?? meta.trustScore;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, raw));
  }
  const asNum = typeof raw === "string" ? Number(raw) : NaN;
  if (Number.isFinite(asNum)) return Math.max(0, Math.min(100, asNum));
  return null;
}

export function parseTrustActivityFromMeta(meta: Record<string, unknown>): {
  fiveStarReviewCount: number;
  fastResponseMonth: boolean;
  hasBusinessLicense: boolean;
  hasFarmFacility: boolean;
  hasHealthDocs: boolean;
  hasEkyc: boolean;
} {
  const num = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  };
  const flag = (...keys: string[]) =>
    keys.some((k) => {
      const v = meta[k];
      return v === true || v === 1 || v === "1" || v === "true";
    });

  return {
    fiveStarReviewCount: num(
      meta.five_star_review_count ?? meta.review_5star_count,
    ),
    fastResponseMonth: Boolean(
      meta.fast_response_month ?? meta.response_under_15_month,
    ),
    hasBusinessLicense: flag(
      "business_license_verified",
      "license_verified",
      "farm_license_verified",
    ),
    hasFarmFacility: flag(
      "facility_verified",
      "farm_video_verified",
      "environment_verified",
    ),
    hasHealthDocs: flag("health_docs_verified", "vaccine_book_verified"),
    hasEkyc: flag("ekyc_verified", "id_verified"),
  };
}
