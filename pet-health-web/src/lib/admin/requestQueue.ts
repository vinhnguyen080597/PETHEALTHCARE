import type { RequestStatusInput } from "./filters";

export type RequestQueueFocusSource = {
  type: RequestStatusInput["type"];
  profile?: { id?: string };
  post?: { id?: string };
  detail?: { id?: string };
  farmReview?: { id?: string };
  appeal?: { id?: string };
  ticket?: { id?: string };
  report?: { id?: string };
};

/** Raw entity id used in `?focus=` and `id="admin-request-…"`. */
export function requestQueueFocusId(
  item: RequestQueueFocusSource,
): string | undefined {
  switch (item.type) {
    case "breeder":
      return item.profile?.id || undefined;
    case "post":
      return item.post?.id || undefined;
    case "detail":
      return item.detail?.id || undefined;
    case "farm_review":
      return item.farmReview?.id || undefined;
    case "appeal":
      return item.appeal?.id || undefined;
    case "feedback":
    case "scam":
      return item.ticket?.id || undefined;
    case "report":
      return item.report?.id || undefined;
    default:
      return undefined;
  }
}

export function findRequestByFocusId<T extends RequestQueueFocusSource>(
  items: T[],
  focusId: string | null | undefined,
): T | undefined {
  if (!focusId) return undefined;
  return items.find((item) => requestQueueFocusId(item) === focusId);
}

export function isSafeHttpUrl(value: string | null | undefined): boolean {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url);
}

/** Zalo submissions may be a phone number; only http(s) becomes a link. */
export function submissionPayloadHref(
  url: string | null | undefined,
  submissionType?: string | null,
): string | null {
  const value = String(url || "").trim();
  if (!value) return null;
  if (String(submissionType || "") === "social_zalo" && !isSafeHttpUrl(value)) {
    return null;
  }
  return isSafeHttpUrl(value) ? value : null;
}

export function farmReviewKindI18nKey(kind: string | null | undefined): string {
  const value = String(kind || "").trim().toLowerCase();
  if (value === "sale" || value === "supplement") {
    return `admin.farmReviews.kind.${value}`;
  }
  return "admin.farmReviews.kind.primary";
}

export function appealStatusLabelKey(status: string | null | undefined): string {
  const value = String(status || "").trim().toLowerCase();
  if (
    value === "appealed" ||
    value === "upheld" ||
    value === "restored" ||
    value === "confirmed" ||
    value === "pending_breeder_action"
  ) {
    return `admin.appeals.status.${value}`;
  }
  return "admin.appeals.status.appealed";
}

const FEEDBACK_CATEGORIES = new Set(["ui", "feature", "bug", "other"]);
const SCAM_TARGET_TYPES = new Set(["account", "phone", "facebook", "bank"]);

/** i18n key for a feedback category, or null to show the raw code. */
export function supportFeedbackCategoryLabelKey(
  category: string | null | undefined,
): string | null {
  const value = String(category || "").trim().toLowerCase();
  if (!FEEDBACK_CATEGORIES.has(value)) return null;
  return `supportHub.feedback.cat.${value}`;
}

/** i18n key for a scam target type, or null to show the raw code. */
export function supportScamTargetLabelKey(
  targetType: string | null | undefined,
): string | null {
  const value = String(targetType || "").trim().toLowerCase();
  if (!SCAM_TARGET_TYPES.has(value)) return null;
  return `supportHub.scam.type.${value}`;
}
