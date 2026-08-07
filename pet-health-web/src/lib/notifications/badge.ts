/** Unread badge text for the header notification bell. */
export function formatNotificationBadge(count: number) {
  if (count > 99) return "99+";
  return String(Math.max(0, count));
}
