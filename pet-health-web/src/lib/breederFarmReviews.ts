/** Farm review helpers — validation, rating pool, display (mirrors backend). */

import { formatBreederReviewLabel, parseReviewStatsFromMeta } from "./breederDealReviews";
import { t } from "../i18n";
import type { Lang } from "./types";

export {
  formatBreederReviewLabel,
  parseReviewStatsFromMeta,
};

export const FARM_REVIEW_RATING_MIN = 1;
export const FARM_REVIEW_RATING_MAX = 5;
export const FARM_REVIEW_BODY_MAX = 500;
export const FARM_REVIEW_MAX_PHOTOS = 5;

export type FarmReviewKind = "primary" | "supplement" | "sale";
export type FarmReviewStatus = "pending" | "approved" | "rejected";

export type BreederFarmReview = {
  id: string;
  breeder_profile_id: string;
  reviewer_user_id: string;
  kind: FarmReviewKind;
  parent_review_id?: string | null;
  post_id?: string | null;
  rating: number;
  body?: string;
  photo_urls?: string[];
  status?: FarmReviewStatus;
  created_at?: string;
  reviewer_display_name?: string;
  reviewer_avatar_url?: string | null;
};

export type BreederFarmReviewThread = BreederFarmReview & {
  supplements: BreederFarmReview[];
};

export type BreederFarmReviewAggregate = {
  review_count: number;
  review_avg: number;
  five_star_review_count: number;
  pets_sold_on_platform: number;
  sen_confirmed_completions: number;
  threads: BreederFarmReviewThread[];
};

export function normalizeFarmReviewRating(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  const rounded = Math.round(n);
  if (rounded < FARM_REVIEW_RATING_MIN || rounded > FARM_REVIEW_RATING_MAX) return 0;
  return rounded;
}

export function normalizeFarmReviewPhotoUrls(
  raw: unknown,
  max = FARM_REVIEW_MAX_PHOTOS,
): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, max);
}

export function canAddFarmReviewPhoto(
  currentCount: number,
  max = FARM_REVIEW_MAX_PHOTOS,
): boolean {
  return currentCount < max;
}

export type FarmReviewValidationError =
  | "invalid_rating"
  | "body_too_long"
  | "too_many_photos";

export function farmReviewValidationError(input: {
  rating?: unknown;
  body?: unknown;
  photoUrls?: unknown;
}): FarmReviewValidationError | null {
  const rating = normalizeFarmReviewRating(input.rating);
  if (!rating) return "invalid_rating";
  const body = String(input.body ?? "").trim();
  if (body.length > FARM_REVIEW_BODY_MAX) return "body_too_long";
  const photos = normalizeFarmReviewPhotoUrls(input.photoUrls);
  if (photos.length > FARM_REVIEW_MAX_PHOTOS) return "too_many_photos";
  return null;
}

export function validateFarmReviewInput(input: {
  rating?: unknown;
  body?: unknown;
  photoUrls?: unknown;
}): string | null {
  const code = farmReviewValidationError(input);
  if (!code) return null;
  if (code === "invalid_rating") return "Rating must be between 1 and 5";
  if (code === "body_too_long") return "Review is too long";
  return "Too many photos";
}

export function farmReviewValidationMessage(
  lang: Lang,
  input: { rating?: unknown; body?: unknown; photoUrls?: unknown },
): string | null {
  const code = farmReviewValidationError(input);
  if (!code) return null;
  if (code === "invalid_rating") return t(lang, "farm.review.error.rating");
  if (code === "body_too_long") return t(lang, "farm.review.error.bodyTooLong");
  return t(lang, "farm.review.error.tooManyPhotos");
}

export function normalizeFarmReviewStatus(value: unknown): FarmReviewStatus {
  const status = String(value || "").trim().toLowerCase();
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

export function isFarmReviewApproved(row: { status?: unknown }): boolean {
  return normalizeFarmReviewStatus(row?.status) === "approved";
}

export function filterApprovedFarmReviews<T extends { status?: unknown }>(
  reviews: T[],
): T[] {
  return reviews.filter((row) => isFarmReviewApproved(row));
}

export function filterApprovedFarmReviewThreads<
  T extends { status?: unknown; supplements?: Array<{ status?: unknown }> },
>(threads: T[]): T[] {
  return threads
    .filter((row) => isFarmReviewApproved(row))
    .map((row) => ({
      ...row,
      supplements: Array.isArray(row.supplements)
        ? row.supplements.filter((item) => isFarmReviewApproved(item))
        : [],
    }));
}

/** Visible review cards on farm profile (primary + sale; supplements nest under primary). */
export function countFarmReviewDisplayThreads(
  reviews: Array<{ kind?: string; status?: unknown }>,
): number {
  let count = 0;
  for (const row of filterApprovedFarmReviews(reviews)) {
    const kind = String(row.kind || "").trim().toLowerCase();
    if (kind === "primary" || kind === "sale") count += 1;
  }
  return count;
}

/** Map API review threads for display (mirrors mobile `mapFarmReviewThreads`). */
export function mapFarmReviewThreads(
  threads: unknown,
): BreederFarmReviewThread[] {
  if (!Array.isArray(threads)) return [];
  const result: BreederFarmReviewThread[] = [];

  for (const row of threads) {
    const primary = row as {
      id?: string;
      breeder_profile_id?: string;
      reviewer_user_id?: string;
      kind?: FarmReviewKind;
      parent_review_id?: string | null;
      post_id?: string | null;
      rating?: number;
      body?: string;
      status?: string;
      created_at?: string;
      photo_urls?: unknown;
      photoUrls?: unknown;
      reviewer_display_name?: string;
      reviewer_avatar_url?: string | null;
      supplements?: Array<{
        id?: string;
        breeder_profile_id?: string;
        reviewer_user_id?: string;
        kind?: FarmReviewKind;
        parent_review_id?: string | null;
        post_id?: string | null;
        rating?: number;
        body?: string;
        status?: string;
        created_at?: string;
        photo_urls?: unknown;
        photoUrls?: unknown;
        reviewer_display_name?: string;
        reviewer_avatar_url?: string | null;
      }>;
    };

    const id = String(primary.id || "").trim();
    if (!id) continue;

    const supplements = Array.isArray(primary.supplements)
      ? primary.supplements
          .map((item) => {
            const supplementId = String(item.id || "").trim();
            const rating = normalizeFarmReviewRating(item.rating);
            if (!supplementId || !rating) return null;
            const status = normalizeFarmReviewStatus(item.status);
            if (!isFarmReviewApproved({ status })) return null;
            return {
              id: supplementId,
              breeder_profile_id: String(item.breeder_profile_id || "").trim(),
              reviewer_user_id: String(item.reviewer_user_id || "").trim(),
              kind: (item.kind || "supplement") as FarmReviewKind,
              parent_review_id: item.parent_review_id ?? null,
              post_id: item.post_id ?? null,
              rating,
              body: String(item.body || "").trim(),
              photo_urls: normalizeFarmReviewPhotoUrls(
                item.photo_urls ?? item.photoUrls,
              ),
              status,
              created_at: item.created_at,
              reviewer_display_name: String(item.reviewer_display_name || "").trim(),
              reviewer_avatar_url:
                typeof item.reviewer_avatar_url === "string" &&
                item.reviewer_avatar_url.trim()
                  ? item.reviewer_avatar_url.trim()
                  : null,
            } satisfies BreederFarmReview;
          })
          .filter((item): item is BreederFarmReview => item != null)
      : [];

    const status = normalizeFarmReviewStatus(primary.status);
    if (!isFarmReviewApproved({ status })) continue;
    const rating = normalizeFarmReviewRating(primary.rating);
    if (!rating) continue;

    result.push({
      id,
      breeder_profile_id: String(primary.breeder_profile_id || "").trim(),
      reviewer_user_id: String(primary.reviewer_user_id || "").trim(),
      kind: (primary.kind || "primary") as FarmReviewKind,
      parent_review_id: primary.parent_review_id ?? null,
      post_id: primary.post_id ?? null,
      rating,
      body: String(primary.body || "").trim(),
      photo_urls: normalizeFarmReviewPhotoUrls(
        primary.photo_urls ?? primary.photoUrls,
      ),
      status,
      created_at: primary.created_at,
      reviewer_display_name: String(primary.reviewer_display_name || "").trim(),
      reviewer_avatar_url:
        typeof primary.reviewer_avatar_url === "string" &&
        primary.reviewer_avatar_url.trim()
          ? primary.reviewer_avatar_url.trim()
          : null,
      supplements,
    });
  }

  return result;
}

/** Visible review cards for the farm profile section (not pool-weighted count). */
export function farmReviewThreadDisplayCount(
  threads: BreederFarmReviewThread[],
): number {
  return threads.length;
}

/** Rating pool: direct bundle per user + sale rating counted twice. */
export function computeFarmReviewPool(
  reviews: Array<{ kind?: string; rating?: unknown; reviewer_user_id?: string; status?: unknown }>,
): { review_avg: number; review_count: number; pool: number[] } {
  const pool: number[] = [];
  const directByUser = new Map<string, number[]>();
  const rows = filterApprovedFarmReviews(reviews);

  for (const row of rows) {
    const kind = String(row.kind || "").trim().toLowerCase();
    const rating = normalizeFarmReviewRating(row.rating);
    if (!rating) continue;
    if (kind === "primary" || kind === "supplement") {
      const userId = String(row.reviewer_user_id || "").trim();
      if (!userId) continue;
      const list = directByUser.get(userId) ?? [];
      list.push(rating);
      directByUser.set(userId, list);
      continue;
    }
    if (kind === "sale") {
      pool.push(rating, rating);
    }
  }

  for (const ratings of directByUser.values()) {
    if (ratings.length === 0) continue;
    const sum = ratings.reduce((a, b) => a + b, 0);
    pool.push(sum / ratings.length);
  }

  if (pool.length === 0) {
    return { review_avg: 0, review_count: 0, pool: [] };
  }
  const sum = pool.reduce((a, b) => a + b, 0);
  return {
    review_avg: Math.round((sum / pool.length) * 100) / 100,
    review_count: pool.length,
    pool,
  };
}

export function farmSaleReviewHref(postId: string): string {
  const id = String(postId || "").trim();
  return `/app/pet-feed/posts/${encodeURIComponent(id)}?saleReview=1`;
}

export function parseSaleReviewQuery(
  value: string | null | undefined,
): boolean {
  const v = String(value || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export const FARM_REVIEW_SCROLL_QUERY = "reviews";
export const FARM_REVIEW_FOCUS_QUERY = "focusReview";

export function parseFarmReviewScrollQuery(
  value: string | null | undefined,
): boolean {
  return parseSaleReviewQuery(value);
}

export function parseFarmReviewFocusId(
  value: string | null | undefined,
): string | null {
  const id = String(value || "").trim();
  return id || null;
}

export function farmReviewedNotificationReviewId(item: {
  metadata?: { review_id?: string | null } | null;
}): string | null {
  const id =
    typeof item.metadata?.review_id === "string"
      ? item.metadata.review_id.trim()
      : "";
  return id || null;
}

/** Append scroll + optional focus params to a breeder profile href. */
export function withFarmReviewNotificationParams(
  href: string,
  focusReviewId?: string | null,
): string {
  const trimmed = String(href || "").trim();
  if (!trimmed) return trimmed;
  const [path, query = ""] = trimmed.split("?");
  const params = new URLSearchParams(query);
  params.set(FARM_REVIEW_SCROLL_QUERY, "1");
  const focus = String(focusReviewId || "").trim();
  if (focus) params.set(FARM_REVIEW_FOCUS_QUERY, focus);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Collapse long supplement threads on farm review cards. */
export const FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE = 1;
export const FARM_REVIEW_SUPPLEMENTS_TOGGLE_MIN = 2;

export function farmReviewSupplementsCollapsible(count: number): boolean {
  return count >= FARM_REVIEW_SUPPLEMENTS_TOGGLE_MIN;
}

export function farmReviewSupplementsToShow<T>(supplements: T[], expanded: boolean): T[] {
  if (!farmReviewSupplementsCollapsible(supplements.length) || expanded) return supplements;
  return supplements.slice(0, FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE);
}

export function farmReviewSupplementsHiddenCount(supplements: unknown[], expanded: boolean): number {
  if (!farmReviewSupplementsCollapsible(supplements.length) || expanded) return 0;
  return Math.max(0, supplements.length - FARM_REVIEW_SUPPLEMENTS_COLLAPSED_VISIBLE);
}
