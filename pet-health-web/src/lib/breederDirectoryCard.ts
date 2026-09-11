/** Directory cards share a 2-column action row; pets strip only when there are thumbs. */

export const BREEDER_CARD_PETS_PREVIEW_CLASS = "mt-4";
export const BREEDER_CARD_ACTIONS_CLASS = "mt-auto pt-5 grid grid-cols-2 gap-2";
export const BREEDER_CARD_ACTION_BTN_CLASS = "inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold";

export type BreederCardSocialId = "facebook" | "zalo" | "instagram" | "twitter" | "tiktok";

const CARD_SOCIAL_ORDER: BreederCardSocialId[] = [
  "facebook",
  "zalo",
  "instagram",
  "twitter",
  "tiktok",
];

function httpUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  return /^https?:\/\//i.test(raw) ? raw : "";
}

function zaloHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 8 ? `https://zalo.me/${digits}` : null;
}

export function breederCardSocialLinks(contact?: {
  facebook?: string;
  zalo?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
} | null): { id: BreederCardSocialId; href: string | null }[] {
  const source = contact && typeof contact === "object" ? contact : {};
  const links: { id: BreederCardSocialId; href: string | null }[] = [];
  for (const id of CARD_SOCIAL_ORDER) {
    if (id === "zalo") {
      const raw = String(source.zalo || "").trim();
      if (!raw) continue;
      links.push({ id, href: zaloHref(raw) });
      continue;
    }
    const href = httpUrl(source[id]);
    if (href) links.push({ id, href });
  }
  return links;
}

export function breederCardHasPetPreview(thumbCount: number): boolean {
  return Number(thumbCount) > 0;
}

/** Compact rating for directory cards; null when the kennel has no reviews. */
export function breederCardRatingText(
  rating: number | null | undefined,
  reviewCount: number,
): string | null {
  if (rating == null || !(reviewCount > 0)) return null;
  return `${rating.toFixed(1)}/5 (${reviewCount})`;
}

export function breederCardPetsPreviewTitleKey(
  thumbCount: number,
): "breeders.card.petsPreviewCount" | "breeders.card.petsPreviewEmpty" {
  return breederCardHasPetPreview(thumbCount)
    ? "breeders.card.petsPreviewCount"
    : "breeders.card.petsPreviewEmpty";
}

/** Visit stays half-width in column 2 so owner/visitor cards share one footer. */
export function breederCardVisitCtaClass(): "w-full" {
  return "w-full";
}
