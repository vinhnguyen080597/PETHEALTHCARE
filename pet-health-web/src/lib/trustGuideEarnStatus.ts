import type { BreederSubmissionType } from "./breederProfileSubmissions";
import { pickLangText, type TrustGuideHowToEarn } from "./farmTrustGuide";
import {
  parseTrustAwardedFromMeta,
  type TrustAwardedFlags,
} from "./breederTransparencyScore";
import type { Lang } from "./types";

export type TrustGuideEarnAction =
  | { kind: "none" }
  | { kind: "profile" }
  | { kind: "warranty" }
  | { kind: "submission"; submissionType: BreederSubmissionType };

export type EarnQueueStatus = "pending" | "rejected" | null;

export type EarnRowCta = "update" | "pending" | "rejected" | "none";

export type EarnRowMediaKind = "video" | "image";

export type EarnSubmissionLite = {
  submission_type: string;
  status: string;
  payload?: { url?: string; note?: string };
};

export type TrustGuideEarnRowState = {
  id: string;
  done: boolean;
  showArrow: boolean;
  cta: EarnRowCta;
  action: TrustGuideEarnAction;
  pointsLabel: string;
  description: string;
  descriptionHref: string | null;
  mediaKind: EarnRowMediaKind | null;
  mediaUrl: string | null;
};

const REPEATABLE_EARN_IDS = new Set<string>();

const EARN_ACTION_BY_ID: Record<string, TrustGuideEarnAction> = {
  verifiedBase: { kind: "profile" },
  facebook: { kind: "submission", submissionType: "social_facebook" },
  zalo: { kind: "submission", submissionType: "social_zalo" },
  tiktok: { kind: "submission", submissionType: "social_tiktok" },
  instagram: { kind: "submission", submissionType: "social_instagram" },
  farmFacility: { kind: "submission", submissionType: "facility_video" },
  businessLicense: { kind: "submission", submissionType: "business_license" },
  firstWarrantyPolicy: { kind: "warranty" },
};

const CONTACT_KEY_BY_EARN_ID: Record<string, string> = {
  facebook: "facebook",
  zalo: "zalo",
  tiktok: "tiktok",
  instagram: "instagram",
};

const META_URL_BY_EARN_ID: Record<string, string[]> = {
  farmFacility: ["facility_video_url"],
  businessLicense: ["business_license_url"],
};

export function trustGuideEarnActionForId(id: string): TrustGuideEarnAction {
  return EARN_ACTION_BY_ID[id] ?? { kind: "none" };
}

export function trustGuideEarnRowDone(
  id: string,
  ctx: {
    isVerified: boolean;
    awarded: TrustAwardedFlags;
    senConfirmedCompletions?: number;
    fiveStarReviewCount?: number;
  },
): boolean {
  switch (id) {
    case "verifiedBase":
      return ctx.isVerified;
    case "facebook":
      return ctx.awarded.socialFacebook;
    case "zalo":
      return ctx.awarded.socialZalo;
    case "tiktok":
      return ctx.awarded.socialTiktok;
    case "instagram":
      return ctx.awarded.socialInstagram;
    case "farmFacility":
      return ctx.awarded.facilityVideo;
    case "businessLicense":
      return ctx.awarded.businessLicense;
    case "firstWarrantyPolicy":
      return ctx.awarded.firstWarranty;
    default:
      return false;
  }
}

export function earnRowQueueStatus(
  id: string,
  ctx: {
    verificationStatus?: string;
    submissions?: EarnSubmissionLite[];
  },
): EarnQueueStatus {
  if (id === "verifiedBase") {
    const status = String(ctx.verificationStatus || "").toLowerCase();
    if (status === "pending_review") return "pending";
    if (status === "rejected") return "rejected";
    return null;
  }
  const action = trustGuideEarnActionForId(id);
  if (action.kind !== "submission") return null;
  const matches = (ctx.submissions ?? []).filter(
    (row) => row.submission_type === action.submissionType,
  );
  if (matches.some((row) => row.status === "pending")) return "pending";
  if (matches[0]?.status === "rejected") return "rejected";
  return null;
}

export type EarnRowCtaLabelKey =
  | "farm.trust.guide.earnPending"
  | "farm.trust.guide.earnRejected"
  | "farm.trust.guide.earnUpdate";

export function earnRowCtaLabelKey(
  cta: Exclude<EarnRowCta, "none">,
): EarnRowCtaLabelKey;
export function earnRowCtaLabelKey(cta: EarnRowCta): EarnRowCtaLabelKey | null;
export function earnRowCtaLabelKey(cta: EarnRowCta): EarnRowCtaLabelKey | null {
  if (cta === "pending") return "farm.trust.guide.earnPending";
  if (cta === "rejected") return "farm.trust.guide.earnRejected";
  if (cta === "update") return "farm.trust.guide.earnUpdate";
  return null;
}

export function earnRowCta(
  id: string,
  _done: boolean,
  queueStatus: EarnQueueStatus,
): EarnRowCta {
  if (REPEATABLE_EARN_IDS.has(id)) return "none";
  if (queueStatus === "pending") return "pending";
  if (queueStatus === "rejected") return "rejected";
  const action = trustGuideEarnActionForId(id);
  if (action.kind === "none") return "none";
  return "update";
}

export function trustGuideEarnShowArrow(
  id: string,
  done: boolean,
  queueStatus: EarnQueueStatus = null,
): boolean {
  const cta = earnRowCta(id, done, queueStatus);
  return cta === "update" || cta === "rejected";
}

export function formatTrustGuideEarnPoints(
  row: Pick<TrustGuideHowToEarn, "id" | "points">,
  _lang: Lang,
): string {
  return `+${row.points}đ`;
}

function metaText(meta: Record<string, unknown>, key: string): string {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

function approvedSubmissionUrl(id: string, submissions?: EarnSubmissionLite[]): string {
  const action = trustGuideEarnActionForId(id);
  if (action.kind !== "submission") return "";
  const match = (submissions ?? []).find(
    (row) =>
      row.submission_type === action.submissionType &&
      row.status === "approved" &&
      typeof row.payload?.url === "string" &&
      row.payload.url.trim(),
  );
  return match?.payload?.url?.trim() || "";
}

function firstWarrantyTitle(
  meta: Record<string, unknown>,
  warrantyPolicies?: Array<{ title?: string }>,
): string {
  const fromProps = (warrantyPolicies ?? [])
    .map((policy) => String(policy.title || "").trim())
    .find(Boolean);
  if (fromProps) return fromProps;
  const policies = Array.isArray(meta.warranty_policies) ? meta.warranty_policies : [];
  for (const policy of policies) {
    if (!policy || typeof policy !== "object") continue;
    const title = String((policy as { title?: string }).title || "").trim();
    if (title) return title;
  }
  return "";
}

export function formatEarnRowApprovedValue(value: string): string {
  const trimmed = value.trim();
  if (/^\+?\d[\d\s.-]{7,}$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, "");
  }
  try {
    const parsed = new URL(trimmed);
    const path = parsed.pathname.replace(/\/$/, "");
    return `${parsed.host}${path}` || trimmed;
  } catch {
    return trimmed;
  }
}

export function earnRowApprovedHref(value: string): string | null {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\+?\d[\d\s.-]{7,}$/.test(trimmed)) {
    return `tel:${trimmed.replace(/\s+/g, "")}`;
  }
  return null;
}

export function earnRowMediaKind(
  id: string,
  url: string | null | undefined,
): EarnRowMediaKind | null {
  const href = String(url || "").trim();
  if (!/^https?:\/\//i.test(href)) return null;
  if (id === "farmFacility") return "video";
  if (id === "businessLicense" && !/\.pdf(\?|$)/i.test(href)) return "image";
  return null;
}

export function earnRowApprovedValue(
  id: string,
  ctx: {
    meta?: Record<string, unknown>;
    contact?: Record<string, string | undefined>;
    submissions?: EarnSubmissionLite[];
    warrantyPolicies?: Array<{ title?: string }>;
  },
): string | null {
  if (id === "firstWarrantyPolicy") {
    const title = firstWarrantyTitle(ctx.meta ?? {}, ctx.warrantyPolicies);
    return title || null;
  }
  if (id === "verifiedBase" || REPEATABLE_EARN_IDS.has(id)) return null;

  const fromSubmission = approvedSubmissionUrl(id, ctx.submissions);
  if (fromSubmission) return fromSubmission;

  const contactKey = CONTACT_KEY_BY_EARN_ID[id];
  if (contactKey) {
    const fromContact = String(ctx.contact?.[contactKey] || "").trim();
    if (fromContact) return fromContact;
  }

  for (const key of META_URL_BY_EARN_ID[id] ?? []) {
    const fromMeta = metaText(ctx.meta ?? {}, key);
    if (fromMeta) return fromMeta;
  }
  return null;
}

export function earnRowDescription(
  row: Pick<TrustGuideHowToEarn, "howVI" | "howEN">,
  lang: Lang,
  approvedValue: string | null,
  done: boolean,
): string {
  if (done && approvedValue) return formatEarnRowApprovedValue(approvedValue);
  return pickLangText(lang, row.howVI, row.howEN);
}

export function buildTrustGuideEarnRowStates(
  rows: TrustGuideHowToEarn[],
  ctx: {
    isVerified: boolean;
    meta: Record<string, unknown>;
    senConfirmedCompletions: number;
    fiveStarReviewCount: number;
    lang: Lang;
    verificationStatus?: string;
    submissions?: EarnSubmissionLite[];
    contact?: Record<string, string | undefined>;
    warrantyPolicies?: Array<{ title?: string }>;
  },
): TrustGuideEarnRowState[] {
  const awarded = parseTrustAwardedFromMeta(ctx.meta);
  const doneCtx = {
    isVerified: ctx.isVerified,
    awarded,
    senConfirmedCompletions: ctx.senConfirmedCompletions,
    fiveStarReviewCount: ctx.fiveStarReviewCount,
  };
  const valueCtx = {
    meta: ctx.meta,
    contact: ctx.contact,
    submissions: ctx.submissions,
    warrantyPolicies: ctx.warrantyPolicies,
  };

  return rows.map((row) => {
    const done = trustGuideEarnRowDone(row.id, doneCtx);
    const queueStatus = earnRowQueueStatus(row.id, {
      verificationStatus: ctx.verificationStatus,
      submissions: ctx.submissions,
    });
    const cta = earnRowCta(row.id, done, queueStatus);
    const approvedValue = done ? earnRowApprovedValue(row.id, valueCtx) : null;
    const mediaKind = earnRowMediaKind(row.id, approvedValue);
    const mediaUrl = mediaKind && approvedValue ? approvedValue : null;
    return {
      id: row.id,
      done,
      showArrow: cta === "update" || cta === "rejected",
      cta,
      action: trustGuideEarnActionForId(row.id),
      pointsLabel: formatTrustGuideEarnPoints(row, ctx.lang),
      description: mediaUrl
        ? ""
        : earnRowDescription(row, ctx.lang, approvedValue, done),
      descriptionHref:
        mediaUrl || !(done && approvedValue)
          ? null
          : earnRowApprovedHref(approvedValue),
      mediaKind,
      mediaUrl,
    };
  });
}

export type EarnModalView = "form" | "loading" | "success";

export function earnModalView(state: {
  busy: boolean;
  submitted: boolean;
}): EarnModalView {
  if (state.submitted) return "success";
  if (state.busy) return "loading";
  return "form";
}

export function breederSubmissionErrorI18nKey(
  code: string,
): "farm.trust.guide.earnAlreadyPending" | null {
  if (code === "SUBMISSION_ALREADY_PENDING") {
    return "farm.trust.guide.earnAlreadyPending";
  }
  return null;
}
