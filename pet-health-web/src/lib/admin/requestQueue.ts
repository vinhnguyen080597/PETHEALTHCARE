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
