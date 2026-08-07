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
export type BreederGroup = "all" | "active" | "inactive" | "waiting";

export type RequestStatusInput = {
  type: "breeder" | "post" | "report";
  status: string;
};

export type BreederGroupInput = {
  verification_status?: string | null;
};

export function requestStatusGroup(
  item: RequestStatusInput,
): Exclude<RequestStatus, "all"> {
  if (item.type === "report") return item.status === "open" ? "waiting" : "resolved";
  if (item.type === "breeder") {
    if (item.status === "verified") return "approved";
    if (item.status === "rejected" || item.status === "suspended") return "rejected";
    return "waiting";
  }
  if (item.status === "published") return "approved";
  if (item.status === "archived") return "rejected";
  return "waiting";
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
  return "waiting";
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
