/** Unread badge text for header chat + bell (web-aligned). */
export function formatHeaderBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(Math.max(0, count));
}

/**
 * Icon + badge colors for AppHeader actions (web SiteHeader parity).
 * Keep hex values in sync with `BRAND.headerIcon` / `headerBadge` / `headerIconPress`.
 */
export function headerActionColors() {
  return {
    icon: '#78716C',
    badge: '#D97706',
    pressBackground: '#FFFBEB',
  } as const;
}
