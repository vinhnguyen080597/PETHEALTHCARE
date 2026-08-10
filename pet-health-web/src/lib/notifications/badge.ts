/** Unread badge text for the header notification bell. */
export function formatNotificationBadge(count: number) {
  if (count > 99) return "99+";
  return String(Math.max(0, count));
}

/** Shared pill style for header chat + bell unread counts (brand amber). */
export const HEADER_UNREAD_BADGE_CLASS =
  "absolute top-1 right-1 min-w-4 h-4 px-1 bg-[#D97706] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none";
