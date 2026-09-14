import { COMPLIANCE_REPORT_REASONS } from "../breederComplianceScore";
import { listingPublicHref } from "./listingReject";

export const ADMIN_REPORT_STATUS_FILTERS = [
  "all",
  "open",
  "reviewed",
  "dismissed",
] as const;

export type AdminReportStatusFilter = (typeof ADMIN_REPORT_STATUS_FILTERS)[number];

const REASON_ALIASES: Record<string, string> = {
  scam: "confirmed_scam",
  misleading_health_claims: "concealed_illness",
  abusive_content: "abusive_communication",
  fake_contact: "inaccurate_listing",
  unsafe_transaction: "confirmed_scam",
  spam: "stock_photo_spam",
  misleading: "inaccurate_listing",
};

const KNOWN_REASON_CODES = new Set<string>([
  ...COMPLIANCE_REPORT_REASONS,
  "deal_dispute",
]);

/** i18n key for a report reason, or null to show the raw code. */
export function reportReasonLabelKey(
  reason: string | null | undefined,
): string | null {
  const raw = String(reason || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!raw) return null;
  const mapped = REASON_ALIASES[raw] || raw;
  if (!KNOWN_REASON_CODES.has(mapped)) return null;
  return `admin.reports.reason.${mapped}`;
}

export function reportStatusLabelKey(status: string | null | undefined): string {
  const value = String(status || "open").trim().toLowerCase();
  if (value === "reviewed") return "admin.reports.reviewed";
  if (value === "dismissed") return "admin.reports.dismissed";
  return "admin.reports.open";
}

/** Hide-from-marketplace is only safe for published listings (not deposit_hold / pending). */
export function listingHideFromReportAllowed(
  status: string | null | undefined,
): boolean {
  return String(status || "").trim().toLowerCase() === "published";
}

export function reportTargetHref(report: {
  post_id?: string | null;
  breeder_profile_id?: string | null;
  breeder_profile?: { id?: string } | null;
}): string | null {
  const postId = String(report.post_id || "").trim();
  if (postId) return listingPublicHref(postId);
  const breederId = String(
    report.breeder_profile_id || report.breeder_profile?.id || "",
  ).trim();
  if (breederId) return `/app/breeders/${encodeURIComponent(breederId)}`;
  return null;
}
