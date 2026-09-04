/** Breeder compliance score (0–100) — starts at 100, deduct on confirmed violations. */

export const COMPLIANCE_SCORE_MAX = 100;
export const COMPLIANCE_SCORE_DEFAULT = 100;

export const COMPLIANCE_TIER_POINTS = {
  1: 5,
  2: 10,
  3: 25,
  4: 50,
} as const;

export type ComplianceTier = 1 | 2 | 3 | 4;

export type ComplianceBandId = "normal" | "warning" | "severe" | "banned";

export const COMPLIANCE_BANDS: Record<
  ComplianceBandId,
  { id: ComplianceBandId; min: number; max: number }
> = {
  normal: { id: "normal", min: 80, max: 100 },
  warning: { id: "warning", min: 50, max: 79 },
  severe: { id: "severe", min: 1, max: 49 },
  banned: { id: "banned", min: 0, max: 0 },
};

export const COMPLIANCE_REPORT_REASONS = [
  "stock_photo_spam",
  "wrong_category_species",
  "inaccurate_listing",
  "abusive_communication",
  "concealed_illness",
  "forged_documents",
  "confirmed_scam",
  "prohibited_wildlife",
] as const;

export type ComplianceReportReason = (typeof COMPLIANCE_REPORT_REASONS)[number];

const LEGACY_REASON_ALIASES: Record<string, ComplianceReportReason> = {
  scam: "confirmed_scam",
  misleading_health_claims: "concealed_illness",
  abusive_content: "abusive_communication",
  fake_contact: "inaccurate_listing",
  unsafe_transaction: "confirmed_scam",
  spam: "stock_photo_spam",
  misleading: "inaccurate_listing",
  other: "inaccurate_listing",
  report_upheld: "inaccurate_listing",
};

const REASON_TO_TIER: Record<ComplianceReportReason, ComplianceTier> = {
  stock_photo_spam: 1,
  wrong_category_species: 1,
  inaccurate_listing: 2,
  abusive_communication: 2,
  concealed_illness: 3,
  forged_documents: 3,
  confirmed_scam: 4,
  prohibited_wildlife: 4,
};

const TIER_IMMEDIATE_ACTIONS: Record<ComplianceTier, string[]> = {
  1: ["hide_listing"],
  2: ["hide_listing", "system_warning"],
  3: ["post_ban_14d", "strip_verified_30d"],
  4: ["hide_listing", "permanent_suspend"],
};

export type ComplianceMatrixRow = {
  tier: ComplianceTier;
  points: number;
  reasonCodes: ComplianceReportReason[];
  titleVI: string;
  titleEN: string;
  behaviorsVI: string;
  behaviorsEN: string;
  actionVI: string;
  actionEN: string;
};

export const COMPLIANCE_MATRIX: ComplianceMatrixRow[] = [
  {
    tier: 1,
    points: COMPLIANCE_TIER_POINTS[1],
    reasonCodes: ["stock_photo_spam", "wrong_category_species"],
    titleVI: "Mức 1: Nhẹ",
    titleEN: "Tier 1: Light",
    behaviorsVI:
      "Dùng ảnh mạng / spam bài trùng lặp; chọn sai danh mục / sai giống loài",
    behaviorsEN: "Stock photos / duplicate spam; wrong category or species",
    actionVI: "Tạm ẩn bài đăng vi phạm.",
    actionEN: "Temporarily hide the violating listing.",
  },
  {
    tier: 2,
    points: COMPLIANCE_TIER_POINTS[2],
    reasonCodes: ["inaccurate_listing", "abusive_communication"],
    titleVI: "Mức 2: Trung bình",
    titleEN: "Tier 2: Medium",
    behaviorsVI:
      "Đăng sai thông tin (giá ảo, tuổi, vắc-xin); thái độ độc hại / quấy rối trong chat",
    behaviorsEN:
      "False listing info (price, age, vaccines); abusive / harassing chat",
    actionVI: "Gỡ bài vi phạm + cảnh cáo toàn hệ thống.",
    actionEN: "Remove listing + system-wide warning.",
  },
  {
    tier: 3,
    points: COMPLIANCE_TIER_POINTS[3],
    reasonCodes: ["concealed_illness", "forged_documents"],
    titleVI: "Mức 3: Nghiêm trọng",
    titleEN: "Tier 3: Severe",
    behaviorsVI:
      "Che giấu bệnh truyền nhiễm (Care, Parvo…); giả mạo giấy tờ vắc-xin / gia phả",
    behaviorsEN:
      "Concealing infectious disease; forged vaccine / pedigree papers",
    actionVI: "Tạm khóa đăng bài 14 ngày; mất nhãn Verified trong 30 ngày.",
    actionEN: "Posting ban 14 days; Verified badge stripped for 30 days.",
  },
  {
    tier: 4,
    points: COMPLIANCE_TIER_POINTS[4],
    reasonCodes: ["confirmed_scam", "prohibited_wildlife"],
    titleVI: "Mức 4: Rất nghiêm trọng",
    titleEN: "Tier 4: Critical",
    behaviorsVI:
      "Lừa đảo cọc / tráo bé (có bằng chứng); bán động vật hoang dã / loài bị cấm (CITES)",
    behaviorsEN:
      "Deposit scam / bait-and-switch; prohibited wildlife / CITES species",
    actionVI: "Khóa tài khoản vĩnh viễn.",
    actionEN: "Permanently suspend the account.",
  },
];

export type ComplianceRestrictions = {
  verifiedStrippedUntil?: string | null;
  postBanUntil?: string | null;
  permanentBan?: boolean;
};

export type ComplianceEvent = {
  id: string;
  reportId?: string;
  tier: ComplianceTier;
  reasonCode: string;
  points: number;
  scoreAfter: number;
  actions: string[];
  createdAt: string;
};

export type ComplianceState = {
  score: number;
  updatedAt: string;
  events: ComplianceEvent[];
  restrictions?: ComplianceRestrictions;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(COMPLIANCE_SCORE_MAX, Math.round(value || 0)));
}

function addDaysIso(fromDate: Date, days: number): string {
  const d = new Date(fromDate.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function normalizeComplianceReasonCode(
  reason: string | null | undefined,
): ComplianceReportReason {
  const raw = String(reason || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!raw) return "inaccurate_listing";
  if ((REASON_TO_TIER as Record<string, ComplianceTier>)[raw]) {
    return raw as ComplianceReportReason;
  }
  if (LEGACY_REASON_ALIASES[raw]) return LEGACY_REASON_ALIASES[raw];
  return "inaccurate_listing";
}

export function mapReportReasonToCompliance(reason: string | null | undefined) {
  const reasonCode = normalizeComplianceReasonCode(reason);
  const tier = REASON_TO_TIER[reasonCode] || 2;
  const points = COMPLIANCE_TIER_POINTS[tier] ?? COMPLIANCE_TIER_POINTS[2];
  return {
    tier,
    reasonCode,
    points,
    immediateActions: [...(TIER_IMMEDIATE_ACTIONS[tier] || TIER_IMMEDIATE_ACTIONS[2])],
  };
}

export function getComplianceScoreFromMetadata(metadata: unknown): number {
  const compliance = asObject(asObject(metadata).compliance);
  if (
    compliance.score === undefined ||
    compliance.score === null ||
    compliance.score === ""
  ) {
    return COMPLIANCE_SCORE_DEFAULT;
  }
  return clampScore(Number(compliance.score));
}

export function complianceBandForScore(score: number): ComplianceBandId {
  const s = clampScore(score);
  if (s <= 0) return "banned";
  if (s <= 49) return "severe";
  if (s <= 79) return "warning";
  return "normal";
}

export function complianceBandLabel(
  band: ComplianceBandId,
  lang: "VI" | "EN" = "VI",
): string {
  const labels = {
    normal: { VI: "Bình thường", EN: "Normal" },
    warning: { VI: "Cảnh báo", EN: "Warning" },
    severe: { VI: "Hạn chế nghiêm trọng", EN: "Severe restriction" },
    banned: { VI: "Khóa tài khoản", EN: "Account locked" },
  } as const;
  return labels[band][lang];
}

export function complianceBandMeaning(
  band: ComplianceBandId,
  lang: "VI" | "EN" = "VI",
): string {
  const meanings = {
    normal: {
      VI: "Tài khoản hoạt động đầy đủ tính năng.",
      EN: "Full account features available.",
    },
    warning: {
      VI: "Mất nhãn Verified · tối đa 1 bài đăng/ngày.",
      EN: "Verified badge hidden · max 1 listing/day.",
    },
    severe: {
      VI: "Ẩn SĐT/Zalo/Maps · cấm đăng bài mới 30 ngày.",
      EN: "Hide phone/Zalo/Maps · posting banned 30 days.",
    },
    banned: {
      VI: "Tài khoản bị khóa · tin đăng bị gỡ khỏi sàn.",
      EN: "Account locked · listings removed from marketplace.",
    },
  } as const;
  return meanings[band][lang];
}

const COMPLIANCE_TICK_INACTIVE = "#E5E7EB";
export const COMPLIANCE_BAND_COLORS: Record<ComplianceBandId, string> = {
  normal: "#10B981",
  warning: "#F59E0B",
  severe: "#EF4444",
  banned: "#DC2626",
};

const COMPLIANCE_BAND_CHIP_STYLES: Record<
  ComplianceBandId,
  { bg: string; text: string; border: string }
> = {
  normal: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0" },
  warning: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  severe: { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
  banned: { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
};

export function complianceScoreColor(score: number): string {
  return COMPLIANCE_BAND_COLORS[complianceBandForScore(score)];
}

export function complianceBandChipStyle(band: ComplianceBandId) {
  return COMPLIANCE_BAND_CHIP_STYLES[band];
}

/** Tick color for compliance gauge (band of the active score). */
export function complianceTickColor(tickIndex: number, score: number): string {
  if (tickIndex > score) return COMPLIANCE_TICK_INACTIVE;
  return complianceScoreColor(score);
}

export function isComplianceVerifiedStripped(
  metadata: unknown,
  now: Date = new Date(),
): boolean {
  const restrictions = asObject(
    asObject(asObject(metadata).compliance).restrictions,
  );
  if (restrictions.permanentBan === true) return true;
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  if (band === "warning" || band === "severe" || band === "banned") return true;
  const until = restrictions.verifiedStrippedUntil;
  if (!until || typeof until !== "string") return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > now.getTime();
}

export function isCompliancePostBanned(
  metadata: unknown,
  now: Date = new Date(),
): boolean {
  const restrictions = asObject(
    asObject(asObject(metadata).compliance).restrictions,
  );
  if (restrictions.permanentBan === true) return true;
  const until = restrictions.postBanUntil;
  if (!until || typeof until !== "string") return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > now.getTime();
}

export function shouldHideComplianceContact(metadata: unknown): boolean {
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  return band === "severe" || band === "banned";
}

export function dailyListingCapForCompliance(metadata: unknown): number | null {
  const band = complianceBandForScore(getComplianceScoreFromMetadata(metadata));
  if (band === "warning") return 1;
  if (band === "severe" || band === "banned") return 0;
  return null;
}

export function applyComplianceDeduction(
  metadata: unknown,
  input: { reportId?: string; reason?: string; eventId?: string } = {},
  now: Date = new Date(),
) {
  const meta = asObject(metadata);
  const prev = asObject(meta.compliance);
  const events = Array.isArray(prev.events)
    ? ([...prev.events] as ComplianceEvent[])
    : [];
  const reportId = input.reportId ? String(input.reportId).trim() : "";
  if (reportId && events.some((e) => e && e.reportId === reportId)) {
    const score = getComplianceScoreFromMetadata(meta);
    return {
      compliance: {
        score,
        updatedAt:
          typeof prev.updatedAt === "string"
            ? prev.updatedAt
            : now.toISOString(),
        events,
        restrictions: {
          ...(asObject(prev.restrictions) as ComplianceRestrictions),
        },
      } satisfies ComplianceState,
      mapping: mapReportReasonToCompliance(input.reason),
      applied: false,
      scoreBefore: score,
      scoreAfter: score,
      band: complianceBandForScore(score),
      actions: [] as string[],
    };
  }

  const mapping = mapReportReasonToCompliance(input.reason);
  const scoreBefore = getComplianceScoreFromMetadata(meta);
  const scoreAfter = clampScore(scoreBefore - mapping.points);
  const restrictions: ComplianceRestrictions = {
    ...(asObject(prev.restrictions) as ComplianceRestrictions),
  };
  const actions = [...mapping.immediateActions];

  if (mapping.tier === 3) {
    const ban14 = addDaysIso(now, 14);
    if (
      !restrictions.postBanUntil ||
      Date.parse(restrictions.postBanUntil) < Date.parse(ban14)
    ) {
      restrictions.postBanUntil = ban14;
    }
    restrictions.verifiedStrippedUntil = addDaysIso(now, 30);
  }

  const band = complianceBandForScore(scoreAfter);
  if (band === "severe") {
    const ban30 = addDaysIso(now, 30);
    if (
      !restrictions.postBanUntil ||
      Date.parse(restrictions.postBanUntil) < Date.parse(ban30)
    ) {
      restrictions.postBanUntil = ban30;
    }
  }
  if (band === "banned" || mapping.tier === 4) {
    restrictions.permanentBan = true;
    if (!actions.includes("permanent_suspend")) actions.push("permanent_suspend");
    if (band === "banned" && !actions.includes("unpublish_all_listings")) {
      actions.push("unpublish_all_listings");
    }
  }

  const event: ComplianceEvent = {
    id: input.eventId || `cmp_${now.getTime()}`,
    reportId: reportId || undefined,
    tier: mapping.tier,
    reasonCode: mapping.reasonCode,
    points: mapping.points,
    scoreAfter,
    actions: [...actions],
    createdAt: now.toISOString(),
  };
  events.push(event);

  return {
    compliance: {
      score: scoreAfter,
      updatedAt: now.toISOString(),
      events,
      restrictions,
    } satisfies ComplianceState,
    mapping,
    applied: true,
    scoreBefore,
    scoreAfter,
    band,
    actions,
    event,
  };
}
