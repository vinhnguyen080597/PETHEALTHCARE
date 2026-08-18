/** Rebuild a Cookie header after rotating session tokens in middleware. */
export function mergeCookieHeader(
  cookieHeader: string,
  updates: Record<string, string | null | undefined>,
): string {
  const map = new Map<string, string>();
  for (const part of String(cookieHeader || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    map.set(key, part.slice(idx + 1).trim());
  }
  for (const [key, value] of Object.entries(updates)) {
    if (!key) continue;
    if (value == null || value === "") map.delete(key);
    else map.set(key, value);
  }
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}
