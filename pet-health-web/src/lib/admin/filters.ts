export const HISTORY_ACTION_FILTERS = [
  "all",
  "breeder.verify",
  "breeder.reject",
  "breeder.suspend",
  "post.approve",
  "post.archive",
  "report.review",
  "report.dismiss",
  "account.create",
  "account.update",
  "feature_flags.update",
  "announcement.create",
  "announcement.update",
  "pet.create",
  "pet.update",
  "care_record.create",
  "care_record.update",
  "care_record.delete",
] as const;

export type HistoryActionFilter = (typeof HISTORY_ACTION_FILTERS)[number];
export type RequestStatus = "all" | "waiting" | "approved" | "rejected" | "resolved";
export type DateFilter = "newest" | "oldest" | "today" | "week";
export const BREEDER_STATUS_FILTERS = [
  "all",
  "waiting",
  "draft",
  "active",
  "inactive",
] as const;
export type BreederGroup = (typeof BREEDER_STATUS_FILTERS)[number];

export type RequestStatusInput = {
  type: "breeder" | "post" | "report" | "detail" | "appeal" | "feedback" | "scam" | "farm_review";
  status: string;
};

export type BreederGroupInput = {
  verification_status?: string | null;
};

export function requestStatusGroup(
  item: RequestStatusInput,
): Exclude<RequestStatus, "all"> {
  if (item.type === "report" || item.type === "feedback" || item.type === "scam") {
    return item.status === "open" ? "waiting" : "resolved";
  }
  if (item.type === "detail" || item.type === "farm_review") {
    if (item.status === "approved") return "approved";
    if (item.status === "rejected" || item.status === "cancelled") return "rejected";
    return "waiting";
  }
  if (item.type === "appeal") {
    if (item.status === "restored") return "approved";
    if (item.status === "upheld" || item.status === "confirmed") return "rejected";
    return "waiting";
  }
  if (item.type === "breeder") {
    if (item.status === "verified") return "approved";
    if (item.status === "rejected" || item.status === "suspended") return "rejected";
    // Draft/cancelled (unverified) are not approval-queue items; Breeders tab handles them.
    if (item.status === "pending_review") return "waiting";
    return "resolved";
  }
  // Listings: only pending_review is an approval-queue item. deposit_hold / sold / etc.
  // must not appear as "waiting" (those belong in Listings / Reports).
  if (item.status === "published") return "approved";
  if (item.status === "archived") return "rejected";
  if (item.status === "pending_review") return "waiting";
  return "resolved";
}

export function breederGroup(
  profile: BreederGroupInput,
): Exclude<BreederGroup, "all"> {
  if (profile.verification_status === "verified") return "active";
  if (
    profile.verification_status === "rejected" ||
    profile.verification_status === "suspended"
  ) {
    return "inactive";
  }
  if (profile.verification_status === "pending_review") return "waiting";
  return "draft";
}

/** pending_review verify is one-click; restoring or bypassing a draft needs confirm. */
export function breederVerifyConfirmKey(
  status: string | null | undefined,
): "admin.breeders.confirmRestore" | "admin.breeders.confirmVerify" | null {
  if (status === "pending_review") return null;
  if (status === "rejected" || status === "suspended") {
    return "admin.breeders.confirmRestore";
  }
  return "admin.breeders.confirmVerify";
}

/** Only pending_review breeders belong in Admin → Requests queue (with approve/reject). */
export function isBreederVerificationQueueItem(
  status: string | null | undefined,
): boolean {
  return status === "pending_review";
}

/** Only pending_review listings belong in Admin → Requests queue. */
export function isListingModerationQueueItem(
  status: string | null | undefined,
): boolean {
  return status === "pending_review";
}

/** i18n key for a request-queue type chip (`farm_review` uses camelCase copy). */
export function requestTypeLabelKey(type: string): string {
  if (type === "farm_review") return "admin.requests.type.farmReview";
  return `admin.requests.type.${type}`;
}

/**
 * Deep-link focus should not hide the item behind the default "waiting" filter.
 * If the focused row lives in another bucket, switch the status dropdown to it.
 */
export function statusFilterForFocusedItem(
  item: RequestStatusInput | null | undefined,
  current: RequestStatus,
): RequestStatus {
  if (!item || current === "all") return current;
  const group = requestStatusGroup(item);
  return current === group ? current : group;
}

export function passesDateFilter(
  createdAt: string | undefined,
  filter: DateFilter,
  nowMs: number = Date.now(),
) {
  if (filter === "newest" || filter === "oldest") return true;
  const createdMs = new Date(createdAt || "").getTime();
  if (!Number.isFinite(createdMs)) return false;
  const startOfToday = new Date(nowMs);
  startOfToday.setHours(0, 0, 0, 0);
  if (filter === "today") return createdMs >= startOfToday.getTime();
  return createdMs >= nowMs - 7 * 24 * 60 * 60 * 1000;
}

export function sortByDate<T extends { createdAt?: string; created_at?: string }>(
  items: T[],
  filter: DateFilter,
) {
  return [...items].sort((a, b) => {
    const aMs = new Date(a.createdAt || a.created_at || "").getTime() || 0;
    const bMs = new Date(b.createdAt || b.created_at || "").getTime() || 0;
    return filter === "oldest" ? aMs - bMs : bMs - aMs;
  });
}

export function historyActionI18nKey(action: string) {
  return `admin.history.action.${action}`;
}
