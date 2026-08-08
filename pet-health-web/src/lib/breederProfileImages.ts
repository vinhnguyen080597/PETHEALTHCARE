/** Public defaults for Hồ sơ trại when the breeder has not uploaded photos. */
export const DEFAULT_BREEDER_AVATAR_PATH =
  "/images/breeder-profile/default-avatar.png";
export const DEFAULT_BREEDER_COVER_PATH =
  "/images/breeder-profile/default-background.png";

const LEGACY_UNSPLASH_COVER =
  /images\.unsplash\.com\/photo-1573865526739-10659fec78a5/i;

export function isBlankImageUrl(value: unknown): boolean {
  if (typeof value !== "string") return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("data:image/svg+xml")) return true;
  if (LEGACY_UNSPLASH_COVER.test(trimmed)) return true;
  return false;
}

export function resolveBreederAvatarUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (!isBlankImageUrl(candidate)) return String(candidate).trim();
  }
  return DEFAULT_BREEDER_AVATAR_PATH;
}

export function resolveBreederCoverUrl(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    if (!isBlankImageUrl(candidate)) return String(candidate).trim();
  }
  return DEFAULT_BREEDER_COVER_PATH;
}

/** Read cover from common metadata keys (web + mobile). */
export function coverUrlFromMetadata(
  meta: Record<string, unknown> | null | undefined,
): string | undefined {
  if (!meta) return undefined;
  for (const key of ["cover_url", "coverUrl", "coverImageUrl", "cover_image_url"]) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
