/** Shared brand mark for header, footer, and tab favicon. */
export const BRAND_AVATAR_PATH = "/images/PetMarketAvatar.png";

/** User-facing product name. */
export const BRAND_NAME = "PetCare: Pet Marketplace";

/** Short mark for tight UI (watermarks, compact labels). */
export const BRAND_NAME_SHORT = "PetCare";

/** Split full brand for logo wordmark: orange lead + neutral rest. */
export function splitBrandName(name: string = BRAND_NAME): {
  lead: string;
  rest: string;
} {
  const short = BRAND_NAME_SHORT;
  if (name.startsWith(short)) {
    return { lead: short, rest: name.slice(short.length) };
  }
  return { lead: name, rest: "" };
}

/** Marketplace amber — primary CTAs, focus rings, message bubbles. */
export const BRAND_PRIMARY = "#D97706";
export const BRAND_PRIMARY_HOVER = "#B45309";

/** Tailwind-friendly class snippets for brand accents (Messages, CTAs). */
export const brandUi = {
  primaryBg: "bg-[#D97706]",
  primaryBgHover: "hover:bg-[#B45309]",
  primaryText: "text-[#D97706]",
  primarySoftBg: "bg-amber-50",
  primaryFocusRing: "focus:ring-[#D97706]/20",
  primaryDot: "bg-[#D97706]",
} as const;
