import { z } from "zod";

export const NOTIFICATIONS_LIMIT_MIN = 1;
export const NOTIFICATIONS_LIMIT_MAX = 100;
export const NOTIFICATIONS_LIMIT_DEFAULT = 50;
export const BLACKLIST_QUERY_MAX = 120;
export const COMMENT_BODY_MAX = 2000;
export const MESSAGE_BODY_MAX = 4000;
export const MESSAGE_MEDIA_MAX = 8;
export const DEAL_PHOTO_URLS_MAX = 5;
export const DEAL_DISPUTE_MESSAGE_MAX = 1200;
export const CANCEL_DEPOSIT_REASON_MAX = 500;
export const REVIEW_COMMENT_MAX = 2000;
export const MARK_NOTIFICATIONS_READ_MAX = 100;

export const httpUrlSchema = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => /^https?:\/\//i.test(value), "URL must start with http:// or https://");

export const httpUrlListSchema = (max: number) =>
  z.array(httpUrlSchema).max(max);

export function trimmedString(min: number, max: number) {
  return z.string().trim().min(min).max(max);
}

export function optionalTrimmedString(max: number) {
  return z.string().trim().max(max).optional();
}

export function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

export function nonEmptyId(value: unknown, max = 80): string | null {
  const id = String(value ?? "").trim();
  if (!id || id.length > max) return null;
  return id;
}

export function parseNotificationsLimit(raw: string | null | undefined): number {
  return clampInt(
    raw,
    NOTIFICATIONS_LIMIT_DEFAULT,
    NOTIFICATIONS_LIMIT_MIN,
    NOTIFICATIONS_LIMIT_MAX,
  );
}

export function parseBlacklistQuery(raw: string | null | undefined): string {
  return String(raw ?? "").trim().slice(0, BLACKLIST_QUERY_MAX);
}
