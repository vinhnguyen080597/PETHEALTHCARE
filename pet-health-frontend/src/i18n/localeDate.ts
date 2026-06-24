/** Format timestamps for list rows using the active app language. */
export function formatLocaleDateTime(iso: string, language: string): string {
  const locale = language.startsWith('vi') ? 'vi-VN' : 'en-US';
  return new Date(iso).toLocaleString(locale);
}

/** Compact day/month label for prominent schedule highlights. */
export function formatLocaleDayMonth(iso: string, language: string): string {
  const locale = language.startsWith('vi') ? 'vi-VN' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
  }).format(new Date(iso));
}
