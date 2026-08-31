/** Keep each Next/serverless photo under the ~4.5MB function payload cap. */
export const FUNCTION_SAFE_PHOTO_BYTES = 900_000;
/** Reject a single photo before it can trip Vercel FUNCTION_PAYLOAD_TOO_LARGE. */
export const NEXT_FUNCTION_PHOTO_MAX_BYTES = 3_500_000;

export class DealSubmitError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "DealSubmitError";
    this.status = status;
    this.code = code;
  }
}

export function shouldCompressDealPhoto(file: {
  size?: number;
  type?: string;
}): boolean {
  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size <= 0) return false;
  if (size > FUNCTION_SAFE_PHOTO_BYTES) return true;
  const type = String(file.type || "").toLowerCase();
  return type === "image/png" || type === "image/webp" || type === "image/heic";
}

export function isFunctionPayloadTooLarge(input: {
  status?: number | null;
  code?: string | null;
  message?: string | null;
}): boolean {
  const status = Number(input.status || 0);
  const code = String(input.code || "").toUpperCase();
  const message = String(input.message || "");
  return (
    status === 413 ||
    code === "FUNCTION_PAYLOAD_TOO_LARGE" ||
    /payload too large|entity too large/i.test(message)
  );
}

export function dealPhotoSubmitErrorKey(input: {
  status?: number | null;
  code?: string | null;
  message?: string | null;
}): "deal.photosTooLarge" | null {
  return isFunctionPayloadTooLarge(input) ? "deal.photosTooLarge" : null;
}

export function httpPhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item));
}

const IMAGE_MIME_PREFIX = "image/";

/** Append newly picked images, drop empties/non-images, cap at max. */
export function mergeDealPhotoFiles(
  existing: File[],
  incoming: FileList | File[] | null | undefined,
  max: number,
): File[] {
  const cap = Math.max(0, Math.floor(max));
  const next = Array.isArray(incoming)
    ? incoming
    : incoming
      ? Array.from(incoming)
      : [];
  const images = next.filter(
    (f) => f && f.size > 0 && String(f.type || "").startsWith(IMAGE_MIME_PREFIX),
  );
  return [...existing, ...images].slice(0, cap);
}

/** Replace `{max}` in photo-picker drop hints (support hub + legacy copy). */
export function photosDropHint(template: string, max: number): string {
  return String(template || "").replace(/\{max\}/g, String(max));
}

export function dealSubmitErrorMessage(
  err: unknown,
  translate: (key: "deal.photosTooLarge") => string,
): string {
  const status = err instanceof DealSubmitError ? err.status : undefined;
  const code = err instanceof DealSubmitError ? err.code : undefined;
  const message = err instanceof Error ? err.message : "Failed";
  const key = dealPhotoSubmitErrorKey({ status, code, message });
  return key ? translate(key) : message || "Failed";
}
