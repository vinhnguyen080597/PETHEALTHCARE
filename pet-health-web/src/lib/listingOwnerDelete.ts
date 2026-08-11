export const OWNER_DELETE_SOLD_COOLDOWN_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type OwnerDeleteBlockReason =
  | "not_owner"
  | "deposit_hold"
  | "sold_cooldown"
  | "already_deleted"
  | "not_allowed";

export type OwnerDeleteDecision = {
  allowed: boolean;
  reason: OwnerDeleteBlockReason | null;
  daysRemaining?: number;
  eligibleAt?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseTimeMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  const ms = new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function metadataMarksOwnerDeleted(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const meta = asRecord(metadata);
  return Boolean(meta.owner_deleted_at || meta.owner_deleted === true);
}

export function listingCompletionAtMs(input: {
  metadata?: Record<string, unknown> | null;
  completedAt?: string | null;
  senConfirmedCompleteAt?: string | null;
  autoCompletedAt?: string | null;
  soldAt?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}): number | null {
  const meta = asRecord(input.metadata);
  const deal = asRecord(meta.deal);
  const candidates = [
    input.completedAt,
    input.senConfirmedCompleteAt,
    input.autoCompletedAt,
    input.soldAt,
    deal.completed_at,
    deal.completedAt,
    deal.sen_confirmed_complete_at,
    deal.senConfirmedCompleteAt,
    deal.auto_completed_at,
    deal.autoCompletedAt,
    meta.sold_at,
    meta.completed_at,
    input.updatedAt,
    input.createdAt,
  ];
  for (const value of candidates) {
    const ms = parseTimeMs(value);
    if (ms != null) return ms;
  }
  return null;
}

export function evaluateOwnerDeleteListing(
  input: {
    isOwner?: boolean;
    status?: string | null;
    metadataSold?: boolean;
    metadataCancelled?: boolean;
    ownerDeleted?: boolean;
    metadata?: Record<string, unknown> | null;
    completedAt?: string | null;
    senConfirmedCompleteAt?: string | null;
    autoCompletedAt?: string | null;
    soldAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
  },
  now: number | Date = Date.now(),
): OwnerDeleteDecision {
  const nowMs = typeof now === "number" ? now : now.getTime();
  if (input.isOwner === false) {
    return { allowed: false, reason: "not_owner" };
  }

  if (input.ownerDeleted === true || metadataMarksOwnerDeleted(input.metadata)) {
    return { allowed: false, reason: "already_deleted" };
  }

  const status = String(input.status || "").trim().toLowerCase();
  const closed =
    status === "sold" ||
    status === "cancelled" ||
    Boolean(input.metadataSold) ||
    Boolean(input.metadataCancelled) ||
    (status === "archived" &&
      (Boolean(input.metadataSold) || Boolean(input.metadataCancelled)));

  if (status === "deposit_hold") {
    return { allowed: false, reason: "deposit_hold" };
  }

  if (closed) {
    const completedMs = listingCompletionAtMs(input) ?? nowMs;
    const eligibleAt = completedMs + OWNER_DELETE_SOLD_COOLDOWN_DAYS * DAY_MS;
    if (nowMs < eligibleAt) {
      return {
        allowed: false,
        reason: "sold_cooldown",
        daysRemaining: Math.max(1, Math.ceil((eligibleAt - nowMs) / DAY_MS)),
        eligibleAt: new Date(eligibleAt).toISOString(),
      };
    }
    return { allowed: true, reason: null };
  }

  if (status === "archived") {
    return { allowed: false, reason: "already_deleted" };
  }

  if (
    status === "draft" ||
    status === "pending_review" ||
    status === "published" ||
    status === ""
  ) {
    return { allowed: true, reason: null };
  }

  return { allowed: false, reason: "not_allowed" };
}

/** What the owner Delete button should do on click. */
export function listingDeleteClickAction(
  decision: OwnerDeleteDecision,
): "confirm" | "blocked" | "hidden" {
  if (decision.reason === "already_deleted" || decision.reason === "not_owner") {
    return "hidden";
  }
  if (!decision.allowed) return "blocked";
  return "confirm";
}

export function ownerDeleteBlockedMessage(
  decision: OwnerDeleteDecision,
  copy: { deposit: string; cooldown: string; generic?: string },
): string {
  if (decision.reason === "deposit_hold") return copy.deposit;
  if (decision.reason === "sold_cooldown") {
    return copy.cooldown.replace(
      "{days}",
      String(decision.daysRemaining ?? OWNER_DELETE_SOLD_COOLDOWN_DAYS),
    );
  }
  return copy.generic || copy.cooldown;
}
