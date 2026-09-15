import { newsPostDetailHref } from "../newsDetail";
import { adminConsoleHref } from "./consoleNav";
import { listingPublicHref } from "./listingReject";
import { breederPublicHref } from "./reviewDetail";

export type HistoryLogLike = {
  action?: string;
  target_type?: string | null;
  target_id?: string | null;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function changePair(before: string, after: string): string | null {
  if (!before && !after) return null;
  if (before === after) return null;
  return `${before || "—"} → ${after || "—"}`;
}

/** Compact one-line summary for a history row (raw codes, not i18n). */
export function historyChangeSummary(log: HistoryLogLike): string {
  const before = log.before_state || {};
  const after = log.after_state || {};
  const action = String(log.action || "");
  const parts: string[] = [];

  if (action.startsWith("account.")) {
    const name = asText(after.display_name) || asText(before.display_name);
    if (name) parts.push(name);
    const role = changePair(asText(before.primary_role), asText(after.primary_role));
    if (role) parts.push(role);
    const status = changePair(
      asText(before.account_status),
      asText(after.account_status),
    );
    if (status) parts.push(status);
    return parts.join(" · ") || log.target_id || "—";
  }

  if (action === "feature_flags.update") {
    const keys = Array.isArray(log.metadata?.changed_keys)
      ? (log.metadata?.changed_keys as unknown[]).filter(
          (key): key is string => typeof key === "string" && key.trim().length > 0,
        )
      : [];
    return keys.length ? keys.join(", ") : "feature_flags";
  }

  if (action.startsWith("announcement.")) {
    return asText(after.title) || asText(before.title) || log.target_id || "—";
  }

  const status = changePair(
    asText(before.verification_status) || asText(before.status),
    asText(after.verification_status) || asText(after.status),
  );
  if (status) parts.push(status);
  const title = asText(after.title) || asText(before.title);
  if (title) parts.push(title);
  const kind = asText(after.kind) || asText(before.kind);
  if (kind) parts.push(kind);
  return parts.join(" · ") || log.target_id || "—";
}

export function historyTargetHref(log: HistoryLogLike): string | null {
  const id = String(log.target_id || "").trim();
  if (!id) return null;
  const type = String(log.target_type || "").trim().toLowerCase();
  if (type === "post") return listingPublicHref(id);
  if (type === "breeder_profile") return breederPublicHref(id);
  if (type === "report") {
    return adminConsoleHref({ section: "requests", type: "report", focus: id });
  }
  if (type === "farm_review") {
    return adminConsoleHref({
      section: "requests",
      type: "farm_review",
      focus: id,
    });
  }
  if (type === "breeder_submission") {
    return adminConsoleHref({ section: "requests", type: "detail", focus: id });
  }
  if (type === "transparency_warning") {
    return adminConsoleHref({ section: "requests", type: "appeal", focus: id });
  }
  if (type === "support_ticket") {
    const kind = asText(log.after_state?.kind) || asText(log.before_state?.kind);
    return adminConsoleHref({
      section: "requests",
      type: kind === "scam" ? "scam" : "feedback",
      focus: id,
    });
  }
  if (type === "announcement") return newsPostDetailHref(id);
  return null;
}

export function historyRejectionReason(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const raw = metadata?.rejection_reason ?? metadata?.rejectionReason;
  return typeof raw === "string" ? raw.trim() : "";
}
