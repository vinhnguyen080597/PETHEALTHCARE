import { LISTING_PHOTO_MAX_BYTES } from "../listingFormOptions";
import { newsPostDetailHref } from "../newsDetail";
import {
  ANNOUNCEMENT_CATEGORIES,
  type AnnouncementCategory,
} from "../siteNav";
import { isSafeHttpUrl } from "./requestQueue";

export const NEWS_MAX_PHOTOS = 6;
export const NEWS_PHOTO_MAX_BYTES = LISTING_PHOTO_MAX_BYTES;
export const NEWS_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const NEWS_TITLE_MAX = 120;
export const NEWS_BODY_MAX = 2000;
export const NEWS_CTA_LABEL_MAX = 80;
export const NEWS_CTA_URL_MAX = 500;

export const NEWS_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export type NewsPublishInput = {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  photos?: Array<{ type?: string; name?: string; size?: number }>;
};

export type NewsPublishErrorKey =
  | "admin.news.errorTitle"
  | "admin.news.errorTitleMax"
  | "admin.news.errorBody"
  | "admin.news.errorBodyMax"
  | "admin.news.errorCta"
  | "admin.news.errorCtaUrl"
  | "admin.news.errorTooManyPhotos"
  | "admin.news.errorPhotoType"
  | "admin.news.errorPhotoSize";

export type AdminAnnouncementRow = {
  id?: string;
  title?: string;
  status?: string;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
};

const NEWS_PHOTO_NAME = /\.(jpe?g|png|webp)$/i;

/** Accept bare domains as https links for optional CTA. */
export function normalizeNewsCtaUrl(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/\//.test(raw)) return `https:${raw}`;
  // example.com/path or www.example.com — not javascript:/data:
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$/i.test(raw)) {
    return `https://${raw}`;
  }
  return raw;
}

export function isNewsPhotoFile(file: {
  type?: string;
  name?: string;
}): boolean {
  const type = String(file.type || "").toLowerCase();
  if ((NEWS_PHOTO_TYPES as readonly string[]).includes(type)) return true;
  return NEWS_PHOTO_NAME.test(String(file.name || ""));
}

export function newsPublishError(
  input: NewsPublishInput,
): NewsPublishErrorKey | null {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const ctaLabel = String(input.ctaLabel || "").trim();
  const ctaUrl = normalizeNewsCtaUrl(input.ctaUrl);
  const photos = Array.isArray(input.photos) ? input.photos : [];

  if (!title) return "admin.news.errorTitle";
  if (title.length > NEWS_TITLE_MAX) return "admin.news.errorTitleMax";
  if (!body) return "admin.news.errorBody";
  if (body.length > NEWS_BODY_MAX) return "admin.news.errorBodyMax";
  if (ctaLabel.length > NEWS_CTA_LABEL_MAX) return "admin.news.errorCta";
  if (ctaUrl.length > NEWS_CTA_URL_MAX) return "admin.news.errorCtaUrl";
  if (Boolean(ctaLabel) !== Boolean(ctaUrl)) return "admin.news.errorCta";
  if (ctaUrl && !isSafeHttpUrl(ctaUrl)) return "admin.news.errorCtaUrl";
  if (photos.length > NEWS_MAX_PHOTOS) return "admin.news.errorTooManyPhotos";
  for (const photo of photos) {
    if (!isNewsPhotoFile(photo)) return "admin.news.errorPhotoType";
    if (typeof photo.size === "number" && photo.size > NEWS_PHOTO_MAX_BYTES) {
      return "admin.news.errorPhotoSize";
    }
  }
  return null;
}

export function canSubmitNews(input: NewsPublishInput): boolean {
  return newsPublishError(input) === null;
}

export function announcementPublicHref(postId: string): string {
  return newsPostDetailHref(postId);
}

export function announcementRowId(row: AdminAnnouncementRow): string {
  return String(row.id || "").trim();
}

export function announcementCategoryOf(
  row: AdminAnnouncementRow,
): AnnouncementCategory {
  const raw = row.metadata?.category ?? row.metadata?.announcement_category;
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  return (ANNOUNCEMENT_CATEGORIES as readonly string[]).includes(value)
    ? (value as AnnouncementCategory)
    : "general";
}

export function announcementStatusLabelKey(
  status: string | null | undefined,
): "listing.status.published" | "listing.status.archived" | "listing.status.draft" {
  const value = String(status || "").trim().toLowerCase();
  if (value === "archived") return "listing.status.archived";
  if (value === "draft") return "listing.status.draft";
  return "listing.status.published";
}

export function isPublishedAnnouncement(
  row: AdminAnnouncementRow,
): boolean {
  const status = String(row.status || "").trim().toLowerCase();
  return !status || status === "published";
}

export type AdminNewsLivePreviewInput = {
  title: string;
  body: string;
  category: AnnouncementCategory;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Object URLs or remote URLs for selected photos (already validated). */
  photoUrls?: string[];
  authorLabel?: string;
  createdAt?: string;
};

export type AdminNewsLivePreviewModel = {
  title: string;
  body: string;
  category: AnnouncementCategory;
  ctaLabel: string;
  ctaUrl: string;
  photoUrls: string[];
  coverUrl: string | null;
  authorLabel: string;
  createdAt: string;
  hasTitle: boolean;
  hasBody: boolean;
};

/** Pure model for the Tin tức-style live preview beside the publish form. */
export function buildAdminNewsLivePreview(
  input: AdminNewsLivePreviewInput,
): AdminNewsLivePreviewModel {
  const title = String(input.title || "").trim();
  const body = String(input.body || "").trim();
  const ctaLabel = String(input.ctaLabel || "").trim();
  const ctaUrl = normalizeNewsCtaUrl(input.ctaUrl);
  const photoUrls = (input.photoUrls || [])
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .slice(0, NEWS_MAX_PHOTOS);
  const safeCta =
    ctaLabel && ctaUrl && isSafeHttpUrl(ctaUrl)
      ? { ctaLabel, ctaUrl }
      : { ctaLabel: "", ctaUrl: "" };
  return {
    title,
    body,
    category: input.category,
    ...safeCta,
    photoUrls,
    coverUrl: photoUrls[0] || null,
    authorLabel: String(input.authorLabel || "").trim() || "PetCare: Pet Marketplace",
    createdAt: input.createdAt || new Date().toISOString(),
    hasTitle: Boolean(title),
    hasBody: Boolean(body),
  };
}
