/** Admin-only post media download helpers. */

export function canDownloadPostMedia(isAdmin: boolean | null | undefined): boolean {
  return Boolean(isAdmin);
}

/** Soft anti-save for non-admins (UI friction only; public URLs remain fetchable). */
export function shouldBlockMediaSave(isAdmin: boolean | null | undefined): boolean {
  return !canDownloadPostMedia(isAdmin);
}

export function mediaDownloadFileName(
  url: string,
  fallbackBase = "pet-marketplace-media",
): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").filter(Boolean).pop() || "";
    if (base && /\.[a-z0-9]{2,5}$/i.test(base)) return base;
  } catch {
    // ignore invalid URL
  }
  const clean = fallbackBase.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${clean || "pet-marketplace-media"}.bin`;
}

export function listingMediaDownloadFallback(
  listingId: string,
  kind: "image" | "video",
  index = 0,
): string {
  const safeId = String(listingId || "post").replace(/[^\w-]+/g, "").slice(0, 24) || "post";
  const ext = kind === "video" ? "mp4" : "jpg";
  return `pet-marketplace-${safeId}-${kind}-${index + 1}.${ext}`;
}
